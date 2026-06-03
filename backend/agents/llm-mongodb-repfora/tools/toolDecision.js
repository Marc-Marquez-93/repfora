/**
 * Tool Decision Maker
 *
 * Decide si una pregunta requiere usar tools o si se puede resolver
 * con queries MongoDB directas.
 */

import { getGeminiClient } from '../../../services/gemini/index.js';
import { generateTextSummary } from '../context/schemaExtractor.js';
import { generateToolDecisionPrompt } from '../prompts/toolCallingPrompt.js';
import { AVAILABLE_TOOLS } from './toolsDefinition.js';

/**
 * Limpia y parsea la respuesta del LLM para obtener el JSON
 * @param {string} response - Respuesta del LLM
 * @returns {Object} - Objeto JSON parseado
 */
function parseToolDecisionResponse(response) {
  let cleaned = response.trim();

  // Eliminar marcadores de código
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Eliminar comentarios
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\n\/\/.*$/gm, '');
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
    throw new Error(`No se pudo parsear la decisión del tool: ${error.message}. Respuesta: ${cleaned}`);
  }
}

/**
 * Decide si usar tools o MongoDB directo para una pregunta
 * @param {string} userQuestion - Pregunta del usuario
 * @param {Object} schemasCache - Cache de esquemas
 * @returns {Promise<Object>} - Decisión con { useTool, tool, parameters, reasoning }
 */
export async function decideToolUsage(userQuestion, schemasCache = null) {
  try {
    console.log('🤔 Decidiendo si usar tools...');

    // Generar contexto de esquemas
    const schemaContext = generateTextSummary(schemasCache);

    // Generar prompt de decisión
    const prompt = generateToolDecisionPrompt(
      userQuestion,
      schemaContext,
      AVAILABLE_TOOLS
    );

    // Obtener cliente de Gemini
    const geminiClient = await getGeminiClient();

    // Llamar a la API
    const response = await geminiClient.generateText(prompt);

    // Parsear respuesta
    const decision = parseToolDecisionResponse(response);

    console.log(`✅ Decisión: ${decision.useTool ? 'USE TOOL' : 'USE MONGODB DIRECT'}`);
    if (decision.useTool) {
      console.log(`   Tool: ${decision.tool}`);
      console.log(`   Reasoning: ${decision.reasoning}`);
    } else {
      console.log(`   Reasoning: ${decision.reasoning}`);
    }

    return decision;

  } catch (error) {
    console.error('❌ Error decidiendo tool usage:', error);

    // En caso de error, default a MongoDB directo
    return {
      useTool: false,
      reasoning: 'Error en la decisión, usando MongoDB directo por defecto'
    };
  }
}

export default {
  decideToolUsage
};
