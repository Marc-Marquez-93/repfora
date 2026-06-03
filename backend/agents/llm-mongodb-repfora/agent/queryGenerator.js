/**
 * QueryGenerator
 *
 * Convierte preguntas en lenguaje natural (español) a consultas de MongoDB
 * usando Gemini Flash 2.5 y el contexto de los esquemas.
 */

import { getGeminiClient } from '../../../services/gemini/index.js';
import { extractAllSchemas, generateTextSummary } from '../context/schemaExtractor.js';
import { generateQueryPrompt, generateRefinementPrompt } from '../prompts/queryPrompt.js';

/**
 * Limpia y parsea la respuesta del LLM para obtener el JSON
 * @param {string} response - Respuesta del LLM
 * @returns {Object} - Objeto JSON parseado
 */
function parseLLMResponse(response) {
  let cleaned = response.trim();

  // Eliminar marcadores de código si existen
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');

  // Eliminar comentarios de una línea (// comentario)
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\n\/\/.*$/gm, '');

  // Eliminar comentarios multilínea (/* comentario */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Eliminar líneas en blanco
  cleaned = cleaned.replace(/^\s*[\r\n]/gm, '');

  // Eliminar texto antes del primer { o después del último }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`No se pudo parsear la respuesta como JSON: ${error.message}. Respuesta: ${cleaned}`);
  }
}

/**
 * Genera una consulta de MongoDB a partir de una pregunta en español
 * @param {string} userQuestion - Pregunta del usuario en español
 * @param {Object} schemasCache - Cache de esquemas (opcional)
 * @returns {Promise<Object>} - Objeto con la consulta generada
 */
async function generateQuery(userQuestion, schemasCache = null) {
  try {
    console.log('🤖 Generando consulta para pregunta:', userQuestion);

    // Obtener contexto de esquemas
    let schemasInfo;
    if (schemasCache) {
      schemasInfo = schemasCache;
    } else {
      schemasInfo = await extractAllSchemas();
    }

    const schemaContext = generateTextSummary(schemasInfo);

    // Obtener cliente de Gemini (con rate limiting y rotación automáticas)
    const geminiClient = await getGeminiClient();

    // Generar prompt
    const prompt = generateQueryPrompt(userQuestion, schemaContext);

    // DEBUG: Mostrar prompt generado
    console.log('\n🔍 [DEBUG] Prompt generado (primeras 500 caracteres):');
    console.log(prompt.substring(0, 500) + '...');

    // Llamar a la API
    console.log('📡 Enviando solicitud a Gemini...');
    const response = await geminiClient.generateText(prompt);

    console.log('📥 Respuesta recibida de Gemini');

    // DEBUG: Mostrar respuesta cruda
    console.log('\n🔍 [DEBUG] Respuesta cruda de Gemini:');
    console.log(response);

    // Parsear respuesta
    const queryObject = parseLLMResponse(response);

    console.log('✅ Consulta generada exitosamente');
    console.log(`   Colección: ${queryObject.collection}`);
    console.log(`   Operación: ${queryObject.operation}`);
    console.log(`   Explicación: ${queryObject.explanation}`);

    // DEBUG: Mostrar la query parseada
    console.log('\n🔍 [DEBUG] Query parseada completa:');
    console.log(JSON.stringify(queryObject, null, 2));

    return queryObject;
  } catch (error) {
    console.error('❌ Error generando consulta:', error);
    throw error;
  }
}

/**
 * Refina una consulta que falló anteriormente
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {Object} previousQuery - Consulta anterior que falló
 * @param {string} errorMessage - Mensaje de error de MongoDB
 * @param {Object} schemasCache - Cache de esquemas (opcional)
 * @returns {Promise<Object>} - Objeto con la consulta refinada
 */
async function refineQuery(userQuestion, previousQuery, errorMessage, schemasCache = null) {
  try {
    console.log('🔧 Refinando consulta...');
    console.log('❌ Error anterior:', errorMessage);

    // Obtener contexto de esquemas
    let schemasInfo;
    if (schemasCache) {
      schemasInfo = schemasCache;
    } else {
      schemasInfo = await extractAllSchemas();
    }

    const schemaContext = generateTextSummary(schemasInfo);

    // Obtener cliente de Gemini (con rate limiting y rotación automáticas)
    const geminiClient = await getGeminiClient();

    // Generar prompt de refinamiento
    const prompt = generateRefinementPrompt(
      userQuestion,
      previousQuery,
      errorMessage,
      schemaContext
    );

    // Llamar a la API
    console.log('📡 Enviando solicitud de refinamiento a Gemini...');
    const response = await geminiClient.generateText(prompt);

    console.log('📥 Respuesta recibida de Gemini');

    // Parsear respuesta
    const queryObject = parseLLMResponse(response);

    console.log('✅ Consulta refinada exitosamente');
    console.log(`   Colección: ${queryObject.collection}`);
    console.log(`   Operación: ${queryObject.operation}`);
    console.log(`   Explicación: ${queryObject.explanation}`);

    return queryObject;
  } catch (error) {
    console.error('❌ Error refinando consulta:', error);
    throw error;
  }
}

/**
 * Valida que la consulta generada tenga la estructura correcta
 * @param {Object} queryObject - Objeto de consulta generado
 * @returns {Object} - Objeto con validación y errores
 */
function validateQuery(queryObject) {
  const errors = [];

  // Verificar campos requeridos
  if (!queryObject.collection) {
    errors.push('Falta el campo "collection"');
  }

  if (!queryObject.operation) {
    errors.push('Falta el campo "operation"');
  }

  // Verificar que operation sea válida
  const validOperations = ['find', 'aggregate', 'count', 'findOne'];
  if (queryObject.operation && !validOperations.includes(queryObject.operation)) {
    errors.push(`Operación inválida: ${queryObject.operation}. Debe ser: ${validOperations.join(', ')}`);
  }

  // Verificar campos según operación
  if (queryObject.operation === 'find' || queryObject.operation === 'findOne') {
    if (!queryObject.query && queryObject.query !== undefined) {
      // query puede ser undefined (se asume {})
    }
  }

  if (queryObject.operation === 'aggregate') {
    if (!queryObject.pipeline || !Array.isArray(queryObject.pipeline)) {
      errors.push('Para operación "aggregate", se requiere el campo "pipeline" como array');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export {
  generateQuery,
  refineQuery,
  validateQuery,
  parseLLMResponse
};
