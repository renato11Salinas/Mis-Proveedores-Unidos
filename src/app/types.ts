export type WorkflowStep = 
  | 'arribo'
  | 'llenado-rq'
  | 'apertura-ot'
  | 'servicio'
  | 'revision-calidad'
  | 'limpieza-embalaje'
  | 'entrega'
  | 'completado';

export interface OrdenTrabajo {
  id: string;
  numeroOT: string;
  numeroOTCorrelativo?: number; // Sequential number for sorting
  fechaCreacion: string;
  estado: WorkflowStep;
  
  // Datos de ingreso
  nombreComponente: string;
  dpObra: string;
  clienteNombre: string;
  clienteNumero: string;
  numeroGuia: string;
  compraAlta: string;
  edoObra: string;
  exObra: string;
  requiereFotografia: boolean;
  fotografia?: string;
  
  // Datos del servicio
  servicioSolicitado: string;
  tareasRealizar: string[];
  zonasTrabajar: string[];
  fotografiasIncluyeOT: string[];
  
  // Datos RQ
  confirmeMedidas: boolean;
  tiempoPreparacion: string;
  solicitudFechaEntrega: string;
  
  // Plan de calidad
  planCalidad?: {
    historialOT: string;
    inspeccionesFinales: string[];
    comparaRendimiento: boolean;
    verificaHermeticidad: boolean;
    apruebayEntrega: boolean;
  };
  
  // Limpieza
  limpiezaComputadora: boolean;
  fotografiasPiezas: string[];
  inspeccionFinalResponsables: string[];
  
  // Entrega
  requiereGuiaSalida: boolean;
  guiaSalida?: string;
  informeComercial?: string;
  fichaComponente?: string;
  
  // Insumos/Compras
  requerimientoInsumos?: string;
  requerimientoCompra?: string;
}

export interface WorkflowStepInfo {
  id: WorkflowStep;
  name: string;
  description: string;
  icon: string;
}
