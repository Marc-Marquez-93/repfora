/**
 * SchemaExtractor
 *
 * Extrae información de los esquemas Mongoose para usar como contexto
 * en los prompts del LLM. Genera un resumen estructurado de colecciones,
 * campos, tipos y referencias.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mapeo de tipos de Mongoose a descripciones en español
 */
const TYPE_MAPPING = {
  'String': 'texto',
  'Number': 'número',
  'Boolean': 'booleano',
  'Date': 'fecha',
  'ObjectId': 'identificador',
  'Array': 'arreglo',
  'Object': 'objeto',
  'Mixed': 'mixto',
};

/**
 * Extrae información de un campo del esquema
 * @param {string} fieldName - Nombre del campo
 * @param {Object} schemaType - Tipo de esquema de Mongoose
 * @returns {Object} - Información del campo
 */
function extractFieldInfo(fieldName, schemaType) {
  const info = {
    name: fieldName,
    type: 'unknown',
    required: false,
    description: '',
    reference: null,
  };

  // Obtener el tipo del campo
  if (schemaType.instance) {
    info.type = TYPE_MAPPING[schemaType.instance] || schemaType.instance.toLowerCase();
  } else if (!schemaType.instance && schemaType.options && schemaType.options.ref) {
    // Es un ObjectId con referencia
    info.type = 'ObjectId';
    info.reference = schemaType.options.ref;
  }

  // Verificar si es un array
  if (schemaType.instance === 'Array') {
    info.type = 'arreglo';
    if (schemaType.caster && schemaType.caster.instance) {
      info.type = `arreglo de ${TYPE_MAPPING[schemaType.caster.instance] || schemaType.caster.instance.toLowerCase()}`;
    }
  }

  // Verificar si es requerido
  if (schemaType.isRequired === true) {
    info.required = true;
  }

  // Verificar si hay una referencia
  if (schemaType.options && schemaType.options.ref) {
    info.reference = schemaType.options.ref;
    info.type = `referencia a ${schemaType.options.ref}`;
  }

  // Agregar descripción basada en el nombre del campo
  info.description = generateFieldDescription(fieldName, info.type);

  return info;
}

/**
 * Genera una descripción en español para un campo
 * @param {string} fieldName - Nombre del campo
 * @param {string} type - Tipo del campo
 * @returns {string} - Descripción en español
 */
function generateFieldDescription(fieldName, type) {
  const fieldDescriptions = {
    // Campos comunes
    'name': 'nombre completo',
    'code': 'código identificador',
    'email': 'correo electrónico',
    'phone': 'número de teléfono',
    'status': 'estado (0=activo, 1=inactivo)',
    'createdAt': 'fecha de creación',
    'updatedAt': 'fecha de última actualización',
    'password': 'contraseña encriptada',
    'documentNumber': 'número de documento',
    'document': 'tipo de documento',
    'fullName': 'nombre completo',
    'ficheNumber': 'número de ficha',

    // Ficha
    'number': 'número de ficha',
    'fstart': 'fecha de inicio',
    'fend': 'fecha de fin',
    'owner': 'instructor responsable',
    'coordination': 'coordinación',
    'program': 'programa de formación',

    // Schedule
    'fiche': 'ficha asociada',
    'program': 'programa de formación',
    'competence': 'competencia',
    'outcome': 'resultado de aprendizaje',
    'instructor': 'instructor asignado',
    'environment': 'ambiente de aprendizaje',
    'days': 'días de la semana [0-6]',
    'tstart': 'hora inicio',
    'tend': 'hora fin',
    'events': 'fechas de eventos',
    'hourswork': 'horas trabajadas',
    'supporttext': 'texto de apoyo',
    'observation': 'observaciones',
    'rated': 'calificado',
    'qualifiable': 'calificable',
    'dateRating': 'fecha de calificación',
    'statusRating': 'estado de calificación',
    'ratedByProcess': 'calificado por proceso',

    // Instructor
    'tpdocument': 'tipo de documento',
    'numdocument': 'número de documento',
    'emailpersonal': 'correo personal',
    'knowledge': 'área de conocimiento',
    'thematicarea': 'área temática',
    'bindingtype': 'tipo de vinculación',
    'caphour': 'capacidad horaria',

    // Learner
    'identificacion': 'número de identificación',
  };

  return fieldDescriptions[fieldName] || type;
}

/**
 * Extrae información completa de un modelo
 * @param {string} modelName - Nombre del modelo
 * @param {mongoose.Model} model - Modelo de Mongoose
 * @returns {Object} - Información del modelo
 */
function extractModelInfo(modelName, model) {
  const info = {
    collection: model.collection.name,
    modelName: modelName,
    description: generateModelDescription(modelName),
    fields: []
  };

  const schema = model.schema;
  const paths = schema.paths;

  for (const [fieldName, schemaType] of Object.entries(paths)) {
    // Excluir campos especiales de Mongoose
    if (!fieldName.startsWith('_') && fieldName !== '__v') {
      const fieldInfo = extractFieldInfo(fieldName, schemaType);
      info.fields.push(fieldInfo);
    }
  }

  return info;
}

/**
 * Genera una descripción para un modelo
 * @param {string} modelName - Nombre del modelo
 * @returns {string} - Descripción en español
 */
function generateModelDescription(modelName) {
  const descriptions = {
    'Learner': 'Aprendiz en formación',
    'Program': 'Programa de formación',
    'Fiche': 'Ficha de formación',
    'Instructor': 'Instructor de formación',
    'Schedule': 'Horario de clase',
    'Competence': 'Competencia de aprendizaje',
    'Outcome': 'Resultado de aprendizaje',
    'Environment': 'Ambiente de aprendizaje',
    'Coordination': 'Coordinación académica',
    'Binnacle': 'Bitácora de eventos',
    'Improvement': 'Plan de mejora',
    'News': 'Noticia o anuncio',
    'User': 'Usuario del sistema',
    'Town': 'Ciudad o municipio',
    'HistorySchedule': 'Historial de cambios en horarios',
    'OthersSchedule': 'Otros horarios',
    'LearnerOmission': 'Omisiones del aprendiz',
    'FicheOmission': 'Omisiones de la ficha',
    'FailedFiche': 'Fichas fallidas',
    'DailyAuditLog': 'Log de auditoría diaria',
    'CurrentAuditState': 'Estado actual de auditoría',
    'AppSettings': 'Configuración de la aplicación',
  };

  return descriptions[modelName] || `Modelo ${modelName}`;
}

/**
 * Importa dinámicamente todos los modelos de la carpeta models/
 * @returns {Array} - Array de modelos
 */
async function importModels() {
  const modelsPath = path.resolve(__dirname, '../../../models');
  const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

  const models = [];

  for (const file of modelFiles) {
    try {
      const modelPath = path.join(modelsPath, file);
      // Usar import dinámico con ruta de archivo
      const module = await import(url.pathToFileURL(modelPath).href);

      // El modelo suele ser la exportación default
      const model = module.default;

      // Verificar si es un modelo Mongoose válido
      if (model && model.schema && model.collection && model.modelName) {
        models.push({
          name: model.modelName,
          model: model
        });
      }
    } catch (error) {
      console.warn(`No se pudo importar el modelo desde ${file}:`, error.message);
    }
  }

  return models;
}

/**
 * Extrae información de todos los modelos
 * @returns {Object} - Objeto con información de todos los modelos
 */
async function extractAllSchemas() {
  console.log('🔍 Extrayendo información de esquemas Mongoose...');

  const models = await importModels();
  const schemasInfo = {};

  for (const { name, model } of models) {
    const modelInfo = extractModelInfo(name, model);
    schemasInfo[name] = modelInfo;
    console.log(`✅ Procesado modelo: ${name} (${modelInfo.collection})`);
  }

  console.log(`\n📊 Total de modelos procesados: ${Object.keys(schemasInfo).length}`);

  return schemasInfo;
}

/**
 * Genera un resumen en texto para usar en prompts del LLM
 * @param {Object} schemasInfo - Información de esquemas
 * @returns {string} - Resumen en texto
 */
function generateTextSummary(schemasInfo) {
  let summary = '# ESQUEMAS DE BASE DE DATOS - REPFORA\n\n';
  summary += 'Este documento describe las colecciones disponibles en la base de datos MongoDB.\n\n';

  for (const [modelName, info] of Object.entries(schemasInfo)) {
    summary += `## ${info.collection} (${modelName})\n\n`;
    summary += `**Descripción:** ${info.description}\n\n`;
    summary += '**Campos:**\n\n';

    for (const field of info.fields) {
      const required = field.required ? ' (requerido)' : '';
      const ref = field.reference ? ` → ${field.reference}` : '';
      summary += `- "${field.name}": ${field.description}${ref}${required}\n`;
    }

    summary += '\n';
  }

  return summary;
}

/**
 * Genera un resumen compacto en JSON para queries complejas
 * @param {Object} schemasInfo - Información de esquemas
 * @returns {Object} - Resumen compacto
 */
function generateCompactSchema(schemasInfo) {
  const compact = {};

  for (const [modelName, info] of Object.entries(schemasInfo)) {
    compact[info.collection] = {
      model: modelName,
      description: info.description,
      fields: {}
    };

    for (const field of info.fields) {
      compact[info.collection].fields[field.name] = {
        type: field.type,
        required: field.required,
        ref: field.reference
      };
    }
  }

  return compact;
}

export {
  extractAllSchemas,
  generateTextSummary,
  generateCompactSchema,
  extractModelInfo,
  extractFieldInfo
};
