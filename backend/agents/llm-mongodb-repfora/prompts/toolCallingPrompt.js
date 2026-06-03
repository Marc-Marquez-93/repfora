/**
 * ToolCallingPrompt
 *
 * Prompts para que el LLM decida cuándo usar tools vs generar queries MongoDB directas.
 */

/**
 * Genera el prompt para decidir si usar tool calling
 * @param {string} userQuestion - Pregunta del usuario
 * @param {string} schemaContext - Contexto de esquemas
 * @param {Array} availableTools - Tools disponibles
 * @returns {string} - Prompt completo
 */
export function generateToolDecisionPrompt(userQuestion, schemaContext, availableTools) {
  const toolsDescription = availableTools.map(tool => {
    return `
**${tool.name}**: ${tool.description}
Parámetros:
${tool.parameters.map(param => `  - ${param.name}: ${param.description}`).join('\n')}
Uso: ${tool.usage}
`;
  }).join('\n');

  // Año actual
  const currentYear = new Date().getFullYear();

  return `Eres un asistente inteligente que decide cuándo usar tools especiales vs generar consultas MongoDB directas.

# CONTEXTO DE LA BASE DE DATOS

${schemaContext}

# INFORMACIÓN TEMPORAL IMPORTANTE

- **Año actual**: ${currentYear}
- Cuando el usuario NO especifique el año, asumir el año actual (${currentYear})
- Ejemplo: "en marzo" → asumir ${currentYear}-03-01 a ${currentYear}-03-31

# TOOLS DISPONIBLES

${toolsDescription}

# INSTRUCCIONES

Analiza la siguiente pregunta del usuario y determina:

1. **¿Requiere cálculo de horas por un mes específico?**
   - Si menciona un mes específico (enero, febrero, marzo, etc.) con horas
   - Si pregunta por horas "en" un período de tiempo
   - Si necesita desglose de horas por mes
   - → USA TOOL: getInstructorReport

2. **¿Es una consulta simple que se puede resolver con MongoDB directo?**
   - Listar instructores, fichas, programas
   - Buscar por nombre, documento, estado
   - Contar documentos
   - Horas libres/ocupadas (acumulativo total)
   - → USA MONGODB QUERY (genera la query normalmente)

# Pregunta del Usuario:

"${userQuestion}"

# Formato de Respuesta:

Responde ÚNICAMENTE con un objeto JSON que tenga esta estructura exacta:

Si necesita TOOL:
{
  "useTool": true,
  "tool": "nombre_del_tool",
  "parameters": {
    "instructor": "nombre del instructor",
    "fstart": "YYYY/MM/DD",  // USAR AÑO ACTUAL (${currentYear}) SI NO SE ESPECIFICA
    "fend": "YYYY/MM/DD"      // USAR AÑO ACTUAL (${currentYear}) SI NO SE ESPECIFICA
  },
  "reasoning": "explicación de por qué usar este tool"
}

Si es MONGODB QUERY:
{
  "useTool": false,
  "reasoning": "explicación de por qué usar MongoDB directo"
}

IMPORTANTE:
- Si el usuario NO menciona el año, usar ${currentYear} (año actual)
- Para un mes específico, usar el primer y último día del mes
- Responde SOLO con el objeto JSON, sin texto adicional, sin markdown.
`;
}

/**
 * Genera el prompt para interpretar resultados de tool y generar respuesta natural
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {string} toolName - Tool que se usó
 * @param {Object} toolResults - Resultados del tool
 * @returns {string} - Prompt para generar respuesta
 */
export function generateToolResponsePrompt(userQuestion, toolName, toolResults) {
  return `Eres un asistente que genera respuestas en lenguaje natural basado en resultados de tools.

# Pregunta Original del Usuario:

"${userQuestion}"

# Tool Utilizado:

${toolName}

# Resultados del Tool:

${JSON.stringify(toolResults, null, 2)}

# Instrucciones:

Genera una respuesta en lenguaje natural que:

1. Responda directamente la pregunta del usuario
2. Use los datos proporcionados en los resultados
3. Sea clara, concisa y en español
4. **Redondea las horas a 2 decimales máximo** (ej: 157.20, no 157.2)
5. Incluya números relevantes (horas, fechas, cantidades)
6. Formatee la información de manera legible

Para getInstructorReport:
- Mencionar el nombre del instructor
- Desglosar horas por mes si hay múltiples meses
- Indicar horas de formación vs otras actividades (redondeadas a 2 decimales)
- Sumar el total de horas (formación + otras)
- Si hay muchos eventos, resumir en lugar de listar todos

Ejemplos de formato de horas:
- ✅ "trabajó 157.20 horas en marzo"
- ✅ "314.40 horas de formación y 0.00 horas de otras actividades"
- ❌ "trabajó 157.2 horas" (falta el cero)

# Respuesta:

Genera una respuesta natural en español. NO uses JSON, NO usas markdown.
Solo responde en texto natural conversacional.
`;
}

export default {
  generateToolDecisionPrompt,
  generateToolResponsePrompt
};
