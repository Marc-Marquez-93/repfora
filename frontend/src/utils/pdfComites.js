import { jsPDF } from "jspdf";

// Helper para formatear fechas a formato legible local
function formatearFecha(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Cargar imagen como Image object para jsPDF
function cargarImagenLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = "/images/logoComites.png";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Retorna null si falla, así no rompe el flujo del PDF
  });
}

// Estilos base institucionales
const VERDE_SENA = [49, 131, 53]; // RGB #318335
const NEGRO_TEXTO = [33, 37, 41];
const GRIS_TEXTO = [108, 117, 125];
const GRIS_FONDO = [248, 249, 250];

// Generar cabecera institucional
function dibujarCabecera(doc, logoImg, tituloDoc, fichaInfo) {
  // Línea verde superior
  doc.setFillColor(...VERDE_SENA);
  doc.rect(0, 0, 210, 8, "F");

  // Logo SENA
  if (logoImg) {
    doc.addImage(logoImg, "PNG", 15, 12, 24, 24);
  }

  // Textos Cabecera
  doc.setTextColor(...NEGRO_TEXTO);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SERVICIO NACIONAL DE APRENDIZAJE - SENA", 45, 18);
  doc.setFontSize(11);
  doc.setFont("Helvetica", "normal");
  doc.text("SUBDIRECCIÓN DE CENTRO - COMITÉ DE EVALUACIÓN Y SEGUIMIENTO", 45, 23);
  
  doc.setFont("Helvetica", "bold");
  doc.text(tituloDoc.toUpperCase(), 45, 29);
  
  if (fichaInfo) {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Ficha: ${fichaInfo.number} | Programa: ${fichaInfo.program}`, 45, 34);
  }

  // Línea divisora inferior de cabecera
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);
}

// Dibujar pie de página
function dibujarPiePagina(doc, numPagina) {
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.5);
  doc.line(15, 280, 195, 280);

  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text("COMITES - Sistema de Gestión Académica SENA. Documento Confidencial.", 15, 285);
  doc.text(`Página ${numPagina}`, 185, 285);
}

// ==================== 1. ORDEN DEL DIA ====================
export async function generarOrdenDelDia(comite) {
  const doc = new jsPDF();
  const logo = await cargarImagenLogo();

  const fichaInfo = {
    number: comite.fiche?.number || "N/A",
    program: comite.fiche?.program?.name || "N/A"
  };

  dibujarCabecera(doc, logo, "DOCUMENTO DE ORDEN DEL DÍA", fichaInfo);

  let y = 46;

  // 1. Datos Generales de la Reunión
  doc.setFillColor(...GRIS_FONDO);
  doc.rect(15, y, 180, 28, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("1. DATOS GENERALES DE LA REUNIÓN", 18, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(...NEGRO_TEXTO);
  doc.setFont("Helvetica", "normal");
  doc.text(`Fecha de Reunión: ${formatearFecha(comite.meetingDate)}`, 18, y + 13);
  doc.text(`Hora de Reunión: ${comite.meetingTime || "N/A"}`, 18, y + 19);
  doc.text(`Lugar / Enlace: ${comite.meetingLocation || "N/A"}`, 18, y + 25);

  y += 34;

  // 2. Objeto del Comité
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("2. OBJETO DE LA SESIÓN", 15, y);
  
  y += 5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NEGRO_TEXTO);
  const objetoTexto = "Analizar el reporte de novedades y evaluar el desempeño y conducta de los aprendices citados con base en el reglamento del aprendiz SENA.";
  const linesObjeto = doc.splitTextToSize(objetoTexto, 180);
  doc.text(linesObjeto, 15, y);

  y += (linesObjeto.length * 5) + 5;

  // 3. Aprendices Citados a Descargos
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("3. APRENDICES CITADOS A DESCARGOS", 15, y);

  y += 4;
  // Dibujar Encabezado de Tabla
  doc.setFillColor(...VERDE_SENA);
  doc.rect(15, y, 180, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Aprendiz", 17, y + 5);
  doc.text("Documento", 80, y + 5);
  doc.text("Novedad", 118, y + 5);
  doc.text("Reglamento / Artículo", 148, y + 5);

  y += 7;
  doc.setTextColor(...NEGRO_TEXTO);
  doc.setFont("Helvetica", "normal");

  (comite.learners || []).forEach((learner) => {
    // Dibujar fondo alternado o línea inferior
    doc.setDrawColor(240, 240, 240);
    const rglLines = doc.splitTextToSize(learner.manual || "N/A", 50);
    const rowHeight = Math.max(9, rglLines.length * 5);
    doc.line(15, y + rowHeight, 195, y + rowHeight);

    const nameLines = doc.splitTextToSize(learner.name || "N/A", 60);
    doc.text(nameLines, 17, y + 5);
    doc.text(`${learner.documentType || "CC"}`, 80, y + 5);
    doc.text(`${learner.documentNumber || "N/A"}`, 80, y + 9);
    
    const novText = learner.noveltyType === "ACADEMIC" ? "Académica" : learner.noveltyType === "DISCIPLINARY" ? "Disciplinaria" : "Los dos tipos";
    doc.text(novText, 118, y + 5);

    doc.text(rglLines, 148, y + 5);

    y += rowHeight + 1;
  });

  y += 6;

  // 4. Temas del Orden del Día
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("4. TEMAS DEL ORDEN DEL DÍA", 15, y);

  y += 5;
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(...NEGRO_TEXTO);
  doc.setFontSize(9);
  const temas = [
    "1. Saludo, verificación de quórum y apertura de la sesión.",
    "2. Lectura y aprobación del orden del día propuesto.",
    "3. Presentación del informe de los hechos por los instructores solicitantes.",
    "4. Intervención, descargos y presentación de pruebas por parte de los aprendices citados.",
    "5. Intervención de Bienestar al Aprendiz y Voceros de ficha.",
    "6. Deliberación, evaluación pedagógica y toma de decisiones del comité.",
    "7. Lectura de conclusiones y cierre de la sesión."
  ];
  temas.forEach((tema) => {
    doc.text(tema, 18, y);
    y += 5;
  });

  y += 5;

  // 5. Quórum de Asistencia
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("5. QUÓRUM DE ASISTENCIA CONVOCADO", 15, y);

  y += 5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO_TEXTO);
  
  const quorum = [];
  if (comite.meetingCoordinador?.name) quorum.push(`Coordinador: ${comite.meetingCoordinador.name}`);
  if (comite.meetingBienestar?.name) quorum.push(`Bienestar: ${comite.meetingBienestar.name}`);
  if (comite.meetingNovedades?.name) quorum.push(`Apoyo Novedades: ${comite.meetingNovedades.name}`);
  if (comite.meetingVocero) quorum.push(`Vocero: ${comite.meetingVocero}`);
  if (comite.meetingRepresentante) quorum.push(`Representante: ${comite.meetingRepresentante}`);
  
  (comite.requestingInstructors || []).forEach((inst) => {
    quorum.push(`Instructor: ${inst.name}`);
  });

  // Dividir el quórum en dos columnas para ahorrar espacio
  for (let i = 0; i < quorum.length; i += 2) {
    const col1Lines = doc.splitTextToSize(`• ${quorum[i]}`, 82);
    doc.text(col1Lines, 18, y);
    if (quorum[i+1]) {
      const col2Lines = doc.splitTextToSize(`• ${quorum[i+1]}`, 82);
      doc.text(col2Lines, 105, y);
    }
    y += 5.5;
  }

  // Dibujar pie de página en página 1
  dibujarPiePagina(doc, 1);

  // Nombre de archivo/pestaña más corto y limpio
  const fechaLimpia = comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : 'sin-fecha';
  doc.setProperties({
    title: `comite_${fichaInfo.number}_${fechaLimpia}_Agenda`
  });

  // Abrir en nueva pestaña
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
}


// ==================== 2. ACTA DE CIERRE ====================
export async function generarActaCierre(comite) {
  const doc = new jsPDF();
  const logo = await cargarImagenLogo();

  const fichaInfo = {
    number: comite.fiche?.number || "N/A",
    program: comite.fiche?.program?.name || "N/A"
  };

  dibujarCabecera(doc, logo, "ACTA DE EVALUACIÓN Y CIERRE", fichaInfo);

  let y = 46;

  // 1. Datos Generales de la Sesión
  doc.setFillColor(...GRIS_FONDO);
  doc.rect(15, y, 180, 28, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("1. DATOS GENERALES DE LA SESIÓN DE CIERRE", 18, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(...NEGRO_TEXTO);
  doc.setFont("Helvetica", "normal");
  doc.text(`Fecha del Comité: ${formatearFecha(comite.meetingDate)}`, 18, y + 13);
  doc.text(`Hora: ${comite.meetingTime || "N/A"}`, 18, y + 19);
  doc.text(`Lugar / Enlace: ${comite.meetingLocation || "N/A"}`, 18, y + 25);

  y += 34;

  // 2. Miembros del Comité Presentes (Quórum)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("2. QUÓRUM DE ASISTENCIA Y FIRMANTES", 15, y);

  y += 5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO_TEXTO);
  
  const quorum = [];
  if (comite.meetingCoordinador?.name) quorum.push(`Coordinador: ${comite.meetingCoordinador.name}`);
  if (comite.meetingBienestar?.name) quorum.push(`Bienestar: ${comite.meetingBienestar.name}`);
  if (comite.meetingNovedades?.name) quorum.push(`Apoyo Novedades: ${comite.meetingNovedades.name}`);
  if (comite.meetingVocero) quorum.push(`Vocero: ${comite.meetingVocero}`);
  if (comite.meetingRepresentante) quorum.push(`Representante: ${comite.meetingRepresentante}`);
  (comite.requestingInstructors || []).forEach((inst) => {
    quorum.push(`Instructor: ${inst.name}`);
  });

  // Dividir el quórum en dos columnas
  for (let i = 0; i < quorum.length; i += 2) {
    const col1Lines = doc.splitTextToSize(`• ${quorum[i]}`, 82);
    doc.text(col1Lines, 18, y);
    if (quorum[i+1]) {
      const col2Lines = doc.splitTextToSize(`• ${quorum[i+1]}`, 82);
      doc.text(col2Lines, 105, y);
    }
    y += 5.5;
  }

  y += 4;

  // 3. Decisiones y Sanciones por Aprendiz
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_SENA);
  doc.text("3. EVALUACIÓN INDIVIDUAL Y DICTAMEN DE SANCIONES", 15, y);

  y += 5;
  
  (comite.learners || []).forEach((learner, index) => {
    // Verificar si nos pasamos de página
    if (y > 230) {
      dibujarPiePagina(doc, 1);
      doc.addPage();
      dibujarCabecera(doc, logo, "ACTA DE EVALUACIÓN Y CIERRE (CONTINUACIÓN)", fichaInfo);
      y = 46;
    }

    doc.setFillColor(...GRIS_FONDO);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...VERDE_SENA);
    doc.text(`${index + 1}. APRENDIZ: ${learner.name}`, 18, y + 6);
    y += 11;

    doc.setTextColor(...NEGRO_TEXTO);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Identificación: ${learner.documentType || "CC"} ${learner.documentNumber || "N/A"}`, 18, y);
    
    const severidadLabel = (learner.severidad === "LIGHT" || learner.severidad === "LEVE") ? "Leve" : 
                           (learner.severidad === "SERIOUS" || learner.severidad === "GRAVE") ? "Grave" : 
                           (learner.severidad === "VERY_SERIOUS" || learner.severidad === "GRAVISIMA") ? "Muy Grave" : "Pendiente";
    doc.text(`Severidad de la Falta: ${severidadLabel}`, 105, y);
    y += 5.5;

    // Decisiones tomadas
    const decisionesLabels = (learner.decisiones || []).map(d => {
      if (d === "PLAN_DE_MEJORAMIENTO" || d === "PLAN_MEJORAMIENTO") return "Plan de Mejoramiento";
      if (d === "LLAMADO_DE_ATENCION" || d === "LLAMADO_ATENCION") return "Llamado de Atención";
      if (d === "CONDICIONAMIENTO_DE_MATRICULA" || d === "CONDICIONAMIENTO") return "Condicionamiento de Matrícula";
      if (d === "CANCELACION_DE_MATRICULA" || d === "CANCELACION") return "Cancelación de Matrícula";
      return d;
    });
    doc.setFont("Helvetica", "bold");
    doc.text(`Decisión(es) Adoptada(s): ${decisionesLabels.join(", ") || "Ninguna"}`, 18, y);
    doc.setFont("Helvetica", "normal");
    y += 6;

    // Si tiene Plan de mejoramiento, detallar instructores asignados
    if (learner.decisiones?.includes("PLAN_MEJORAMIENTO") && learner.planesMejoramiento) {
      doc.setFont("Helvetica", "bold");
      doc.text("Detalles de Plan de Mejoramiento:", 18, y);
      doc.setFont("Helvetica", "normal");
      y += 5;
      
      learner.planesMejoramiento.forEach(p => {
        doc.text(`- Instructor: ${p.instructorName || "N/A"} | Límite: ${p.fechaMaxima || "N/A"}`, 22, y);
        y += 4.5;
        const descLines = doc.splitTextToSize(`Descripción: ${p.descripcion || "N/A"}`, 160);
        doc.text(descLines, 22, y);
        y += (descLines.length * 4.5);
      });
      y += 2;
    }

    // Si tiene Condicionamiento o Cancelación, detallar datos de resolución
    if (learner.decisiones?.some(d => d.includes("CONDICIONAMIENTO") || d.includes("CANCELACION"))) {
      doc.setFont("Helvetica", "bold");
      doc.text("Información de la Resolución:", 18, y);
      doc.setFont("Helvetica", "normal");
      y += 5;

      if (learner.resolucionDespues) {
        doc.text("- La resolución será redactada y adjuntada posteriormente en el Módulo de Gestión de Aprendices.", 22, y);
        y += 5;
      } else {
        doc.text(`- Número de Resolución: ${learner.resolucionNumero || "N/A"}`, 22, y);
        doc.text(`- Fecha de Resolución: ${learner.resolucionFecha || "N/A"}`, 105, y);
        y += 5;
      }
    }

    // Conclusiones generales del caso
    if (learner.conclusions) {
      doc.setFont("Helvetica", "bold");
      doc.text("Conclusiones/Observaciones:", 18, y);
      doc.setFont("Helvetica", "normal");
      y += 5;
      const concLines = doc.splitTextToSize(learner.conclusions, 170);
      doc.text(concLines, 18, y);
      y += (concLines.length * 4.5) + 3;
    }

    y += 4; // Separador entre aprendices
  });

  // Dibujar pie de página en la última página
  dibujarPiePagina(doc, doc.internal.getNumberOfPages());

  // Nombre de archivo/pestaña más corto y limpio
  const fechaLimpia = comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : 'sin-fecha';
  doc.setProperties({
    title: `comite_${fichaInfo.number}_${fechaLimpia}_Final`
  });

  // Abrir en nueva pestaña
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
}
