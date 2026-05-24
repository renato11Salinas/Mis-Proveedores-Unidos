import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Camera, CheckCircle, FileText, Download, Undo2, Upload, AlertCircle, X, Trash2, Ban } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../components/ui/alert-dialog';
import { workflowSteps } from '../data/mockData';
import { WorkflowProgress } from '../components/workflow/WorkflowProgress';
import { ConfirmarAvanceDialog } from '../components/workflow/ConfirmarAvanceDialog';
import { RetrocederEtapaDialog } from '../components/workflow/RetrocederEtapaDialog';
import { RevisionCalidadPhotoUpload } from '../components/workflow/RevisionCalidadPhotoUpload';
import { PhotoUploader } from '../components/ui/photo-uploader';
import { ZoomableImage } from '../components/ui/zoomable-image';
import { api } from '../lib/supabase';
import { toast } from 'sonner';
import { generateOrdenPDF } from '../lib/pdfGenerator';

export function OrdenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRetrocederDialog, setShowRetrocederDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('arribo');
  const [isEditingZonas, setIsEditingZonas] = useState(false);
  const [editedZonas, setEditedZonas] = useState('');
  const [isEditingTareas, setIsEditingTareas] = useState(false);
  const [editedTareas, setEditedTareas] = useState('');
  const [completedTareas, setCompletedTareas] = useState<Record<number, boolean>>({});
  const [isEditingArribo, setIsEditingArribo] = useState(false);
  const [editedArribo, setEditedArribo] = useState({
    numeroGuia: '',
    nombreComponente: '',
    clienteNombre: '',
    clienteNumero: '',
    dpObra: '',
    edoObra: '',
    servicioSolicitado: '',
  });
  const [editingRevisionFotoIndex, setEditingRevisionFotoIndex] = useState<number | null>(null);
  const [editingRevisionFotoDesc, setEditingRevisionFotoDesc] = useState<string>('');
  const [editingRevisionFotoNombre, setEditingRevisionFotoNombre] = useState<string>('');
  const [editingLimpiezaFotoIndex, setEditingLimpiezaFotoIndex] = useState<number | null>(null);
  const [editingLimpiezaFotoDesc, setEditingLimpiezaFotoDesc] = useState<string>('');
  const [editingLimpiezaFotoNombre, setEditingLimpiezaFotoNombre] = useState<string>('');

  const [showAnularDialog, setShowAnularDialog] = useState(false);

  const handleAnularOT = async () => {
    try {
      const response = await api.updateOrden(id!, { anulado: true, estado: 'anulado' });
      if (response.orden) {
        setOrden(response.orden);
        toast.success('Orden anulada exitosamente');
        setShowAnularDialog(false);
      } else {
        toast.error('Error al anular la orden');
      }
    } catch (error) {
      toast.error('Error al anular la orden');
      console.error('Error anulando OT:', error);
    }
  };

  useEffect(() => {
    if (id) {
      loadOrden();
    }
  }, [id]);

  useEffect(() => {
    // Cambiar automáticamente a la pestaña del paso actual
    if (orden?.estado) {
      setActiveTab(orden.estado === 'ingreso-datos' ? 'arribo' : orden.estado);
    }
  }, [orden?.estado]);

  // Initialize completed tasks from backend data (if available)
  useEffect(() => {
    if (orden?.tareasCompletadas) {
      setCompletedTareas(orden.tareasCompletadas);
    }
  }, [orden?.tareasCompletadas]);

  const loadOrden = async () => {
    try {
      const response = await api.getOrden(id!);
      if (response.orden) {
        setOrden(response.orden);
      } else {
        toast.error('Orden no encontrada');
        navigate('/');
      }
    } catch (error) {
      toast.error('Error al cargar la orden');
      console.error('Error loading orden:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !orden) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const estadoEfectivo = orden.estado === 'ingreso-datos' ? 'arribo' : orden.estado;
  const currentStepInfo = workflowSteps.find(s => s.id === estadoEfectivo);
  const currentIndex = workflowSteps.findIndex(s => s.id === estadoEfectivo);
  const nextStepInfo = currentIndex < workflowSteps.length - 1 ? workflowSteps[currentIndex + 1] : null;
  const previousStepInfo = currentIndex > 0 ? workflowSteps[currentIndex - 1] : null;

  // Validación: verificar si existe el documento "Orden de servicio" para avanzar desde "Liberación de OT"
  const canAdvanceToLiberacionOT = () => {
    // Solo validar el documento cuando estamos EN "liberacion-ot" intentando avanzar
    if (orden.estado === 'liberacion-ot') {
      return !!orden.ordenServicio;
    }
    return true;
  };

  const handleAvanzarEtapa = async (dni: string) => {
    if (!nextStepInfo) return;

    // Validar si se puede avanzar
    if (!canAdvanceToLiberacionOT()) {
      toast.error('Debe subir el documento "Orden de servicio" antes de avanzar desde Liberación de OT');
      setShowConfirmDialog(false);
      return;
    }
    
    try {
      const response = await api.avanzarEtapa(id!, nextStepInfo.id, dni);
      if (response.orden) {
        toast.success(`Orden avanzada a: ${nextStepInfo.name}`);
        setShowConfirmDialog(false);
        // Reload the orden to get complete data
        await loadOrden();
      } else if (response.error) {
        toast.error(`Error: ${response.error}`);
        console.error('Error response from server:', response);
      } else {
        toast.error('Error al avanzar la etapa');
      }
    } catch (error) {
      toast.error('Error al avanzar la etapa');
      console.error('Error advancing stage:', error);
    }
  };

  const handleRetrocederEtapa = async (dni: string, motivo: string) => {
    if (!previousStepInfo) return;
    
    try {
      const response = await api.retrocederEtapa(id!, previousStepInfo.id, dni, motivo);
      if (response.orden) {
        setOrden(response.orden);
        toast.success(`Orden retrocedida a: ${previousStepInfo.name}`);
        setShowRetrocederDialog(false);
      } else {
        toast.error('Error al retroceder la etapa');
      }
    } catch (error) {
      toast.error('Error al retroceder la etapa');
      console.error('Error retreating stage:', error);
    }
  };

  const handleUploadImage = async (tipo: 'ot' | 'pieza' | 'limpiezaEmbalaje' | 'revisionCalidad', files: FileList | null, descripcion?: string) => {
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        try {
          const response = await api.uploadImagen(id!, tipo, base64, file.name, descripcion);
          if (response.orden || response.imagen) {
            // Reload the orden to get complete data with URLs
            await loadOrden();
            toast.success(`Imagen "${file.name}" cargada exitosamente`);
          } else if (response.error) {
            toast.error(`Error: ${response.error}`);
            console.error('Error response from server:', response);
          } else {
            toast.error(`Error al cargar ${file.name}`);
          }
        } catch (error) {
          toast.error(`Error al cargar ${file.name}`);
          console.error('Error uploading image:', error);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocumento = async (tipo: 'ordenServicio' | 'guiaSalida' | 'informeComercial' | 'fichaComponente', file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const response = await api.uploadDocumento(id!, tipo, base64, file.name, file.type);
        if (response.documento) {
          toast.success(`Documento "${file.name}" cargado exitosamente`);
          // Reload the orden to get complete data with base64
          await loadOrden();
        } else {
          toast.error('Error al cargar el documento');
        }
      } catch (error) {
        toast.error(`Error al cargar ${file.name}`);
        console.error('Error uploading document:', error);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'ordenServicio' | 'guiaSalida' | 'informeComercial' | 'fichaComponente') => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadDocumento(tipo, file);
    }
  };



  const handleSaveZonas = async () => {
    try {
      // Split by comma and trim whitespace, filter out empty strings
      const zonasArray = editedZonas
        .split(',')
        .map(z => z.trim())
        .filter(z => z.length > 0);

      const response = await api.updateOrden(id!, { zonasTrabajar: zonasArray });
      if (response.orden) {
        setOrden(response.orden);
        toast.success('Zonas actualizadas exitosamente');
        setIsEditingZonas(false);
      } else {
        toast.error('Error al actualizar las zonas');
      }
    } catch (error) {
      toast.error('Error al actualizar las zonas');
      console.error('Error updating zonas:', error);
    }
  };

  const handleToggleTarea = async (index: number) => {
    const newCompletedTareas = {
      ...completedTareas,
      [index]: !completedTareas[index]
    };

    setCompletedTareas(newCompletedTareas);

    // Persist to backend
    try {
      await api.updateOrden(id!, { tareasCompletadas: newCompletedTareas });
    } catch (error) {
      console.error('Error updating task completion:', error);
      toast.error('Error al actualizar el estado de la tarea');
      // Revert on error
      setCompletedTareas(completedTareas);
    }
  };

  const handleSaveTareas = async () => {
    try {
      // Split by newlines and filter out empty lines
      const tareasArray = editedTareas
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await api.updateOrden(id!, {
        tareasRealizar: tareasArray,
        tareasCompletadas: {} // Reset completion status when tasks are edited
      });

      if (response.orden) {
        setOrden(response.orden);
        setIsEditingTareas(false);
        setCompletedTareas({}); // Reset local state too
        toast.success('Tareas actualizadas correctamente');
      } else {
        toast.error('Error al actualizar las tareas');
      }
    } catch (error) {
      toast.error('Error al actualizar las tareas');
      console.error('Error updating tareas:', error);
    }
  };

  const handleSaveArribo = async () => {
    try {
      const response = await api.updateOrden(id!, {
        numeroGuia: editedArribo.numeroGuia,
        nombreComponente: editedArribo.nombreComponente,
        clienteNombre: editedArribo.clienteNombre,
        clienteNumero: editedArribo.clienteNumero,
        dpObra: editedArribo.dpObra,
        edoObra: editedArribo.edoObra,
        servicioSolicitado: editedArribo.servicioSolicitado,
      });
      if (response.orden) {
        setOrden(response.orden);
        toast.success('Datos actualizados exitosamente');
        setIsEditingArribo(false);
      } else {
        toast.error('Error al actualizar los datos');
      }
    } catch (error) {
      toast.error('Error al actualizar los datos');
      console.error('Error updating arribo:', error);
    }
  };

  const handleSaveRevisionFotoDesc = async (index: number) => {
    try {
      if (!orden.fotografiasRevisionCalidad) return;
      const updatedFotos = [...orden.fotografiasRevisionCalidad];
      updatedFotos[index] = {
        ...updatedFotos[index],
        nombre: editingRevisionFotoNombre || updatedFotos[index].nombre,
        descripcion: editingRevisionFotoDesc
      };

      const response = await api.updateOrden(id!, {
        fotografiasRevisionCalidad: updatedFotos
      });

      if (response.orden) {
        setOrden(response.orden);
        toast.success('Descripción actualizada correctamente');
        setEditingRevisionFotoIndex(null);
      } else {
        toast.error('Error al actualizar la descripción');
      }
    } catch (error) {
      toast.error('Error al actualizar la descripción');
      console.error(error);
    }
  };

  const handleSaveLimpiezaFotoDesc = async (index: number) => {
    try {
      if (!orden.fotografiasLimpiezaEmbalaje) return;
      const updatedFotos = [...orden.fotografiasLimpiezaEmbalaje];
      updatedFotos[index] = {
        ...updatedFotos[index],
        nombre: editingLimpiezaFotoNombre || updatedFotos[index].nombre,
        descripcion: editingLimpiezaFotoDesc
      };

      const response = await api.updateOrden(id!, {
        fotografiasLimpiezaEmbalaje: updatedFotos
      });

      if (response.orden) {
        setOrden(response.orden);
        toast.success('Descripción actualizada correctamente');
        setEditingLimpiezaFotoIndex(null);
      } else {
        toast.error('Error al actualizar la descripción');
      }
    } catch (error) {
      toast.error('Error al actualizar la descripción');
      console.error(error);
    }
  };

  const handleUpdateEstadoOT = async (nuevoEstado: 'Pendiente' | 'Liberado') => {
    try {
      const estadoOT = {
        estado: nuevoEstado,
        fecha: new Date().toISOString(),
      };

      const response = await api.updateOrden(id!, { estadoAperturaOT: estadoOT });
      if (response.orden) {
        setOrden(response.orden);
        toast.success(`Estado actualizado a: ${nuevoEstado}`);
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      toast.error('Error al actualizar el estado');
      console.error('Error updating estado OT:', error);
    }
  };

  const handleDownloadDocument = async (documentType: 'ordenServicio' | 'guiaSalida' | 'informeComercial' | 'fichaComponente') => {
    try {
      // Primero obtenemos la orden completa con los datos base64
      const response = await api.getOrden(id!);
      if (!response.orden) {
        toast.error('Error al obtener el documento');
        return;
      }

      const documento = response.orden[documentType];
      if (!documento || (!documento.base64Data && !documento.url)) {
        toast.error('El documento no está disponible');
        return;
      }

      if (documento.url) {
        // Nueva forma: navegar a la URL firmada
        window.open(documento.url, '_blank');
      } else if (documento.base64Data) {
        // Forma antigua (legacy): decodificar base64
        const base64Data = documento.base64Data.split(',')[1] || documento.base64Data;
        const mimeType = documento.mimeType || 'application/pdf';
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = documento.nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast.success(`Documento "${documento.nombre}" abierto correctamente`);
    } catch (error) {
      toast.error('Error al descargar el documento');
      console.error('Error downloading document:', error);
    }
  };

  const handleDeleteDocumento = async (documentType: 'ordenServicio' | 'guiaSalida' | 'informeComercial' | 'fichaComponente') => {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) return;
    try {
      const response = await api.updateOrden(id!, { [documentType]: null });
      if (response.orden) {
        setOrden(response.orden);
        toast.success('Documento eliminado exitosamente');
      } else {
        toast.error('Error al eliminar el documento');
      }
    } catch (error) {
      toast.error('Error al eliminar el documento');
      console.error('Error deleting document:', error);
    }
  };

  const handleDeleteFoto = async (
    tipoArray: 'fotografiasIncluyeOT' | 'fotografiasPiezas' | 'fotografiasRevisionCalidad' | 'fotografiasLimpiezaEmbalaje',
    index: number
  ) => {
    if (!confirm('¿Está seguro de que desea eliminar esta fotografía?')) return;
    try {
      const updatedFotos = [...(orden[tipoArray] || [])];
      updatedFotos.splice(index, 1);
      
      const response = await api.updateOrden(id!, { [tipoArray]: updatedFotos });
      if (response.orden) {
        setOrden(response.orden);
        toast.success('Fotografía eliminada exitosamente');
      } else {
        toast.error('Error al eliminar la fotografía');
      }
    } catch (error) {
      toast.error('Error al eliminar la fotografía');
      console.error('Error deleting photo:', error);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      toast.info('Generando informe PDF (esto puede tomar unos segundos)...');
      console.log('Iniciando generación de PDF con datos:', orden);
      await generateOrdenPDF(orden);
      toast.success('Informe PDF generado y descargado exitosamente');
    } catch (error) {
      toast.error('Error al generar el informe PDF');
      console.error('Error generating PDF:', error);
    }
  };

  const isAnulada = !!orden.anulado || orden.estado === 'anulado';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:py-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="px-2 sm:px-4">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold sm:font-normal">{orden.numeroOT}</h1>
                {isAnulada && (
                  <Badge variant="destructive" className="bg-gray-600 hover:bg-gray-700">ANULADO</Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 line-clamp-2">{orden.nombreComponente}</p>
            </div>
            <Badge className="bg-blue-600 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
              {currentStepInfo?.icon} {currentStepInfo?.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Workflow Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Progreso del Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowProgress currentStep={orden.estado} />
            

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
              {!isAnulada && orden.estado !== 'completado' && (
                <Button onClick={() => setShowAnularDialog(true)} size="lg" variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-100 w-full sm:w-auto">
                  <Ban className="w-4 h-4 mr-2" />
                  Anular OT
                </Button>
              )}
              {previousStepInfo && orden.estado !== 'arribo' && !isAnulada && (
                <Button onClick={() => setShowRetrocederDialog(true)} size="lg" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto">
                  <Undo2 className="w-4 h-4 mr-2" />
                  Retroceder Etapa
                </Button>
              )}
              {nextStepInfo && orden.estado !== 'completado' && !isAnulada && (
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  size="lg"
                  disabled={!canAdvanceToLiberacionOT()}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Avanzar a Siguiente Etapa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs por cada paso del workflow */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-1 h-auto w-full">
            {workflowSteps.map((step, index) => (
              <TabsTrigger
                key={step.id}
                value={step.id}
                disabled={index > currentIndex}
                className="flex flex-col items-center gap-1 py-2 text-xs min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">{step.icon}</span>
                <span className="text-[10px] leading-tight text-center">{step.name}</span>
                {index > currentIndex && <span className="text-[8px]">🔒</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Arribo de Componente */}
          <TabsContent value="arribo">
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>📦 Ingreso de componente y datos</CardTitle>
                    <CardDescription>Recepción del componente en el taller</CardDescription>
                  </div>
                  {!isEditingArribo && currentIndex >= 0 && !isAnulada && (
                    <Button
                      onClick={() => {
                        setEditedArribo({
                          numeroGuia: orden.numeroGuia || '',
                          nombreComponente: orden.nombreComponente || '',
                          clienteNombre: orden.clienteNombre || '',
                          clienteNumero: orden.clienteNumero || '',
                          dpObra: orden.dpObra || '',
                          edoObra: orden.edoObra || '',
                          servicioSolicitado: orden.servicioSolicitado || '',
                        });
                        setIsEditingArribo(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      ✏️ Editar
                    </Button>
                  )}
                  {currentIndex < 0 && (
                    <Badge variant="secondary" className="text-xs">
                      🔒 Bloqueado hasta apertura
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditingArribo ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit-clienteNombre">Cliente</Label>
                        <Input id="edit-clienteNombre" value={editedArribo.clienteNombre} onChange={(e) => setEditedArribo({ ...editedArribo, clienteNombre: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="edit-nombreComponente">Componente</Label>
                        <Input id="edit-nombreComponente" value={editedArribo.nombreComponente} onChange={(e) => setEditedArribo({ ...editedArribo, nombreComponente: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Fecha de Arribo</label>
                        <p className="font-semibold">{orden.fechaCreacion}</p>
                      </div>
                      <div>
                        <Label htmlFor="edit-dpObra">Cod. Trabajo Cliente</Label>
                        <Input id="edit-dpObra" value={editedArribo.dpObra} onChange={(e) => setEditedArribo({ ...editedArribo, dpObra: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Número de OT</label>
                        <p className="font-semibold">{orden.numeroOT}</p>
                      </div>
                      <div>
                        <Label htmlFor="edit-clienteNumero">Número de Cliente</Label>
                        <Input id="edit-clienteNumero" value={editedArribo.clienteNumero} onChange={(e) => setEditedArribo({ ...editedArribo, clienteNumero: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <Label htmlFor="edit-servicioSolicitado">Servicio Solicitado</Label>
                        <Input id="edit-servicioSolicitado" value={editedArribo.servicioSolicitado} onChange={(e) => setEditedArribo({ ...editedArribo, servicioSolicitado: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="edit-numeroGuia">Número de Guía</Label>
                        <Input id="edit-numeroGuia" value={editedArribo.numeroGuia} onChange={(e) => setEditedArribo({ ...editedArribo, numeroGuia: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="edit-edoObra">Estado de Ingreso</Label>
                        <Input id="edit-edoObra" value={editedArribo.edoObra} onChange={(e) => setEditedArribo({ ...editedArribo, edoObra: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        onClick={() => setIsEditingArribo(false)}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveArribo}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        💾 Guardar Cambios
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Cliente</label>
                      <p className="font-semibold break-words">{orden.clienteNombre || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Componente</label>
                      <p className="font-semibold break-words">{orden.nombreComponente}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Fecha de Arribo</label>
                      <p className="font-semibold">{orden.fechaCreacion}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Cod. Trabajo Cliente</label>
                      <p className="font-semibold">{orden.dpObra || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Número de OT MPU</label>
                      <p className="font-semibold">{orden.numeroOT}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Número de Cliente</label>
                      <p className="font-semibold">{orden.clienteNumero || '-'}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="text-sm text-gray-600">Servicio Solicitado</label>
                      <p className="font-semibold uppercase">{orden.servicioSolicitado || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Número de Guía</label>
                      <p className="font-semibold">{orden.numeroGuia || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Estado de Ingreso</label>
                      <p className="font-semibold uppercase">{orden.edoObra || '-'}</p>
                    </div>
                  </div>
                )}

                {/* Fotografías de arribo */}
                <div>
                  <h4 className="font-semibold mb-3">Fotografías de Arribo</h4>
                  {orden.fotografiasIncluyeOT && orden.fotografiasIncluyeOT.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {orden.fotografiasIncluyeOT.map((foto, index) => (
                          <div key={foto.id || index} className="group relative">
                            <ZoomableImage 
                              src={foto.url || foto.base64Data} 
                              alt={foto.nombre || `Foto ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border block"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <p className="truncate">{foto.nombre || `Foto ${index + 1}`}</p>
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFoto('fotografiasIncluyeOT', index);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t flex flex-col items-center text-center">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Agregar más fotografías</p>
                        <div className="w-full max-w-sm">
                          <PhotoUploader
                            multiple
                            onChange={(e) => handleUploadImage('ot', e.target.files)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg flex flex-col items-center">
                      <Camera className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-gray-500 mb-3">No hay fotografías de arribo</p>
                      <div className="w-full max-w-sm">
                        <PhotoUploader
                          multiple
                          onChange={(e) => handleUploadImage('ot', e.target.files)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Liberación de OT */}
          <TabsContent value="liberacion-ot">
            <Card>
              <CardHeader>
                <CardTitle>✅ Liberación de OT</CardTitle>
                <CardDescription>Liberación formal de la orden de trabajo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sección de Tareas a Realizar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600 font-semibold">Tareas a Realizar</label>
                    {!isAnulada && (
                      !isEditingTareas && currentIndex >= 1 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingTareas(true);
                            setEditedTareas(orden.tareasRealizar?.join('\n') || '');
                          }}
                        >
                          Editar
                        </Button>
                      ) : !isEditingTareas && currentIndex < 1 ? (
                        <Badge variant="secondary" className="text-xs">
                          🔒 Bloqueado
                        </Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingTareas(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveTareas}
                          >
                            Guardar
                          </Button>
                        </div>
                      )
                    )}
                  </div>

                  {isEditingTareas ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedTareas}
                        onChange={(e) => setEditedTareas(e.target.value)}
                        className="w-full min-h-[150px] p-3 border rounded-lg"
                        placeholder="Ingrese cada tarea en una línea nueva"
                      />
                      <p className="text-xs text-gray-500">Escriba cada tarea en una línea nueva</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {orden.tareasRealizar && orden.tareasRealizar.length > 0 ? (
                        orden.tareasRealizar.map((tarea, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`tarea-${index}`}
                              checked={completedTareas[index] || false}
                              onChange={() => handleToggleTarea(index)}
                              className="w-5 h-5 mt-0.5 cursor-pointer rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <label
                              htmlFor={`tarea-${index}`}
                              className={`flex-1 cursor-pointer select-none ${
                                completedTareas[index] ? 'line-through text-gray-400' : ''
                              }`}
                            >
                              {tarea}
                            </label>
                          </li>
                        ))
                      ) : (
                        <p className="text-gray-500">No hay tareas definidas</p>
                      )}
                    </ul>
                  )}
                </div>

                {/* Documento Orden de Servicio */}
                <div className="border-t pt-6">
                  {/* Alerta de validación - solo mostrar cuando estamos en liberacion-ot */}
                  {orden.estado === 'liberacion-ot' && !canAdvanceToLiberacionOT() && (
                    <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-800">Documento requerido</p>
                        <p className="text-sm text-yellow-700">
                          Debe subir el documento "Orden de servicio" (PDF o imagen) antes de avanzar a la siguiente etapa.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">📄 Orden de Servicio *</h4>
                      <p className="text-sm text-gray-600">
                        Documento requerido para avanzar (PDF o imagen)
                      </p>
                    </div>
                    {orden.ordenServicio && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Cargado
                      </Badge>
                    )}
                  </div>

                  {orden.ordenServicio ? (
                    <div className="p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-semibold">{orden.ordenServicio.nombre}</p>
                            <p className="text-sm text-gray-600">
                              Cargado el {new Date(orden.ordenServicio.uploadedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleDownloadDocument('ordenServicio')}>
                            <Download className="w-4 h-4 mr-2" />
                            Ver Documento
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteDocumento('ordenServicio')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border-2 border-dashed rounded-lg text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">Suba la Orden de Servicio firmada por el cliente</p>
                      <Input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileChange(e, 'ordenServicio')}
                        className="max-w-xs mx-auto cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-2">PDF o imagen (JPG, PNG)</p>
                    </div>
                  )}
                </div>

                {/* Estado de Apertura */}
                <div className="border-t pt-6">
                  <div className="p-4 bg-blue-50 border-l-4 border-blue-600 mb-4">
                    <p className="font-semibold text-blue-900">Estado de la Orden de Trabajo</p>
                    <p className="text-sm text-blue-700">Gestión del estado de liberación</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Estado de Liberación</Label>
                      {!isAnulada ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button
                            variant={orden.estadoAperturaOT?.estado === 'Pendiente' ? 'default' : 'outline'}
                            className={orden.estadoAperturaOT?.estado === 'Pendiente' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                            onClick={() => handleUpdateEstadoOT('Pendiente')}
                          >
                            Pendiente
                          </Button>
                          <Button
                            variant={orden.estadoAperturaOT?.estado === 'Liberado' ? 'default' : 'outline'}
                            className={orden.estadoAperturaOT?.estado === 'Liberado' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => handleUpdateEstadoOT('Liberado')}
                          >
                            Liberado
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-sm px-4 py-2 opacity-70">
                          {orden.estadoAperturaOT?.estado || 'Pendiente'}
                        </Badge>
                      )}
                    </div>

                    {orden.estadoAperturaOT && (
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Estado Actual</p>
                            <p className="font-semibold text-lg">{orden.estadoAperturaOT.estado}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Cambio</p>
                            <p className="font-semibold">
                              {new Date(orden.estadoAperturaOT.fecha).toLocaleString('es-MX', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procede al Servicio */}
          <TabsContent value="servicio">
            <Card>
              <CardHeader>
                <CardTitle>🔧 Procede al Servicio</CardTitle>
                <CardDescription>Ejecución del servicio técnico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">Zonas a Trabajar</label>
                    {!isAnulada && (
                      !isEditingZonas && currentIndex >= 2 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingZonas(true);
                            // Convert array to comma-separated string
                            setEditedZonas(orden.zonasTrabajar?.join(', ') || '');
                          }}
                        >
                          Editar
                        </Button>
                      ) : !isEditingZonas && currentIndex < 2 ? (
                        <Badge variant="secondary" className="text-xs">
                          🔒 Bloqueado
                        </Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingZonas(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveZonas}
                          >
                            Guardar
                          </Button>
                        </div>
                      )
                    )}
                  </div>

                  {isEditingZonas ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedZonas}
                        onChange={(e) => setEditedZonas(e.target.value)}
                        className="w-full min-h-[100px] p-3 border rounded-lg"
                        placeholder="Ingrese las zonas separadas por comas (ej: Zona A, Zona B, Zona C)"
                      />
                      <p className="text-xs text-gray-500">Separe las zonas con comas</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {orden.zonasTrabajar && orden.zonasTrabajar.length > 0 ? (
                        orden.zonasTrabajar.map((zona, index) => (
                          <Badge key={index} variant="outline">{zona}</Badge>
                        ))
                      ) : (
                        <p className="text-gray-500">No hay zonas definidas</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-3">📸 Fotografías del Servicio</h4>
                  {orden.fotografiasPiezas && orden.fotografiasPiezas.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {orden.fotografiasPiezas.map((foto, index) => (
                          <div key={foto.id || index} className="group relative">
                            <ZoomableImage
                              src={foto.url || foto.base64Data}
                              alt={foto.nombre || `Foto ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border block"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                              <p className="text-white text-sm font-semibold text-center px-2">
                                {foto.nombre}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFoto('fotografiasPiezas', index);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Botón para agregar más fotos */}
                      <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center text-center">
                        <span className="font-medium text-gray-700 mb-2">Agregar más fotografías</span>
                        <div className="w-full max-w-sm">
                          <PhotoUploader
                            multiple
                            onChange={(e) => handleUploadImage('pieza', e.target.files)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6">
                      <div className="flex flex-col items-center justify-center w-full">
                        <Camera className="w-12 h-12 text-gray-400 mb-2" />
                        <div className="text-center mb-4">
                          <p className="text-gray-600 font-medium mb-1">No hay fotografías del servicio</p>
                          <p className="text-sm text-gray-500">Haga clic para tomar o seleccionar múltiples fotos</p>
                        </div>
                        <div className="max-w-sm w-full">
                          <PhotoUploader
                            multiple
                            onChange={(e) => handleUploadImage('pieza', e.target.files)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revisión de Calidad */}
          <TabsContent value="revision-calidad">
            <Card>
              <CardHeader>
                <CardTitle>🔍 Revisión de Calidad</CardTitle>
                <CardDescription>Control de calidad y verificaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {orden.planCalidad && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Inspecciones Finales</label>
                        <ul className="space-y-2">
                          {orden.planCalidad.inspeccionesFinales.map((inspeccion, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span>{inspeccion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={orden.planCalidad.comparaRendimiento} readOnly className="w-4 h-4" />
                          <span>Compara con el rendimiento</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={orden.planCalidad.verificaHermeticidad} readOnly className="w-4 h-4" />
                          <span>Verifica hermeticidad</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Fotografías de Revisión de Calidad */}
                  <div>
                    <h4 className="font-semibold mb-3">📸 Fotografías de Revisión de Calidad</h4>
                    {orden.fotografiasRevisionCalidad && orden.fotografiasRevisionCalidad.length > 0 ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {orden.fotografiasRevisionCalidad.map((foto, index) => (
                            <div key={foto.id || index} className="flex gap-4 items-start border rounded-lg p-4">
                              <ZoomableImage
                                src={foto.url || foto.base64Data}
                                alt={foto.nombre || `Foto ${index + 1}`}
                                className="w-32 h-32 object-cover rounded-lg flex-shrink-0 border-2 block"
                              />
                              <div className="flex-1 space-y-2">
                                {editingRevisionFotoIndex === index ? (
                                  <div className="space-y-2 mt-2">
                                    <Input
                                      className="w-full font-semibold text-sm"
                                      placeholder="Título de la imagen"
                                      value={editingRevisionFotoNombre}
                                      onChange={(e) => setEditingRevisionFotoNombre(e.target.value)}
                                    />
                                    <textarea
                                      className="w-full min-h-[80px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Descripción del procedimiento"
                                      value={editingRevisionFotoDesc}
                                      onChange={(e) => setEditingRevisionFotoDesc(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleSaveRevisionFotoDesc(index)}>💾 Guardar</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingRevisionFotoIndex(null)}>Cancelar</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-sm mb-1">{foto.nombre}</p>
                                    {foto.descripcion ? (
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {foto.descripcion}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">Sin descripción</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="px-0 text-blue-600 h-auto py-1"
                                        onClick={() => {
                                          setEditingRevisionFotoIndex(index);
                                          setEditingRevisionFotoDesc(foto.descripcion || '');
                                          setEditingRevisionFotoNombre(foto.nombre || '');
                                        }}
                                      >
                                        ✏️ Editar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                                        onClick={() => handleDeleteFoto('fotografiasRevisionCalidad', index)}
                                      >
                                        <X className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Botón para agregar más fotos */}
                        <div className="border-2 border-dashed rounded-lg p-4 mt-4">
                          <RevisionCalidadPhotoUpload ordenId={id!} onUploadComplete={loadOrden} />
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6">
                        <RevisionCalidadPhotoUpload ordenId={id!} onUploadComplete={loadOrden} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Limpieza y Embalaje */}
          <TabsContent value="limpieza-embalaje">
            <Card>
              <CardHeader>
                <CardTitle>📦 Limpieza y Embalaje</CardTitle>
                <CardDescription>Preparación del componente para entrega</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Fotografías de Limpieza y Embalaje */}
                  <div>
                    <h4 className="font-semibold mb-3">📸 Fotografías de Limpieza y Embalaje</h4>
                    {orden.fotografiasLimpiezaEmbalaje && orden.fotografiasLimpiezaEmbalaje.length > 0 ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {orden.fotografiasLimpiezaEmbalaje.map((foto, index) => (
                            <div key={foto.id || index} className="flex gap-4 items-start border rounded-lg p-4">
                              <ZoomableImage
                                src={foto.url || foto.base64Data}
                                alt={foto.nombre || `Foto ${index + 1}`}
                                className="w-32 h-32 object-cover rounded-lg flex-shrink-0 border-2 block"
                              />
                              <div className="flex-1 space-y-2">
                                {editingLimpiezaFotoIndex === index ? (
                                  <div className="space-y-2 mt-2">
                                    <Input
                                      className="w-full font-semibold text-sm"
                                      placeholder="Título de la imagen"
                                      value={editingLimpiezaFotoNombre}
                                      onChange={(e) => setEditingLimpiezaFotoNombre(e.target.value)}
                                    />
                                    <textarea
                                      className="w-full min-h-[80px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Descripción del procedimiento"
                                      value={editingLimpiezaFotoDesc}
                                      onChange={(e) => setEditingLimpiezaFotoDesc(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleSaveLimpiezaFotoDesc(index)}>💾 Guardar</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingLimpiezaFotoIndex(null)}>Cancelar</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-sm mb-1">{foto.nombre}</p>
                                    {foto.descripcion ? (
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {foto.descripcion}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">Sin descripción</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="px-0 text-blue-600 h-auto py-1"
                                        onClick={() => {
                                          setEditingLimpiezaFotoIndex(index);
                                          setEditingLimpiezaFotoDesc(foto.descripcion || '');
                                          setEditingLimpiezaFotoNombre(foto.nombre || '');
                                        }}
                                      >
                                        ✏️ Editar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                                        onClick={() => handleDeleteFoto('fotografiasLimpiezaEmbalaje', index)}
                                      >
                                        <X className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Botón para agregar más fotos */}
                        <div className="border-2 border-dashed rounded-lg p-4 mt-4">
                          <RevisionCalidadPhotoUpload ordenId={id!} tipo="limpiezaEmbalaje" onUploadComplete={loadOrden} />
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6">
                        <RevisionCalidadPhotoUpload ordenId={id!} tipo="limpiezaEmbalaje" onUploadComplete={loadOrden} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entrega del Servicio */}
          <TabsContent value="entrega">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>🚚 Entrega del Servicio</CardTitle>
                    <CardDescription>Documentos y entrega al cliente</CardDescription>
                  </div>
                  <Button 
                    onClick={handleGeneratePDF} 
                    className="bg-blue-800 hover:bg-blue-900 text-white font-bold tracking-wide"
                  >
                    INFORME PRELIMINAR
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-semibold">Guía de Salida</p>
                      <p className="text-sm text-gray-600">
                        {orden.guiaSalida ? 'Cargado' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  {orden.guiaSalida ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleDownloadDocument('guiaSalida')}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteDocumento('guiaSalida')}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'guiaSalida')}
                      className="max-w-xs cursor-pointer"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold">Hoja de Ruta del componente</p>
                      <p className="text-sm text-gray-600">
                        {orden.fichaComponente ? 'Cargado' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  {orden.fichaComponente ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleDownloadDocument('fichaComponente')}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteDocumento('fichaComponente')}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'fichaComponente')}
                      className="max-w-xs cursor-pointer"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="font-semibold">Informe Comercial</p>
                      <p className="text-sm text-gray-600">
                        {orden.informeComercial ? 'Cargado' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  {orden.informeComercial ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleDownloadDocument('informeComercial')}>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteDocumento('informeComercial')}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'informeComercial')}
                      className="max-w-xs cursor-pointer"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completado */}
          <TabsContent value="completado">
            <Card>
              <CardHeader>
                <CardTitle>✅ Servicio Completado</CardTitle>
                <CardDescription>Orden de trabajo finalizada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">¡Servicio Completado!</h3>
                  <p className="text-gray-600 mb-4">
                    La orden de trabajo ha sido finalizada exitosamente
                  </p>
                  <div className="text-sm text-gray-500 mb-6">
                    <p>OT: {orden.numeroOT}</p>
                    <p>Componente: {orden.nombreComponente}</p>
                    <p>Cliente: {orden.clienteNombre}</p>
                  </div>

                  {/* Botón para generar informe PDF */}
                  <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg max-w-md mx-auto">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-semibold text-lg mb-2">Informe Completo</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Descargue un informe PDF completo con toda la información de la orden, incluyendo línea de tiempo, fotografías y documentos.
                    </p>
                    <Button 
                      onClick={handleGeneratePDF} 
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Informe PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmar Avance Dialog */}
      {currentStepInfo && nextStepInfo && (
        <ConfirmarAvanceDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          currentStep={currentStepInfo}
          nextStep={nextStepInfo}
          onConfirm={handleAvanzarEtapa}
        />
      )}

      {/* Retroceder Etapa Dialog */}
      {currentStepInfo && previousStepInfo && (
        <RetrocederEtapaDialog
          open={showRetrocederDialog}
          onOpenChange={setShowRetrocederDialog}
          currentStep={currentStepInfo}
          previousStep={previousStepInfo}
          onConfirm={handleRetrocederEtapa}
        />
      )}
      <AlertDialog open={showAnularDialog} onOpenChange={setShowAnularDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro que desea anular esta Orden de Trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción la marcará como anulada irreversiblemente, pero mantendrá su historial y número de OT en el sistema para evitar discrepancias documentarias. No podrá ser editada ni avanzar etapas después de anularse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnularOT} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Anular OT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}