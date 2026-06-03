/**
 * LLM MongoDB Agent para REPFORA
 *
 * Agente que procesa preguntas en español, las convierte a consultas MongoDB,
 * las ejecuta y devuelve respuestas en lenguaje natural usando Gemini Flash 2.5.
 */

import { generateQuery, refineQuery, validateQuery } from './agent/queryGenerator.js';
import { executeQuery, isMongoConnected } from './agent/queryExecutor.js';
import { generateNaturalResponse, generateErrorResponse } from './agent/responseGenerator.js';
import { extractAllSchemas, generateTextSummary } from './context/schemaExtractor.js';
import { initializeGeminiService, cleanupGeminiService, getGeminiClient } from '../../services/gemini/index.js';
import { decideToolUsage } from './tools/toolDecision.js';
import { executeTool } from './tools/toolExecutor.js';
import { generateToolResponsePrompt } from './prompts/toolCallingPrompt.js';

/**
 * Configuración del agente
 */
const DEFAULT_CONFIG = {
  maxRetries: 2,
  cacheSchemas: true,
  useLLMForResponse: true,
};

/**
 * Clase principal del Agente
 */
class LLMMongoDBAgent {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.schemasCache = null;
  }

  /**
   * Inicializa el agente cargando los esquemas
   */
  async initialize() {
    console.log('🚀 Inicializando LLM MongoDB Agent...');

    // Inicializar servicio Gemini (con rate limiting y rotación)
    await initializeGeminiService();

    // Verificar conexión a MongoDB
    if (!isMongoConnected()) {
      throw new Error('MongoDB no está conectado. Asegúrate de conectar a la BD antes de usar el agente.');
    }

    // Cargar esquemas en caché si está habilitado
    if (this.config.cacheSchemas) {
      console.log('📊 Cargando esquemas en caché...');
      this.schemasCache = await extractAllSchemas();
      console.log('✅ Esquemas cargados exitosamente');
    }

    console.log('✅ Agente inicializado correctamente\n');
  }

  /**
   * Procesa una pregunta en español y devuelve una respuesta en lenguaje natural
   * @param {string} userQuestion - Pregunta del usuario en español
   * @returns {Promise<Object>} - Objeto con la respuesta y metadatos
   */
  async ask(userQuestion) {
    const startTime = Date.now();

    try {
      console.log('\n' + '='.repeat(60));
      console.log(`❓ PREGUNTA: ${userQuestion}`);
      console.log('='.repeat(60));

      // STEP 0: Decidir si usar tools o MongoDB directo
      console.log('\n🤔 STEP 0: Decidiendo estrategia...');
      const toolDecision = await decideToolUsage(userQuestion, this.schemasCache);

      // Si necesita tool, ejecutar ese camino
      if (toolDecision.useTool) {
        return await this._executeToolPath(userQuestion, toolDecision, startTime);
      }

      // STEP 1: Generar consulta MongoDB
      console.log('\n📝 STEP 1: Generando consulta MongoDB...');
      let queryObject = await generateQuery(
        userQuestion,
        this.schemasCache
      );

      // Validar consulta
      const validation = validateQuery(queryObject);
      if (!validation.valid) {
        throw new Error(`Consulta inválida: ${validation.errors.join(', ')}`);
      }

      // STEP 2: Ejecutar consulta con reintentos
      console.log('\n🔍 STEP 2: Ejecutando consulta...');
      let results = null;
      let lastError = null;
      let attempts = 0;

      while (attempts <= this.config.maxRetries) {
        try {
          results = await executeQuery(queryObject);
          break; // Exitoso, salir del loop
        } catch (error) {
          lastError = error;
          console.error(`❌ Intento ${attempts + 1} fallido:`, error.message);

          if (attempts < this.config.maxRetries) {
            console.log('🔄 Refinando consulta...');
            queryObject = await refineQuery(
              userQuestion,
              queryObject,
              error.message,
              this.schemasCache
            );
          }

          attempts++;
        }
      }

      // Si todos los intentos fallaron
      if (results === null) {
        throw new Error(`Error ejecutando consulta después de ${this.config.maxRetries + 1} intentos: ${lastError.message}`);
      }

      // STEP 3: Generar respuesta en lenguaje natural
      console.log('\n💬 STEP 3: Generando respuesta en lenguaje natural...');
      const response = await generateNaturalResponse(
        userQuestion,
        results,
        queryObject,
        this.config.useLLMForResponse
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(60));
      console.log(`✅ COMPLETADO en ${duration}s`);
      console.log('='.repeat(60) + '\n');

      return {
        success: true,
        question: userQuestion,
        answer: response,
        metadata: {
          query: queryObject,
          resultsCount: Array.isArray(results) ? results.length : 1,
          executionTime: duration,
          retries: attempts,
          results: results
        }
      };

    } catch (error) {
      console.error('\n❌ ERROR:', error.message);

      // Generar respuesta de error
      const errorResponse = await generateErrorResponse(
        userQuestion,
        error.message
      );

      return {
        success: false,
        question: userQuestion,
        answer: errorResponse,
        error: error.message,
        metadata: {
          executionTime: ((Date.now() - startTime) / 1000).toFixed(2)
        }
      };
    }
  }

  /**
   * Ejecuta el path de tool (para preguntas que requieren tools especiales)
   * @private
   */
  async _executeToolPath(userQuestion, toolDecision, startTime) {
    try {
      console.log('\n🔧 EJECUTANDO TOOL PATH...');

      // Ejecutar el tool
      const toolResults = await executeTool(toolDecision.tool, toolDecision.parameters);

      // Generar respuesta natural basada en resultados del tool
      console.log('\n💬 Generando respuesta natural desde resultados del tool...');
      const prompt = generateToolResponsePrompt(userQuestion, toolDecision.tool, toolResults);
      const geminiClient = await getGeminiClient();
      const naturalResponse = await geminiClient.generateText(prompt);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(60));
      console.log(`✅ COMPLETADO (TOOL) en ${duration}s`);
      console.log('='.repeat(60) + '\n');

      return {
        success: true,
        question: userQuestion,
        answer: naturalResponse,
        metadata: {
          tool: toolDecision.tool,
          toolParameters: toolDecision.parameters,
          executionTime: duration,
          toolResults: toolResults
        }
      };

    } catch (error) {
      console.error('\n❌ ERROR EN TOOL PATH:', error.message);

      // Generar respuesta de error
      const errorResponse = await generateErrorResponse(
        userQuestion,
        error.message
      );

      return {
        success: false,
        question: userQuestion,
        answer: errorResponse,
        error: error.message,
        metadata: {
          executionTime: ((Date.now() - startTime) / 1000).toFixed(2)
        }
      };
    }
  }

  /**
   * Procesa múltiples preguntas en lote
   * @param {Array<string>} questions - Array de preguntas
   * @returns {Promise<Array<Object>>} - Array de respuestas
   */
  async askBatch(questions) {
    console.log(`\n📦 Procesando lote de ${questions.length} preguntas...`);

    const responses = [];

    for (let i = 0; i < questions.length; i++) {
      console.log(`\n[${i + 1}/${questions.length}]`);
      const response = await this.ask(questions[i]);
      responses.push(response);
    }

    return responses;
  }

  /**
   * Obtiene estadísticas del agente
   * @returns {Object} - Estadísticas
   */
  getStats() {
    return {
      schemasCached: this.schemasCache !== null,
      config: this.config,
      connected: isMongoConnected()
    };
  }

  /**
   * Limpia recursos
   */
  async cleanup() {
    console.log('🧹 Limpiando recursos del agente...');
    this.schemasCache = null;

    // Limpiar servicio Gemini (guardar estado)
    await cleanupGeminiService();
  }
}

/**
 * Función helper para crear una instancia del agente
 * @param {Object} config - Configuración opcional
 * @returns {LLMMongoDBAgent} - Instancia del agente
 */
function createAgent(config = {}) {
  return new LLMMongoDBAgent(config);
}

/**
 * Función helper para usar el agente de forma rápida
 * @param {string} question - Pregunta en español
 * @param {Object} config - Configuración opcional
 * @returns {Promise<Object>} - Respuesta del agente
 */
async function quickAsk(question, config = {}) {
  const agent = new LLMMongoDBAgent(config);
  await agent.initialize();
  const response = await agent.ask(question);
  agent.cleanup();
  return response;
}

export {
  LLMMongoDBAgent,
  createAgent,
  quickAsk
};

export default LLMMongoDBAgent;
