import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Save, ArrowLeft, Plus, X, Upload, Camera } from 'lucide-react';
import { api } from '../lib/supabase';
import { toast } from 'sonner';
import { ClienteSelector } from '../components/clientes/ClienteSelector';
import { ClienteModal } from '../components/clientes/ClienteModal';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { ZoomableImage } from '../components/ui/zoomable-image';

interface NuevaOrdenFormData {
  clienteNombre: string;
  numeroGuia: string;
  servicioSolicitado: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido?: string;
  cliente_tipo: 'natural' | 'empresa';
  ruc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

interface Componente {
  id: string;
  nombre: string;
}

interface FotografiaArribo {
  id: string;
  nombre: string;
  base64Data: string;
  componenteRefId?: string;
}

export function NuevaOrden() {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit } = useForm<NuevaOrdenFormData>();
  const [componentes, setComponentes] = useState<Componente[]>([{ id: '1', nombre: '' }]);
  const [fotografias, setFotografias] = useState<FotografiaArribo[]>([]);
  const [nuevoComponente, setNuevoComponente] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);

  const agregarComponente = () => {
    if (nuevoComponente.trim()) {
      setComponentes([...componentes, { id: Date.now().toString(), nombre: nuevoComponente }]);
      setNuevoComponente('');
    }
  };

  const eliminarComponente = (id: string) => {
    setComponentes(componentes.filter(c => c.id !== id));
  };

  const actualizarComponente = (id: string, nombre: string) => {
    setComponentes(componentes.map(c => c.id === id ? { ...c, nombre } : c));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const nuevaFoto: FotografiaArribo = {
          id: Date.now().toString() + i,
          nombre: file.name,
          base64Data: base64,
        };
        setFotografias(prev => [...prev, nuevaFoto]);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const eliminarFotografia = (id: string) => {
    setFotografias(fotografias.filter(f => f.id !== id));
  };

  const handleSaveCliente = async (clienteData: Omit<Cliente, 'id'>) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-89c63dd1/clientes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clienteData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar cliente');
      }

      const data = await response.json();
      toast.success('Cliente guardado exitosamente');
      setSelectedClienteId(data.cliente.id);
      setSelectedCliente(data.cliente);
      return data.cliente;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const onSubmit = async (data: NuevaOrdenFormData) => {
    try {
      setIsSubmitting(true);

      // Validar que haya al menos un componente con nombre
      const componentesValidos = componentes.filter(c => c.nombre.trim());
      if (componentesValidos.length === 0) {
        toast.error('Debe ingresar al menos un componente');
        setIsSubmitting(false);
        return;
      }

      console.log('Creating orden(es) with data:', data);

      // Determinar si hay múltiples componentes
      const esMultiple = componentesValidos.length > 1;

      // Datos comunes para todas las órdenes
      const datosComunes = {
        clienteId: selectedClienteId,
        clienteNombre: selectedCliente ?
          (selectedCliente.cliente_tipo === 'empresa' ?
            selectedCliente.nombre :
            `${selectedCliente.nombre} ${selectedCliente.apellido || ''}`.trim()
          ) : data.clienteNombre || '',
        clienteRuc: selectedCliente?.ruc || '',
        clienteEmail: selectedCliente?.email || '',
        clienteTelefono: selectedCliente?.telefono || '',
        numeroGuia: data.numeroGuia || '',
        servicioSolicitado: data.servicioSolicitado || '',
        dpObra: '',
        clienteNumero: '',
        compraAlta: '',
        edoObra: '',
        exObra: '',
        requiereFotografia: fotografias.length > 0,
        tareasRealizar: [],
        zonasTrabajar: [],
        fotografiasPiezas: [],
        inspeccionFinalResponsables: [],
      };

      if (esMultiple) {
        // Crear múltiples órdenes, una por cada componente
        console.log(`Creating ${componentesValidos.length} separate orders for multiple components`);

        // Obtener el número correlativo una sola vez para todas las órdenes
        const responseCorrelativo = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-89c63dd1/ordenes/next-correlative`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!responseCorrelativo.ok) {
          throw new Error('Error al obtener número correlativo');
        }

        const { nextCorrelativo } = await responseCorrelativo.json();
        console.log(`Using correlative number ${nextCorrelativo} for all orders`);

        const ordenesCreadas = [];
        for (let i = 0; i < componentesValidos.length; i++) {
          const fotosFiltradas = fotografias.filter(f => 
            !f.componenteRefId || 
            !componentesValidos.some(c => c.id === f.componenteRefId) || 
            f.componenteRefId === componentesValidos[i].id
          );
          const ordenData = {
            ...datosComunes,
            fotografiasIncluyeOT: fotosFiltradas,
            nombreComponente: componentesValidos[i].nombre,
            esOrdenMultiple: true,
            ordenMultipleIndice: i,
            ordenMultipleTotal: componentesValidos.length,
            numeroCorrelativoEspecifico: nextCorrelativo, // Usar el mismo número correlativo para todas
          };

          console.log(`Creating orden ${i + 1}/${componentesValidos.length}:`, ordenData.nombreComponente);

          const response = await api.createOrden(ordenData);

          if (response.error) {
            console.error(`Error creating orden ${i + 1}:`, response.error);
            throw new Error(response.error);
          } else if (response.orden) {
            ordenesCreadas.push(response.orden);
          }
        }

        if (ordenesCreadas.length === componentesValidos.length) {
          const numerosOT = ordenesCreadas.map(o => o.numeroOT).join(', ');
          toast.success(`${ordenesCreadas.length} órdenes creadas exitosamente: ${numerosOT}`);
          setTimeout(() => {
            navigate('/');
          }, 500);
        } else {
          toast.error('Error: No se crearon todas las órdenes');
          setIsSubmitting(false);
        }
      } else {
        // Crear una sola orden
        const ordenData = {
          ...datosComunes,
          fotografiasIncluyeOT: fotografias,
          nombreComponente: componentesValidos[0].nombre,
          esOrdenMultiple: false,
        };

        console.log('Creating single orden:', ordenData);

        const response = await api.createOrden(ordenData);

        console.log('Response:', response);

        if (response.error) {
          console.error('Server error:', response.error);
          toast.error(`Error al crear la orden: ${response.error}`);
          setIsSubmitting(false);
        } else if (response.orden) {
          toast.success(`Orden ${response.orden.numeroOT} creada exitosamente`);
          setTimeout(() => {
            navigate('/');
          }, 500);
        } else {
          toast.error('Error inesperado al crear la orden');
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error('Error creating orden:', error);
      toast.error(`Error al crear la orden: ${error}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="px-2 sm:px-4">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold sm:font-normal">Nueva Orden de Trabajo</h1>
              <p className="text-xs sm:text-base text-gray-600">Ingreso de datos del servicio</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nueva Orden de Trabajo</CardTitle>
              <CardDescription>Complete los datos básicos del servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de Cliente */}
              <ClienteSelector
                value={selectedClienteId}
                onChange={(clienteId, clienteData) => {
                  setSelectedClienteId(clienteId);
                  setSelectedCliente(clienteData || null);
                }}
                onAddNew={() => setShowClienteModal(true)}
                required
              />

              <div>
                <Label htmlFor="numeroGuia">Número de Guía</Label>
                <Input
                  id="numeroGuia"
                  placeholder="Ej: 50/12/2025"
                  {...register('numeroGuia')}
                />
              </div>

              <div>
                <Label htmlFor="servicioSolicitado">Servicio Solicitado</Label>
                <Textarea
                  id="servicioSolicitado"
                  placeholder="Describa el servicio a realizar"
                  rows={4}
                  {...register('servicioSolicitado')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Componentes *</CardTitle>
              <CardDescription>Agregue uno o más componentes involucrados en el servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de componentes */}
              {componentes.length > 0 && (
                <div className="space-y-2">
                  {componentes.map((c, index) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder={`Componente ${index + 1}`}
                          value={c.nombre}
                          onChange={(e) => actualizarComponente(c.id, e.target.value)}
                        />
                      </div>
                      {componentes.length > 1 && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => eliminarComponente(c.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Botón para agregar más componentes */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setComponentes([...componentes, { id: Date.now().toString(), nombre: '' }])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar otro componente
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Fotografías de Arribo</CardTitle>
              <CardDescription>Cargue las fotografías de los componentes al arribar (opcional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <span className="text-sm text-gray-600 mb-2 block font-medium">Subir desde galería</span>
                  <Input
                    id="fotografiaArribo"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                </div>
                
                <div className="flex-1">
                  <span className="text-sm text-gray-600 mb-2 block font-medium">Tomar foto (solo móviles)</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full relative overflow-hidden" 
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Abrir Cámara
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Puede subir múltiples imágenes de la galería o tomar fotos con la cámara de su dispositivo.
              </p>
              
              {fotografias.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {fotografias.map((f, index) => (
                    <div key={f.id} className="relative group flex flex-col gap-2 bg-gray-50 p-2 rounded-lg border">
                      <div className="relative">
                        <ZoomableImage 
                          src={f.base64Data} 
                          alt={f.nombre} 
                          className="w-full aspect-square object-cover rounded-md border bg-white block"
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => eliminarFotografia(f.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 truncate px-1" title={f.nombre}>{f.nombre}</p>
                      {componentes.filter(c => c.nombre.trim()).length > 0 && (
                        <select
                          className="text-xs w-full p-1.5 border rounded cursor-pointer bg-white"
                          value={f.componenteRefId || ''}
                          onChange={(e) => {
                            const nuevasList = [...fotografias];
                            nuevasList[index].componenteRefId = e.target.value;
                            setFotografias(nuevasList);
                          }}
                        >
                          <option value="">-- A todos los comp. --</option>
                          {componentes.filter(c => c.nombre.trim()).map(c => (
                            <option key={c.id} value={c.id}>Solo: {c.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {fotografias.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No se han cargado fotografías</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Crear Orden de Trabajo
            </Button>
          </div>
        </form>
      </div>

      {/* Modal para agregar/editar clientes */}
      <ClienteModal
        isOpen={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSave={handleSaveCliente}
        cliente={null}
        mode="create"
      />
    </div>
  );
}