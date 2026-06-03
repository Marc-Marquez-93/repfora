/**
 * Tools Definition
 *
 * Definición de tools/herramientas que el LLM puede usar
 * para obtener información que no es fácil de consultar con MongoDB directo.
 */

/**
 * Tools disponibles para el agente
 */
export const AVAILABLE_TOOLS = [
  {
    name: 'getInstructorReport',
    description: 'Obtiene un reporte detallado de horas trabajadas por un instructor en un rango de fechas específico. Usa este tool cuando la pregunta mencione horas en un mes específico o período de tiempo.',
    parameters: [
      {
        name: 'instructor',
        description: 'Nombre del instructor (ej: "Miguel Angel", "Juan Pérez")'
      },
      {
        name: 'fstart',
        description: 'Fecha de inicio en formato YYYY/MM/DD (ej: "2026/03/01")'
      },
      {
        name: 'fend',
        description: 'Fecha de fin en formato YYYY/MM/DD (ej: "2026/03/31")'
      }
    ],
    usage: 'Ideal para preguntas como: "¿Cuántas horas tiene Miguel Angel en marzo?", "Horas de instructor X en enero", etc.',
    endpoint: '/api/reports/instructor'
  }
];

/**
 * Obtiene un tool por nombre
 * @param {string} toolName - Nombre del tool
 * @returns {Object|null} - Definición del tool o null
 */
export function getToolByName(toolName) {
  return AVAILABLE_TOOLS.find(tool => tool.name === toolName) || null;
}

/**
 * Valida los parámetros de un tool
 * @param {string} toolName - Nombre del tool
 * @param {Object} parameters - Parámetros proporcionados
 * @returns {Object} - Objeto con validación y errores
 */
export function validateToolParameters(toolName, parameters) {
  const tool = getToolByName(toolName);

  if (!tool) {
    return {
      valid: false,
      errors: [`Tool "${toolName}" no existe`]
    };
  }

  const errors = [];

  for (const param of tool.parameters) {
    if (!parameters[param.name]) {
      errors.push(`Falta el parámetro requerido: ${param.name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  AVAILABLE_TOOLS,
  getToolByName,
  validateToolParameters
};
