/**
 * ResponsePrompt
 *
 * Prompts para que el LLM genere respuestas en lenguaje natural
 * a partir de los resultados de consultas de MongoDB.
 */

/**
 * Prompt para generar respuesta en lenguaje natural
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {Array} results - Resultados de la consulta
 * @param {Object} queryInfo - Información de la consulta ejecutada
 * @returns {string} - Prompt completo
 */
export function generateResponsePrompt(userQuestion, results, queryInfo) {
  const resultsCount = results.length;
  const hasResults = resultsCount > 0;
  const currentYear = new Date().getFullYear();

  // DEBUG: Mostrar qué año se está usando
  console.log('\n🔍 [DEBUG] generateResponsePrompt:');
  console.log('   Año actual inyectado:', currentYear);
  console.log('   Pregunta usuario:', userQuestion);
  console.log('   Cantidad resultados:', resultsCount);

  return `Eres un asistente útil que responde preguntas en español basándose en datos de una base de datos.

# INFORMACIÓN TEMPORAL IMPORTANTE:
- **Año actual**: ${currentYear}
- Cuando generes respuestas que mencionen fechas o años, usar ${currentYear} como referencia si el usuario no especificó otro año

# Pregunta del Usuario:
"${userQuestion}"

# Información de la Consulta Ejecutada:
- Colección: ${queryInfo.collection}
- Operación: ${queryInfo.operation}
- Explicación: ${queryInfo.explanation || 'N/A'}

# Resultados Obtenidos:
${hasResults ? formatResults(results) : 'No se encontraron resultados.'}

Total de resultados: ${resultsCount}

# Instrucciones:

1. **GENERAR UNA RESPUESTA NATURAL EN ESPAÑOL** que responda directamente a la pregunta del usuario usando los resultados obtenidos.

2. **ESTRUCTURA DE LA RESPUESTA**:
   - Si hay muchos resultados (más de 10), proporciona un resumen general y muestra los 5-10 más relevantes
   - Si hay pocos resultados (1-10), muéstralos todos de forma clara
   - Si no hay resultados, explica qué significa y sugiere alternativas

3. **FORMATO DE LOS RESULTADOS**:
   - Para listas: usa formato de lista con viñetas o numeración
   - Para objetos individuales: presenta la información de forma estructurada
   - Para estadísticas/agregaciones: presenta los números de forma clara con contexto

4. **IDOMA Y TONO**:
   - Usa español natural y conversacional
   - Sé conciso pero informativo
   - Adapta el nivel de detalle según la cantidad de resultados
   - Usa un tono profesional pero accesible

5. **CONSIDERACIONES ESPECIALES**:
   - Si hay campos de fecha, preséntalos en formato legible (DD/MM/YYYY)
   - Si la pregunta mencionaba "este año" o "la actualidad", usar ${currentYear} en la respuesta
   - Si hay IDs o referencias, no los muestres a menos que sean relevantes
   - Si hay campos numéricos de estado, explica su significado si es relevante
   - Para resultados vacíos, explica por qué podría suceder (no hay datos, la consulta fue muy específica, etc.)

# Ejemplos de Buenas Respuestas:

Pregunta: "¿Cuántos instructores hay?"
Resultados: [{_id: "...", name: "Juan Pérez", ...}, ...] (25 resultados)
Respuesta: "Hay **25 instructores** en el sistema. Algunos de ellos son: Juan Pérez, María García, Carlos López..."

Pregunta: "Buscar programas de análisis de sistemas"
Resultados: []
Respuesta: "No encontré programas que coincidan con 'análisis de sistemas'. Esto podría deberse a que: 1) No existe un programa con ese nombre exacto, 2) El nombre podría estar escrito de forma diferente. ¿Quieres que busque con términos más generales como 'análisis' o 'sistemas'?"

Pregunta: "Listar los últimos 5 horarios creados"
Resultados: [...] (5 resultados)
Respuesta: "Aquí están los **5 horarios más recientes**:
1. Horario del programa ADSO - Ficha 2567890 (creado el 15/03/2026)
2. Horario del programa Contabilidad - Ficha 1234567 (creado el 14/03/2026)
..."

Ahora, genera la respuesta para la pregunta del usuario.

IMPORTANTE:
- Responde directamente en español, sin preámbulos como "Aquí tienes la respuesta"
- Usa formato markdown para mejorar la legibilidad (**negritas**, listas, etc.)
- Sé natural y conversacional
- Adapta el formato según el tipo y cantidad de resultados
`;
}

/**
 * Formatea los resultados para presentarlos en el prompt
 * @param {Array} results - Resultados de la consulta
 * @param {number} maxResults - Máximo de resultados a mostrar (default: 20)
 * @returns {string} - Resultados formateados
 */
function formatResults(results, maxResults = 20) {
  if (!results || results.length === 0) {
    return 'Sin resultados.';
  }

  const resultsToShow = results.slice(0, maxResults);
  const hasMore = results.length > maxResults;

  let formatted = '';

  if (resultsToShow.length === 1) {
    // Un solo resultado
    const result = resultsToShow[0];
    formatted = JSON.stringify(result, null, 2);
  } else if (resultsToShow.length <= 5) {
    // Pocos resultados, mostrar todos completos
    formatted = resultsToShow.map((r, i) =>
      `${i + 1}. ${JSON.stringify(r, null, 2)}`
    ).join('\n\n');
  } else {
    // Muchos resultados, mostrar versión simplificada
    formatted = resultsToShow.map((r, i) => {
      const simplified = simplifyResult(r);
      return `${i + 1}. ${JSON.stringify(simplified)}`;
    }).join('\n');
  }

  if (hasMore) {
    formatted += `\n\n... y ${results.length - maxResults} resultados más.`;
  }

  return formatted;
}

/**
 * Simplifica un resultado para mostrar solo los campos más importantes
 * @param {Object} result - Resultado de MongoDB
 * @returns {Object} - Resultado simplificado
 */
function simplifyResult(result) {
  // Campos que generalmente no son relevantes para el usuario final
  const ignoreFields = ['_id', '__v', 'password', 'createdAt', 'updatedAt'];

  const simplified = {};

  for (const [key, value] of Object.entries(result)) {
    if (!ignoreFields.includes(key)) {
      // Si el valor es un objeto o array complejo, simplificarlo
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.constructor.name === 'ObjectId') {
          simplified[key] = '[ID]';
        } else {
          simplified[key] = '[Objeto]';
        }
      } else if (Array.isArray(value) && value.length > 3) {
        simplified[key] = `[${value.length} elementos]`;
      } else {
        simplified[key] = value;
      }
    }
  }

  // Si no quedó nada útil, mostrar algunos campos básicos
  if (Object.keys(simplified).length === 0) {
    for (const key of Object.keys(result)) {
      if (!ignoreFields.includes(key)) {
        simplified[key] = result[key];
        if (Object.keys(simplified).length >= 3) break;
      }
    }
  }

  return simplified;
}

/**
 * Prompt para manejar errores de consulta
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {string} errorDetails - Detalles del error
 * @returns {string} - Prompt para manejo de errores
 */
export function generateErrorResponsePrompt(userQuestion, errorDetails) {
  return `Eres un asistente útil que explica errores de consultas de base de datos en español.

# Pregunta del Usuario:
"${userQuestion}"

# Error que Ocurrió:
${errorDetails}

# Instrucciones:

Genera una respuesta en español que:
1. Explique de forma sencilla qué salió mal
2. Sugiera posibles correcciones o alternativas
3. Mantenga un tono constructivo y útil

Evita:
- Mensajes de error técnicos crudos
- Culpar al usuario
- Ser demasiado técnico

Genera una respuesta natural y útil en español.
`;
}

export {
  formatResults,
  simplifyResult
};
