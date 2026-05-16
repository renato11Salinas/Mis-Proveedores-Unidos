import { jsPDF } from 'jspdf';
import { workflowSteps } from '../data/mockData';

export interface OrdenData {
  numeroOT: string;
  nombreComponente: string;
  numeroGuia: string;
  fechaCreacion: string;
  estado: string;
  clienteNombre?: string;
  clienteRuc?: string;
  clienteTelefono?: string;
  clienteNumero?: string;
  dpObra?: string;
  edoObra?: string;
  servicioSolicitado?: string;
  tareasRealizar?: string[];
  zonasTrabajar?: string[];
  fotografiasIncluyeOT?: Array<{ url?: string; base64Data?: string; nombre: string; uploadedAt: string }>;
  fotografiasPiezas?: Array<{ url?: string; base64Data?: string; nombre: string; uploadedAt: string }>;
  fotografiasRevisionCalidad?: Array<{ url?: string; base64Data?: string; nombre: string; uploadedAt: string; descripcion?: string }>;
  ordenServicio?: { nombre: string; uploadedAt: string };
  guiaSalida?: { nombre: string; uploadedAt: string };
  fichaComponente?: { nombre: string; uploadedAt: string };
  informeComercial?: { nombre: string; uploadedAt: string };
  fechaAperturaOT?: string;
  planCalidad?: {
    inspeccionesFinales: string[];
    comparaRendimiento: boolean;
    verificaHermeticidad: boolean;
  };
  limpiezaComputadora?: boolean;
  estadoEmbalaje?: string;
  historial?: Array<{
    etapa: string;
    timestamp: string;
    dni: string;
    accion: string;
  }>;
  historialCambios?: Array<{
    fecha: string;
    usuario: string;
    dni: string;
    tipo: string;
    estadoAnterior: string;
    estadoNuevo: string;
    motivo?: string;
  }>;
}

// Helper: Convert image URL or base64 to data URL for PDF
async function getImageDataUrl(imageUrl: string): Promise<string> {
  // If already base64, return as is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // If URL, fetch and convert to base64
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'default'
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return '';
    }

    const blob = await response.blob();
    
    // Check blob size (limit to 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      console.error('Image too large:', blob.size);
      return '';
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error('FileReader error');
        resolve('');
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error loading image:', error.message);
    } else {
      console.error('Error loading image:', error);
    }
    return '';
  }
}

// Helper: Calculate time spent in each stage
interface TimePerStage {
  etapa: string;
  horas: number;
  dias: number;
}

function calculateTimePerStage(historial: Array<any>): TimePerStage[] {
  if (!historial || historial.length === 0) return [];

  const timePerStage: { [key: string]: number } = {};
  
  // Normalize fields and sort historial by timestamp/fecha
  const sortedHistorial = [...historial].map(ev => ({
    ...ev,
    _normalizedTime: ev.timestamp || ev.fecha,
    _normalizedStage: ev.etapa || ev.estadoNuevo || ev.accion || 'Sin etapa'
  })).filter(ev => ev._normalizedTime).sort((a, b) => 
    new Date(a._normalizedTime).getTime() - new Date(b._normalizedTime).getTime()
  );

  for (let i = 0; i < sortedHistorial.length - 1; i++) {
    const currentEvent = sortedHistorial[i];
    const nextEvent = sortedHistorial[i + 1];
    
    const startTime = new Date(currentEvent._normalizedTime).getTime();
    const endTime = new Date(nextEvent._normalizedTime).getTime();
    const duration = endTime - startTime; // milliseconds
    
    const stageKey = currentEvent._normalizedStage;
    
    if (!timePerStage[stageKey]) {
      timePerStage[stageKey] = 0;
    }
    timePerStage[stageKey] += duration;
  }

  // Add time for the last stage (from last event to now)
  if (sortedHistorial.length > 0) {
    const lastEvent = sortedHistorial[sortedHistorial.length - 1];
    const startTime = new Date(lastEvent._normalizedTime).getTime();
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    const stageKey = lastEvent._normalizedStage;
    if (!timePerStage[stageKey]) {
      timePerStage[stageKey] = 0;
    }
    timePerStage[stageKey] += duration;
  }

  // Convert to array and calculate hours/days
  return Object.entries(timePerStage).map(([etapa, milliseconds]) => {
    const horas = milliseconds / (1000 * 60 * 60);
    const dias = horas / 24;
    return {
      etapa: etapa,
      horas: Math.round(horas * 10) / 10,
      dias: Math.round(dias * 10) / 10
    };
  }).sort((a, b) => b.horas - a.horas); // Sort by duration descending
}

// Helper: Draw bar chart directly on PDF
function drawBarChart(
  doc: jsPDF,
  timeData: TimePerStage[],
  startX: number,
  startY: number,
  chartWidth: number,
  chartHeight: number
) {
  try {
    const colors = [
      { fill: [59, 130, 246], border: [37, 99, 235] },      // Blue
      { fill: [16, 185, 129], border: [5, 150, 105] },      // Green
      { fill: [245, 158, 11], border: [217, 119, 6] },      // Amber
      { fill: [239, 68, 68], border: [220, 38, 38] },       // Red
      { fill: [139, 92, 246], border: [124, 58, 237] },     // Purple
      { fill: [236, 72, 153], border: [219, 39, 119] },     // Pink
      { fill: [20, 184, 166], border: [13, 148, 136] },     // Teal
      { fill: [251, 146, 60], border: [249, 115, 22] },     // Orange
      { fill: [34, 197, 94], border: [22, 163, 74] },       // Green
    ];

    const maxHoras = Math.max(...timeData.map(d => d.horas || 0), 1);
    const barHeight = 12;
    const barSpacing = 8;
    const labelWidth = 50;
    const graphWidth = chartWidth - labelWidth - 40;

    // Draw title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Análisis de Tiempos por Etapa', startX, startY);
    
    let yPos = startY + 10;

    // Draw each bar
    timeData.forEach((data, index) => {
      if (!data || typeof data.horas !== 'number') return;
      
      const barWidth = Math.max((data.horas / maxHoras) * graphWidth, 1);
      const color = colors[index % colors.length];

      // Draw label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const etapaText = String(data.etapa || 'Sin nombre');
      const labelText = etapaText.length > 20 ? etapaText.substring(0, 18) + '...' : etapaText;
      doc.text(labelText, startX, yPos + 8);

      // Draw bar background (light gray)
      doc.setFillColor(240, 240, 240);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(startX + labelWidth, yPos, graphWidth, barHeight, 'FD');

      // Draw colored bar
      if (barWidth > 0 && isFinite(barWidth)) {
        doc.setFillColor(color.fill[0], color.fill[1], color.fill[2]);
        doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
        doc.setLineWidth(0.5);
        doc.rect(startX + labelWidth, yPos, barWidth, barHeight, 'FD');
      }

      // Draw value label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const horas = isFinite(data.horas) ? data.horas.toFixed(1) : '0.0';
      const dias = isFinite(data.dias) ? data.dias.toFixed(1) : '0.0';
      const valueText = `${horas}h (${dias}d)`;
      const textX = startX + labelWidth + barWidth + 3;
      const textY = yPos + 8;
      
      if (isFinite(textX) && isFinite(textY)) {
        doc.text(valueText, textX, textY);
      }

      yPos += barHeight + barSpacing;
    });

    // Draw legend
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('* Tiempo calculado desde el cambio de etapa hasta la siguiente acción', startX, yPos + 5);

    doc.setTextColor(0, 0, 0);
  } catch (error) {
    console.error('Error dibujando gráfico:', error);
    // Dibujar mensaje de error en el PDF
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 0, 0);
    doc.text('Error al generar gráfico de tiempos', startX, startY + 20);
    doc.setTextColor(0, 0, 0);
  }
}

export async function generateOrdenPDF(orden: OrdenData): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper: Add new page if needed
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper: Add text with auto-wrap
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkNewPage();
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.5;
    });
  };

  // Helper: Capitalize first letter of each word (Title Case)
  const toTitleCase = (str: string): string => {
    if (!str) return str;
    return str
      .toLowerCase()
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Header with executive style
  doc.setFillColor(30, 58, 138); // Professional dark blue
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME EJECUTIVO DE SERVICIO', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Orden de Trabajo: ${orden.numeroOT}`, pageWidth / 2, 35, { align: 'center' });

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Use historialCambios if historial is not available
  const historial = orden.historial || orden.historialCambios;

  // Información General - Executive style
  doc.setFillColor(37, 99, 235); // Professional blue
  doc.rect(margin, yPos, maxWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. INFORMACIÓN GENERAL', margin + 3, yPos + 5.5);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Create a professional info box with grid layout
  doc.setFillColor(252, 253, 255);
  doc.rect(margin, yPos, maxWidth, 30, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, maxWidth, 30, 'S');

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Componente:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(orden.nombreComponente, margin + 45, yPos);

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Número de Guía:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(orden.numeroGuia, margin + 45, yPos);

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Creación:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(orden.fechaCreacion, margin + 45, yPos);

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  // Find step name
  const stepName = workflowSteps.find(s => s.id === orden.estado)?.name || orden.estado;

  // Status badge style
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin + 45, yPos - 3.5, 30, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(stepName.toUpperCase(), margin + 47, yPos + 0.5);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  yPos += 10;

  // Cliente - Executive style
  if (orden.clienteNombre) {
    checkNewPage(40);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. DATOS DEL CLIENTE', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFillColor(252, 253, 255);
    const lineCount = 1 + (orden.clienteRuc ? 1 : 0) + (orden.clienteTelefono ? 1 : 0) + (orden.clienteNumero ? 1 : 0) + (orden.dpObra ? 1 : 0) + (orden.edoObra ? 1 : 0);
    const clienteBoxHeight = (lineCount * 7) + 5;
    
    doc.rect(margin, yPos, maxWidth, clienteBoxHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, maxWidth, clienteBoxHeight, 'S');

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Cliente:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(orden.clienteNombre, margin + 45, yPos);
    
    if (orden.clienteRuc) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('RUC:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(orden.clienteRuc, margin + 45, yPos);
    }
    
    if (orden.clienteTelefono) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Teléfono:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(orden.clienteTelefono, margin + 45, yPos);
    }

    if (orden.clienteNumero) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('N° Cliente:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(orden.clienteNumero, margin + 45, yPos);
    }
    
    if (orden.dpObra) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('DP de Obra:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(orden.dpObra, margin + 45, yPos);
    }
    
    if (orden.edoObra) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Estado de Obra:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(orden.edoObra, margin + 45, yPos);
    }
    
    yPos += 8;
  }

  // Servicio Solicitado - Executive style
  if (orden.servicioSolicitado) {
    checkNewPage(25);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. SERVICIO SOLICITADO', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const servicioLines = doc.splitTextToSize(orden.servicioSolicitado, maxWidth - 10);
    servicioLines.forEach((line: string) => {
      checkNewPage();
      doc.text(line, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 6;
  }

  // Tareas - Executive style with check marks
  if (orden.tareasRealizar && orden.tareasRealizar.length > 0) {
    checkNewPage(35);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. TAREAS REALIZADAS', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    orden.tareasRealizar.forEach((tarea, index) => {
      checkNewPage();
      // Green checkmark for each task
      doc.setTextColor(34, 197, 94);
      doc.text('✓', margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(`${tarea}`, margin + 12, yPos);
      yPos += 7;
    });
    yPos += 6;
  }

  // Zonas de Trabajo - Executive style
  if (orden.zonasTrabajar && orden.zonasTrabajar.length > 0) {
    checkNewPage(22);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. ZONAS DE TRABAJO', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(orden.zonasTrabajar.join(', '), margin + 5, yPos);
    yPos += 12;
  }

  // Plan de Calidad - Executive style
  if (orden.planCalidad) {
    checkNewPage(45);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('6. CONTROL DE CALIDAD', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    orden.planCalidad.inspeccionesFinales.forEach((inspeccion, index) => {
      checkNewPage();
      doc.setTextColor(34, 197, 94);
      doc.text('✓', margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(inspeccion, margin + 12, yPos);
      yPos += 7;
    });

    if (orden.planCalidad.comparaRendimiento) {
      doc.setTextColor(34, 197, 94);
      doc.text('✓', margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text('Comparación con rendimiento realizada', margin + 12, yPos);
      yPos += 7;
    }
    if (orden.planCalidad.verificaHermeticidad) {
      doc.setTextColor(34, 197, 94);
      doc.text('✓', margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text('Hermeticidad verificada', margin + 12, yPos);
      yPos += 7;
    }
    yPos += 6;
  }

  // Fotografías de Ingreso - Executive style
  if (orden.fotografiasIncluyeOT && orden.fotografiasIncluyeOT.length > 0) {
    checkNewPage(50);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('7. FOTOGRAFÍAS DE INGRESO DE COMPONENTE Y DATOS', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Display photos with images for visualization
    for (const foto of orden.fotografiasIncluyeOT) {
      checkNewPage(90);

      // Photo info box
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, maxWidth, 75, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, maxWidth, 75, 'S');

      yPos += 8;

      // Photo name and date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(foto.nombre, margin + 5, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha: ${foto.uploadedAt ? new Date(foto.uploadedAt).toLocaleString('es-ES') : 'Fecha no disponible'}`, margin + 5, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Load and display image
      try {
        const imageUrl = foto.url || foto.base64Data;
        if (imageUrl) {
          const dataUrl = await getImageDataUrl(imageUrl);
          if (dataUrl) {
            const imgWidth = 70;
            const imgHeight = 52;
            doc.addImage(dataUrl, 'JPEG', margin + 5, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
          }
        }
      } catch (error) {
        console.error('Error loading image for PDF:', error);
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text('(No se pudo cargar la imagen)', margin + 5, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
      }

      yPos += 5;
    }

    yPos += 6;
  }

  // Fotografías del Servicio - Executive style
  if (orden.fotografiasPiezas && orden.fotografiasPiezas.length > 0) {
    checkNewPage(50);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('8. FOTOGRAFÍAS DEL SERVICIO', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Display photos with images for visualization
    for (const foto of orden.fotografiasPiezas) {
      checkNewPage(90);

      // Photo info box
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, maxWidth, 75, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, maxWidth, 75, 'S');

      yPos += 8;

      // Photo name and date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(foto.nombre, margin + 5, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha: ${foto.uploadedAt ? new Date(foto.uploadedAt).toLocaleString('es-ES') : 'Fecha no disponible'}`, margin + 5, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Load and display image
      try {
        const imageUrl = foto.url || foto.base64Data;
        if (imageUrl) {
          const dataUrl = await getImageDataUrl(imageUrl);
          if (dataUrl) {
            const imgWidth = 70;
            const imgHeight = 52;
            doc.addImage(dataUrl, 'JPEG', margin + 5, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
          }
        }
      } catch (error) {
        console.error('Error loading image for PDF:', error);
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text('(No se pudo cargar la imagen)', margin + 5, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
      }

      yPos += 5;
    }

    yPos += 6;
  }

  // Fotografías de Revisión de Calidad - Executive style
  if (orden.fotografiasRevisionCalidad && orden.fotografiasRevisionCalidad.length > 0) {
    checkNewPage(50);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('9. FOTOGRAFÍAS DE REVISIÓN DE CALIDAD', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Display photos with images and descriptions for visualization
    for (const foto of orden.fotografiasRevisionCalidad) {
      const boxHeight = foto.descripcion ? 95 : 75;
      checkNewPage(boxHeight + 10);

      // Photo info box with dynamic height
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, maxWidth, boxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos, maxWidth, boxHeight, 'S');

      yPos += 8;

      // Photo name and date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(foto.nombre, margin + 5, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha: ${foto.uploadedAt ? new Date(foto.uploadedAt).toLocaleString('es-ES') : 'Fecha no disponible'}`, margin + 5, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Load and display image
      try {
        const imageUrl = foto.url || foto.base64Data;
        if (imageUrl) {
          const dataUrl = await getImageDataUrl(imageUrl);
          if (dataUrl) {
            const imgWidth = 70;
            const imgHeight = 52;
            doc.addImage(dataUrl, 'JPEG', margin + 5, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
          }
        }
      } catch (error) {
        console.error('Error loading image for PDF:', error);
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text('(No se pudo cargar la imagen)', margin + 5, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
      }

      // Add description if available
      if (foto.descripcion) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(50, 50, 50);
        const descripcionLines = doc.splitTextToSize(foto.descripcion.trim(), maxWidth - 15);
        descripcionLines.forEach((line: string, idx: number) => {
          if (idx === 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Descripción:', margin + 5, yPos);
            doc.setFont('helvetica', 'italic');
            yPos += 5;
          }
          doc.text(line, margin + 5, yPos);
          yPos += 5;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }

      yPos += 5;
    }

    yPos += 6;
  }

  // Documentos
  const documentos = [
    { key: 'ordenServicio', label: 'Orden de Servicio', data: orden.ordenServicio },
    { key: 'guiaSalida', label: 'Guía de Salida', data: orden.guiaSalida },
    { key: 'fichaComponente', label: 'Ficha del Componente', data: orden.fichaComponente },
    { key: 'informeComercial', label: 'Informe Comercial', data: orden.informeComercial },
  ].filter(d => d.data);

  if (documentos.length > 0) {
    checkNewPage(40);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('10. DOCUMENTOS ADJUNTOS', margin + 3, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    documentos.forEach((doc_item) => {
      if (!doc_item.data) return;
      
      checkNewPage(15);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPos, maxWidth, 12, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(doc_item.label, margin + 5, yPos + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${doc_item.data.nombre}`, margin + 55, yPos + 8);
      
      const dateStr = doc_item.data.uploadedAt ? new Date(doc_item.data.uploadedAt).toLocaleString('es-ES') : 'Fecha no disponible';
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(dateStr, maxWidth - margin - 20, yPos + 8);
      
      doc.setTextColor(0, 0, 0);
      yPos += 16;
    });
    yPos += 4;
  }

  // Historial (Timeline) Executive Table
  if (historial && historial.length > 0) {
    checkNewPage(40);
    
    // Section title
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('11. RESUMEN EJECUTIVO DE ETAPAS', margin + 3, yPos + 5.5);
    yPos += 12;

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, maxWidth, 10, 'FD');
    
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(10);
    doc.text('FECHA', margin + 5, yPos + 7);
    doc.text('ETAPA', margin + 35, yPos + 7);
    doc.text('ACCIÓN / DETALLE', margin + 85, yPos + 7);
    doc.text('DNI/RESP.', margin + 155, yPos + 7);
    yPos += 10;

    // Rows
    historial.forEach((evento: any, index: number) => {
      checkNewPage(20);
      
      const etapa = evento.etapa || evento.estadoNuevo || 'Sin etapa';
      const timestamp = evento.timestamp || evento.fecha;
      const accion = evento.accion || `${evento.tipo || 'Cambio'}: ${evento.estadoAnterior || ''} -> ${evento.estadoNuevo || ''}`;
      const dni = evento.dni || 'N/A';
      const motivo = evento.motivo ? `\nMotivo: ${evento.motivo}` : '';
      
      const fechaObj = new Date(timestamp);
      const fechaStr = `${fechaObj.toLocaleDateString()} a las ${fechaObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const fullAccion = accion + motivo;
      const accionLines = doc.splitTextToSize(fullAccion, 65);
      const etapaLines = doc.splitTextToSize(toTitleCase(etapa), 45);
      const fechaLines = doc.splitTextToSize(fechaStr, 25);
      
      const rowHeight = Math.max(10, accionLines.length * 5 + 4, etapaLines.length * 5 + 4, fechaLines.length * 5 + 4);

      // Draw cell border
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, yPos, maxWidth, rowHeight, 'S');

      // Add text
      doc.setTextColor(100, 100, 100);
      doc.text(fechaLines, margin + 5, yPos + 6);
      
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.text(etapaLines, margin + 35, yPos + 6);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(accionLines, margin + 85, yPos + 6);
      
      doc.setFont('helvetica', 'italic');
      doc.text(dni, margin + 155, yPos + 6);

      yPos += rowHeight;
    });
    yPos += 15;
  }
  
  // Gráfico Analítico de Tiempos
  if (historial && historial.length > 0) {
    const stageTimes = calculateTimePerStage(historial);
    if (stageTimes && stageTimes.length > 0) {
      // Calcular altura exacta (título + grafica + espacios)
      const chartRequiredHeight = 40 + (stageTimes.length * 20);
      checkNewPage(chartRequiredHeight + 20);

      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPos, maxWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('12. ANÁLISIS DE TIEMPOS DE SERVICIO', margin + 3, yPos + 5.5);
      yPos += 14;

      drawBarChart(doc, stageTimes, margin, yPos, maxWidth, 85);
      yPos += chartRequiredHeight; // Actualizar el cursor global para que el footer o siguientes elementos no se superpongan
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${totalPages} - Generado el ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF using custom blob approach to guarantee filename in all browsers
  try {
    const pdfBlob = doc.output('blob');
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Sanitize the OT number for the filename
    const safeOT = (orden.numeroOT || 'OT').replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `Informe_${safeOT}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Fallback saving method:', error);
    // Fallback to default jsPDF save
    const safeOT = (orden.numeroOT || 'OT').replace(/[^a-zA-Z0-9-]/g, '_');
    doc.save(`Informe_${safeOT}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}