/**
 * QueryExecutor
 *
 * Ejecuta consultas de MongoDB generadas por el QueryGenerator.
 * Maneja diferentes tipos de operaciones y colecciones dinámicamente.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mapa de modelos cargados dinámicamente
 */
const modelsCache = new Map();

/**
 * Carga un modelo Mongoose dinámicamente
 * @param {string} modelName - Nombre del modelo a cargar
 * @returns {Promise<mongoose.Model>} - Modelo de Mongoose
 */
async function loadModel(modelName) {
  // Verificar si ya está en caché
  if (modelsCache.has(modelName)) {
    return modelsCache.get(modelName);
  }

  try {
    const modelsPath = path.resolve(__dirname, '../../../models');
    const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

    // Buscar el archivo del modelo
    for (const file of modelFiles) {
      const modelPath = path.join(modelsPath, file);
      const module = await import(url.pathToFileURL(modelPath).href);
      const model = module.default;

      if (model && model.modelName === modelName) {
        modelsCache.set(modelName, model);
        console.log(`✅ Modelo cargado: ${modelName}`);
        return model;
      }
    }

    throw new Error(`No se encontró el modelo: ${modelName}`);
  } catch (error) {
    console.error(`❌ Error cargando modelo ${modelName}:`, error);
    throw error;
  }
}

/**
 * Ejecuta una consulta de MongoDB
 * @param {Object} queryObject - Objeto de consulta generado por el LLM
 * @returns {Promise<Array>} - Resultados de la consulta
 */
async function executeQuery(queryObject) {
  try {
    console.log('🔍 Ejecutando consulta en MongoDB...');
    console.log(`   Colección: ${queryObject.collection}`);
    console.log(`   Operación: ${queryObject.operation}`);

    // DEBUG: Mostrar la query que se va a ejecutar
    console.log('\n🔍 [DEBUG] Query a ejecutar:');
    console.log('   Query/filter:', JSON.stringify(queryObject.query, null, 2));
    if (queryObject.projection) {
      console.log('   Projection:', JSON.stringify(queryObject.projection, null, 2));
    }
    if (queryObject.pipeline) {
      console.log('   Pipeline:', JSON.stringify(queryObject.pipeline, null, 2));
    }

    // Determinar el nombre del modelo a partir del nombre de colección
    const modelName = getModelNameFromCollection(queryObject.collection);

    // DEBUG: Mostrar el nombre del modelo
    console.log('\n🔍 [DEBUG] Modelo a usar:', modelName);

    // Cargar el modelo
    const Model = await loadModel(modelName);

    let results;

    switch (queryObject.operation) {
      case 'find':
        results = await executeFind(Model, queryObject);
        break;

      case 'findOne':
        results = await executeFindOne(Model, queryObject);
        break;

      case 'count':
        results = await executeCount(Model, queryObject);
        break;

      case 'aggregate':
        results = await executeAggregate(Model, queryObject);
        break;

      default:
        throw new Error(`Operación no soportada: ${queryObject.operation}`);
    }

    console.log(`✅ Consulta ejecutada exitosamente`);
    console.log(`   Resultados: ${Array.isArray(results) ? results.length : 1}`);

    // DEBUG: Mostrar muestra de resultados
    if (Array.isArray(results) && results.length > 0) {
      console.log('\n🔍 [DEBUG] Muestra de resultados (primeros 2):');
      console.log(JSON.stringify(results.slice(0, 2), null, 2));
    }

    return results;
  } catch (error) {
    console.error('❌ Error ejecutando consulta:', error);
    throw error;
  }
}

/**
 * Ejecuta una operación find
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {Object} queryObject - Objeto de consulta
 * @returns {Promise<Array>} - Resultados
 */
async function executeFind(Model, queryObject) {
  let query = Model.find(queryObject.query || {});

  if (queryObject.projection) {
    query = query.select(queryObject.projection);
  }

  if (queryObject.sort) {
    query = query.sort(queryObject.sort);
  }

  if (queryObject.limit) {
    query = query.limit(queryObject.limit);
  }

  return await query.lean().exec();
}

/**
 * Ejecuta una operación findOne
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {Object} queryObject - Objeto de consulta
 * @returns {Promise<Object|null>} - Resultado o null
 */
async function executeFindOne(Model, queryObject) {
  let query = Model.findOne(queryObject.query || {});

  if (queryObject.projection) {
    query = query.select(queryObject.projection);
  }

  const result = await query.lean().exec();
  return result ? [result] : [];
}

/**
 * Ejecuta una operación count
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {Object} queryObject - Objeto de consulta
 * @returns {Promise<Array>} - Array con el conteo
 */
async function executeCount(Model, queryObject) {
  const count = await Model.countDocuments(queryObject.query || {});
  return [{ count }];
}

/**
 * Ejecuta una operación aggregate
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {Object} queryObject - Objeto de consulta
 * @returns {Promise<Array>} - Resultados
 */
async function executeAggregate(Model, queryObject) {
  if (!queryObject.pipeline || !Array.isArray(queryObject.pipeline)) {
    throw new Error('Para aggregate se requiere un pipeline válido');
  }

  return await Model.aggregate(queryObject.pipeline).exec();
}

/**
 * Determina el nombre del modelo a partir del nombre de colección
 * @param {string} collectionName - Nombre de la colección
 * @returns {string} - Nombre del modelo
 */
function getModelNameFromCollection(collectionName) {
  // Mapeo manual de colecciones a modelos
  // IMPORTANTE: Usar el nombre exacto del modelo como está definido en el archivo
  const collectionToModel = {
    'learners': 'Learner',
    'learner': 'Learner',
    'programs': 'Program',
    'program': 'Program',
    'fiches': 'Fiche',
    'fiche': 'Fiche',
    'instructors': 'Instructor',
    'instructor': 'Instructor',
    'schedules': 'Schedules',      // CORREGIDO: El modelo es "Schedules" (plural)
    'schedule': 'Schedules',
    'competences': 'Competence',
    'competence': 'Competence',
    'outcomes': 'Outcome',
    'outcome': 'Outcome',
    'environments': 'Environment',
    'environment': 'Environment',
    'coordinations': 'Coordination',
    'coordination': 'Coordination',
    'binnacles': 'Binnacle',
    'binnacle': 'Binnacle',
    'improvements': 'Improvement',
    'improvement': 'Improvement',
    'news': 'News',
    'users': 'User',
    'user': 'User',
    'towns': 'Town',
    'town': 'Town',
    'historyschedules': 'HistorySchedule',
    'historyschedule': 'HistorySchedule',
    'othersschedules': 'OthersSchedule',
    'othersschedule': 'OthersSchedule',
    'learneromissions': 'LearnerOmission',
    'learneromission': 'LearnerOmission',
    'ficheomissions': 'FicheOmission',
    'ficheomission': 'FicheOmission',
    'failedfiches': 'FailedFiche',
    'failedfiche': 'FailedFiche',
    'dailyauditlogs': 'DailyAuditLog',
    'dailyauditlog': 'DailyAuditLog',
    'currentauditstates': 'CurrentAuditState',
    'currentauditstate': 'CurrentAuditState',
    'appsettings': 'AppSettings',
    'appsetting': 'AppSettings',
  };

  // Primero intentar búsqueda exacta
  if (collectionToModel[collectionName]) {
    return collectionToModel[collectionName];
  }

  // Si no, intentar singularizar la colección
  const singular = collectionName.endsWith('s')
    ? collectionName.slice(0, -1)
    : collectionName;

  if (collectionToModel[singular]) {
    return collectionToModel[singular];
  }

  // Si no, capitalizar y usar como nombre de modelo
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

/**
 * Valida si la conexión a MongoDB está activa
 * @returns {boolean} - True si está conectado
 */
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Obtiene estadísticas de ejecución
 * @returns {Object} - Estadísticas
 */
function getExecutionStats() {
  return {
    cachedModels: modelsCache.size,
    connected: isMongoConnected(),
    connectionState: mongoose.connection.readyState
  };
}

export {
  executeQuery,
  loadModel,
  getModelNameFromCollection,
  isMongoConnected,
  getExecutionStats
};
