import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Clock, CheckCircle2, AlertCircle, Filter, Download } from 'lucide-react';
import { workflowSteps } from '../data/mockData';
import { OrdenTrabajo } from '../types';
import { api } from '../lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function Dashboard() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    loadOrdenes();
  }, []);

  const loadOrdenes = async () => {
    try {
      const response = await api.getOrdenes();
      if (response.ordenes && !response.error) {
        setOrdenes(response.ordenes);
      } else {
        // En vez de fallback, mostramos el error limpio para que se sepa que la DB falla
        toast.error('Error de servidor: No se pudieron cargar las órdenes (Error 500)');
      }
    } catch (error) {
      toast.error('Error de conexión o fallo interno del servidor');
      console.error('Error loading ordenes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract available years and months from orders
  const getAvailableYears = () => {
    const years = new Set<string>();
    ordenes.forEach(orden => {
      if (orden.fechaCreacion) {
        const year = new Date(orden.fechaCreacion).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort().reverse();
  };

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const filteredOrdenes = ordenes.filter(orden => {
    // Search filter
    const matchesSearch = orden.numeroOT?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.nombreComponente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.numeroGuia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase());

    // State filter
    let matchesEstado = true;
    const isAnulada = !!orden.anulado || orden.estado === 'anulado';
    
    if (selectedEstado === 'anulado') {
      matchesEstado = isAnulada;
    } else if (selectedEstado !== 'all') {
      matchesEstado = !isAnulada && orden.estado === selectedEstado;
    }

    // Date filters 
    let matchesYear = true;
    let matchesMonth = true;

    if (orden.fechaCreacion) {
      const ordenDate = new Date(orden.fechaCreacion);
      const ordenYear = ordenDate.getFullYear().toString();
      const ordenMonth = String(ordenDate.getMonth() + 1).padStart(2, '0');

      matchesYear = selectedYear === 'all' || ordenYear === selectedYear;
      matchesMonth = selectedMonth === 'all' || ordenMonth === selectedMonth;
    } else if (selectedYear !== 'all' || selectedMonth !== 'all') {
      return false;
    }

    return matchesSearch && matchesEstado && matchesYear && matchesMonth;
  });

  const getEstadoBadge = (orden: OrdenTrabajo) => {
    const isAnulada = !!orden.anulado || orden.estado === 'anulado';
    if (isAnulada) {
      return (
        <Badge className="bg-gray-700 text-white hover:bg-gray-800">
          ANULADO
        </Badge>
      );
    }

    const estadoEfectivo = orden.estado === 'ingreso-datos' ? 'arribo' : orden.estado;
    const step = workflowSteps.find(s => s.id === estadoEfectivo);
    if (!step) return null;

    const colors: Record<string, string> = {
      'arribo': 'bg-gray-500',
      'llenado-rq': 'bg-indigo-500',
      'apertura-ot': 'bg-purple-500',
      'servicio': 'bg-yellow-500',
      'revision-calidad': 'bg-orange-500',
      'limpieza-embalaje': 'bg-cyan-500',
      'entrega': 'bg-green-500',
      'completado': 'bg-green-700',
    };

    return (
      <Badge className={`${colors[orden.estado]} text-white`}>
        {step.icon} {step.name}
      </Badge>
    );
  };

  const stats = {
    total: ordenes.length,
    enProceso: ordenes.filter(o => o.estado !== 'completado' && !o.anulado && o.estado !== 'anulado').length,
    completados: ordenes.filter(o => o.estado === 'completado' && !o.anulado && o.estado !== 'anulado').length,
  };

  // Función para descargar órdenes como Excel
  const handleDownloadOrdenes = () => {
    const ordenesToDownload = filteredOrdenes.length > 0 ? filteredOrdenes : ordenes;

    if (ordenesToDownload.length === 0) {
      toast.error('No hay órdenes para descargar');
      return;
    }

    // Preparar datos para Excel completos
    const excelData = ordenesToDownload.map(orden => {
      const estadoEfectivo = orden.estado === 'ingreso-datos' ? 'arribo' : orden.estado;
      const stepName = workflowSteps.find(s => s.id === estadoEfectivo)?.name || orden.estado;

      const isAnulada = !!orden.anulado || orden.estado === 'anulado';
      return {
        'Número OT': orden.numeroOT || '',
        'Fecha Creación': orden.fechaCreacion ? new Date(orden.fechaCreacion).toLocaleDateString('es-ES') : '',
        'Estado': isAnulada ? 'Anulado' : stepName,
        'Componente': orden.nombreComponente || '',
        'Cliente': orden.clienteNombre || '',
        'RUC Cliente': (orden as any).clienteRuc || '',
        'Teléfono': (orden as any).clienteTelefono || '',
        'Email': (orden as any).clienteEmail || '',
        'Número de Guía': orden.numeroGuia || '',
        'Servicio Solicitado': orden.servicioSolicitado || '',
        'DP Obra': orden.dpObra || '',
        'Número Cliente': (orden as any).clienteNumero || '',
        'Estado Obra': orden.edoObra || '',
        'Compra/Alta': (orden as any).compraAlta || '',
        'Ex Obra': (orden as any).exObra || '',
        'Requiere Fotografía': orden.requiereFotografia ? 'Sí' : 'No',
        'Tiene Orden de Servicio': (orden as any).ordenServicio ? 'Sí' : 'No',
        'Tareas a Realizar': Array.isArray(orden.tareasRealizar) ? orden.tareasRealizar.join('; ') : '',
        'Zonas a Trabajar': Array.isArray(orden.zonasTrabajar) ? orden.zonasTrabajar.join('; ') : ''
      };
    });

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Estilizar las columnas para que se auto-ajusten visualmente
    worksheet['!cols'] = [
      { wch: 14 }, // OT
      { wch: 15 }, // Fecha
      { wch: 25 }, // Estado
      { wch: 30 }, // Componente
      { wch: 35 }, // Cliente
      { wch: 15 }, // RUC
      { wch: 15 }, // Tel
      { wch: 25 }, // Email
      { wch: 15 }, // Guia
      { wch: 45 }, // Servicio
      { wch: 15 }, // DP Obra
      { wch: 15 }, // Num Cliente
      { wch: 15 }, // Edo Obra
      { wch: 15 }, // Compra Alta
      { wch: 15 }, // Ex Obra
      { wch: 18 }, // Foto
      { wch: 22 }, // Orden Servicio
      { wch: 40 }, // Tareas
      { wch: 40 }, // Zonas
    ];

    // Intentar aplicar colores de cabecera (Azul Claro)
    // Nota: El color requiere una variante de XLSX que maneje estilos (ej. xlsx-js-style)
    // Dejaremos la instrucción de estilo lista.
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "CDE4F5" } }, // Azul claro tipo pastel
        font: { bold: true, color: { rgb: "000000" } }
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes');



    // Nombre del archivo con fecha
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hasFilters = selectedMonth !== 'all' || selectedYear !== 'all' || searchTerm !== '';
    const fileName = hasFilters
      ? `ordenes_filtradas_${dateStr}.xlsx`
      : `ordenes_completas_${dateStr}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(workbook, fileName);

    toast.success(`${ordenesToDownload.length} órdenes descargadas correctamente en formato Excel`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex shrink-0 items-center justify-center">
                <span className="text-white font-bold text-2xl">MPU</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold sm:font-normal">Sistema de Gestión de Servicios</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Control de órdenes de trabajo MPU</p>
              </div>
            </div>
            <Link to="/nueva-orden" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="w-5 h-5 mr-2" />
                Nueva Orden
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Cargando órdenes de trabajo...</p>
            <p className="text-sm text-gray-500 mt-2">Por favor espera un momento</p>
          </div>
        ) : (
          <>
            {/* Los filtros antiguos de arribo fueron removidos */}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Órdenes</p>
                      <p className="text-3xl mt-1">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">En Proceso</p>
                      <p className="text-3xl mt-1">{stats.enProceso}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completados</p>
                      <p className="text-3xl mt-1">{stats.completados}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Unified Search & Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Buscar por número de OT, componente, guía o cliente..."
                      className="pl-10 h-10"
                      value={searchTerm}
                      onChange={(e) => {setSearchTerm(e.target.value); setDisplayLimit(10);}}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500 hidden md:block" />
                      <select
                        className="px-3 py-2 border rounded-md h-10 bg-white min-w-[140px] text-sm"
                        value={selectedEstado}
                        onChange={(e) => {setSelectedEstado(e.target.value); setDisplayLimit(10);}}
                      >
                        <option value="all">Todos los Estados</option>
                        {workflowSteps.map(step => (
                          <option key={step.id} value={step.id}>{step.name}</option>
                        ))}
                        <option value="anulado">Anuladas</option>
                      </select>
                    </div>

                    <select
                      className="px-3 py-2 border rounded-md h-10 bg-white min-w-[130px] text-sm"
                      value={selectedMonth}
                      onChange={(e) => {setSelectedMonth(e.target.value); setDisplayLimit(10);}}
                    >
                      <option value="all">Todos los meses</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                    
                    <select
                      className="px-3 py-2 border rounded-md h-10 bg-white min-w-[130px] text-sm"
                      value={selectedYear}
                      onChange={(e) => {setSelectedYear(e.target.value); setDisplayLimit(10);}}
                    >
                      <option value="all">Todos los años</option>
                      {getAvailableYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                  <div className="text-sm text-gray-500 w-full sm:w-auto">
                    {(selectedMonth !== 'all' || selectedYear !== 'all' || selectedEstado !== 'all' || searchTerm !== '') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMonth('all');
                          setSelectedYear('all');
                          setSelectedEstado('all');
                          setSearchTerm('');
                          setDisplayLimit(10);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto w-full sm:w-auto"
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleDownloadOrdenes}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Excel
                    {(selectedMonth !== 'all' || selectedYear !== 'all' || selectedEstado !== 'all' || searchTerm !== '')
                      ? ` Filtradas (${filteredOrdenes.length})`
                      : ` Todas (${ordenes.length})`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
              <CardHeader>
                <CardTitle>Órdenes de Trabajo</CardTitle>
                <CardDescription>
                  Mostrando {Math.min(10, filteredOrdenes.length)} de {filteredOrdenes.length} órdenes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Scrollable container with fixed height */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredOrdenes.slice(0, displayLimit).map((orden) => {
                    const isAnulada = !!orden.anulado || orden.estado === 'anulado';
                    return (
                    <Link key={orden.id} to={`/orden/${orden.id}`}>
                      <div className={`border rounded-lg p-4 transition-colors cursor-pointer ${isAnulada ? 'bg-gray-200 opacity-80' : 'hover:bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex-1 w-full">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{orden.numeroOT}</h3>
                              {getEstadoBadge(orden)}
                            </div>
                            <p className="text-gray-700 mb-1 line-clamp-2">{orden.nombreComponente}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                              <span>Cliente: {orden.clienteNombre}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Guía: {orden.numeroGuia}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Fecha: {orden.fechaCreacion}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0">
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    </Link>
                  )})}

                  {filteredOrdenes.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No se encontraron órdenes de trabajo
                    </div>
                  )}
                </div>

                {/* Show message if there are more orders */}
                {filteredOrdenes.length > displayLimit && (
                  <div className="mt-6 pt-4 border-t text-center flex flex-col items-center justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setDisplayLimit(prev => prev + 20)}
                      className="min-w-[200px]"
                    >
                      Cargar {Math.min(20, filteredOrdenes.length - displayLimit)} órdenes más
                    </Button>
                    <p className="text-xs text-gray-500 mt-3">
                       Mostrando {displayLimit} de {filteredOrdenes.length} órdenes en total
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}