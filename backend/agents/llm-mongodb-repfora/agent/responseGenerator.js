/**
 * ResponseGenerator
 *
 * Genera respuestas en lenguaje natural (español) a partir de
 * los resultados de consultas de MongoDB usando Gemini Flash 2.5.
 */

import { getGeminiClient } from '../../../services/gemini/index.js';
import { generateResponsePrompt, generateErrorResponsePrompt } from '../prompts/responsePrompt.js';

/**
 * Genera una respuesta en lenguaje natural a partir de resultados
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {Array} results - Resultados de la consulta
 * @param {Object} queryInfo - Información de la consulta ejecutada
 * @returns {Promise<string>} - Respuesta en lenguaje natural
 */
async function generateResponse(userQuestion, results, queryInfo) {
  try {
    console.log('💬 Generando respuesta en lenguaje natural...');

    // DEBUG: Mostrar información de la consulta
    console.log('\n🔍 [DEBUG] Información de la consulta:');
    console.log('   Pregunta usuario:', userQuestion);
    console.log('   Colección:', queryInfo.collection);
    console.log('   Operación:', queryInfo.operation);
    console.log('   Explicación:', queryInfo.explanation);

    // DEBUG: Mostrar resultados
    console.log('\n🔍 [DEBUG] Resultados obtenidos:');
    console.log('   Cantidad:', results.length);
    if (results.length > 0) {
      console.log('   Primer resultado (muestra):', JSON.stringify(results[0], null, 2));
      if (results.length > 1) {
        console.log('   Segundo resultado (muestra):', JSON.stringify(results[1], null, 2));
      }
    } else {
      console.log('   ⚠️  NO HAY RESULTADOS');
    }

    // Obtener cliente de Gemini (con rate limiting y rotación automáticas)
    const geminiClient = await getGeminiClient();

    // Generar prompt
    const prompt = generateResponsePrompt(userQuestion, results, queryInfo);

    // DEBUG: Mostrar el prompt generado
    console.log('\n🔍 [DEBUG] Prompt generado (primeras 500 caracteres):');
    console.log(prompt.substring(0, 500) + '...');

    // Llamar a la API
    console.log('📡 Enviando solicitud a Gemini para generar respuesta...');
    const response = await geminiClient.generateText(prompt);

    console.log('✅ Respuesta generada exitosamente');

    // DEBUG: Mostrar respuesta generada
    console.log('\n🔍 [DEBUG] Respuesta generada:');
    console.log(response);

    return response;
  } catch (error) {
    console.error('❌ Error generando respuesta:', error);

    // Fallback: generar una respuesta simple sin LLM
    return generateFallbackResponse(userQuestion, results, queryInfo);
  }
}

/**
 * Genera una respuesta de error en lenguaje natural
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {string} errorDetails - Detalles del error
 * @returns {Promise<string>} - Respuesta de error en lenguaje natural
 */
async function generateErrorResponse(userQuestion, errorDetails) {
  try {
    console.log('💬 Generando respuesta de error...');

    // Obtener cliente de Gemini (con rate limiting y rotación automáticas)
    const geminiClient = await getGeminiClient();

    // Generar prompt de error
    const prompt = generateErrorResponsePrompt(userQuestion, errorDetails);

    // Llamar a la API
    const response = await geminiClient.generateText(prompt);

    console.log('✅ Respuesta de error generada');

    return response;
  } catch (error) {
    console.error('❌ Error generando respuesta de error:', error);
    return generateFallbackErrorResponse(errorDetails);
  }
}

/**
 * Genera una respuesta simple sin usar LLM (fallback)
 * @param {string} userQuestion - Pregunta del usuario
 * @param {Array} results - Resultados de la consulta
 * @param {Object} queryInfo - Información de la consulta
 * @returns {string} - Respuesta simple
 */
function generateFallbackResponse(userQuestion, results, queryInfo) {
  const count = results.length;

  if (count === 0) {
    return `No encontré resultados para tu pregunta: "${userQuestion}".\n\n` +
           `Esto podría deberse a que:\n` +
           `- No existen datos que coincidan con tu búsqueda\n` +
           `- Los términos de búsqueda son muy específicos\n\n` +
           `¿Puedes intentar con otros términos o ser más específico?`;
  }

  let response = `Encontré **${count} resultado${count === 1 ? '' : 's'}** para tu pregunta.\n\n`;

  if (count <= 5) {
    response += `Aquí están los resultados:\n\n`;
    results.forEach((result, index) => {
      response += `${index + 1}. ${formatSimpleResult(result)}\n\n`;
    });
  } else {
    response += `**Primeros 5 resultados:**\n\n`;
    results.slice(0, 5).forEach((result, index) => {
      response += `${index + 1}. ${formatSimpleResult(result)}\n\n`;
    });
    response += `... y ${count - 5} resultados más.`;
  }

  return response;
}

/**
 * Genera una respuesta de error simple (fallback)
 * @param {string} errorDetails - Detalles del error
 * @returns {string} - Respuesta de error simple
 */
function generateFallbackErrorResponse(errorDetails) {
  return `Lo siento, ocurrió un error al procesar tu pregunta.\n\n` +
         `**Error:** ${errorDetails}\n\n` +
         `Por favor, intenta:\n` +
         `1. Reformular tu pregunta de otra manera\n` +
         `2. Ser más específico en tu consulta\n` +
         `3. Verificar que los términos sean correctos`;
}

/**
 * Formatea un resultado de forma simple para el fallback
 * @param {Object} result - Resultado de MongoDB
 * @returns {string} - Resultado formateado
 */
function formatSimpleResult(result) {
  // Campos importantes para mostrar
  const importantFields = [
    'name', 'fullName', 'code', 'number', 'ficheNumber',
    'email', 'phone', 'status', 'program'
  ];

  const parts = [];

  for (const field of importantFields) {
    if (result[field] !== undefined && result[field] !== null) {
      parts.push(`${field}: ${result[field]}`);
    }
  }

  if (parts.length === 0) {
    // Si no hay campos importantes, mostrar los primeros 3 campos
    let count = 0;
    for (const [key, value] of Object.entries(result)) {
      if (!key.startsWith('_') && key !== '__v' && count < 3) {
        parts.push(`${key}: ${value}`);
        count++;
      }
    }
  }

  return parts.join(' | ') || JSON.stringify(result);
}

/**
 * Genera una respuesta directamente (wrapper rápido)
 * @param {string} userQuestion - Pregunta del usuario
 * @param {Array} results - Resultados de la consulta
 * @param {Object} queryInfo - Información de la consulta
 * @param {boolean} useLLM - Si es true, usa LLM; si no, usa fallback
 * @returns {Promise<string>} - Respuesta en lenguaje natural
 */
async function generateNaturalResponse(
  userQuestion,
  results,
  queryInfo,
  useLLM = true
) {
  if (useLLM) {
    return await generateResponse(userQuestion, results, queryInfo);
  } else {
    return generateFallbackResponse(userQuestion, results, queryInfo);
  }
}

export {
  generateResponse,
  generateErrorResponse,
  generateNaturalResponse,
  generateFallbackResponse
};
