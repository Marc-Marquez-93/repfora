/**
 * QueryPrompt
 *
 * Prompts para que el LLM genere consultas de MongoDB
 * a partir de preguntas en lenguaje natural en español.
 */

import { generateBusinessRulesPrompt } from './businessRules.js';

/**
 * Prompt principal para generar consultas MongoDB
 * @param {string} userQuestion - Pregunta del usuario en español
 * @param {string} schemaContext - Contexto de los esquemas de la BD
 * @returns {string} - Prompt completo
 */
export function generateQueryPrompt(userQuestion, schemaContext) {
  const businessRules = generateBusinessRulesPrompt();
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  // DEBUG: Mostrar qué año se está usando
  console.log('\n🔍 [DEBUG] generateQueryPrompt:');
  console.log('   Año actual inyectado:', currentYear);
  console.log('   Fecha actual inyectada:', currentDate);

  return `Eres un experto en MongoDB y MQL (MongoDB Query Language).
Tu tarea es convertir preguntas en español a consultas de MongoDB válidas.

${businessRules}

# INFORMACIÓN TEMPORAL IMPORTANTE

- **Año actual**: ${currentYear}
- **Fecha actual**: ${currentDate}
- Cuando el usuario diga "este año", "este mes", "este trimestre", etc., asumir el año actual (${currentYear})
- Cuando el usuario NO especifique el año en fechas, usar ${currentYear} como año por defecto

# CONTEXTO DE LA BASE DE DATOS

${schemaContext}

# INSTRUCCIONES

Analiza la siguiente pregunta del usuario y genera la consulta de MongoDB más apropiada.

## Pregunta del Usuario:
"${userQuestion}"

## Requisitos:

1. **IDENTIFICA LA COLECCIÓN CORRECTA**: Usa la información del contexto para determinar qué colección consultar.

2. **GENERA LA CONSULTA MQL**:
   - Usa la sintaxis de MongoDB estándar (formato JSON)
   - Para filtros: usa operadores como $eq, $ne, $gt, $lt, $gte, $lte, $in, $nin, $regex, etc.
   - **IMPORTANTE - BÚSQUEDAS DE TEXTO**:
     * SIEMPRE usa $regex con $options: "i" para búsquedas de texto (nombre, email, etc.)
     * Esto hace la búsqueda insensible a mayúsculas/minúsculas: { "name": { "$regex": "miguel", "$options": "i" } }
     * Para búsquedas parciales, $regex automáticamente busca coincidencias parciales
     * Para búsquedas exactas case-insensitive: { "name": { "$regex": "^miguel angel dulcey$", "$options": "i" } }
   - Para nombres con múltiples palabras, usa $regex con toda la frase o partes separadas con OR
   - Para fechas, usa objetos Date cuando sea necesario
   - Para referencias (ObjectId), incluye el campo pero NO uses populate (la consulta debe ser sobre el campo _id de la colección referenciada)

3. **PROYECCIÓN DE CAMPOS**:
   - Incluye solo los campos necesarios para responder la pregunta
   - Usa 1 para incluir, 0 para excluir
   - Si no se necesita proyección específica, devuelve todos los campos

4. **ORDENAMIENTO Y LÍMITES**:
   - Si la pregunta implica "primeros", "últimos", "más reciente", etc., incluye sort y limit
   - sort: usa 1 para ascendente, -1 para descendente

5. **AGREGACIONES**:
   - Para preguntas que requieren contar, agrupar, o calcular estadísticas, usa el pipeline de agregación
   - Usa $match, $group, $project, $sort, $limit según sea necesario

6. **CONSIDERACIONES ESPECIALES**:
   - **BÚSQUEDAS DE NOMBRES**: SIEMPRE usar $regex con $options: "i" para que sea insensible a mayúsculas
   - **CÁLCULO DE HORAS LIBRES**: SIEMPRE usar "$subtract": ["$caphour", "$hourswork"] - cada instructor tiene su propia caphour
   - **PREGUNTAS POR FECHAS**:
     → Si el usuario dice "este año", "la actualidad", "este año", usar ${new Date().getFullYear()}
     → Si el usuario NO especifica año en fechas, usar ${new Date().getFullYear()} como defecto
     → Para filtrar por año en campos de fecha: { "$expr": { "$eq": [{ "$year": "$fstart" }, ${new Date().getFullYear()}] } }
     → Para rangos de fechas en un año: fstart >= ${new Date().getFullYear()}-01-01 y fend <= ${new Date().getFullYear()}-12-31
   - **PREGUNTAS POR MES**: Si la pregunta menciona un mes específico ("enero", "febrero", "marzo", etc.):
     → El campo hourswork es ACUMULATIVO de todos los meses, NO usarlo
     → Explicar en el campo "explanation" que no se puede calcular horas por mes directamente
     → Devolver los campos caphour y hourswork con advertencia de que son totales acumulados
   - Los campos "status" usualmente son numéricos (0=activo, 1=inactivo, etc.)
   - Los campos de fecha como "fstart", "fend", "createdAt", "updatedAt" son objetos Date
   - Los campos con nombres en español ("dias", "horas", etc.) están en la base de datos tal como aparecen
   - Para nombres compuestos, el usuario puede escribir en minúsculas pero en la BD están en mayúsculas, SIEMPRE usar $options: "i"

## Formato de Respuesta:

Responde ÚNICAMENTE con un objeto JSON que tenga esta estructura exacta (sin markdown, sin código blocks):

{
  "collection": "nombre_de_coleccion",
  "operation": "find|aggregate|count|findOne",
  "query": { ... },  // filtro para find/findOne
  "projection": { ... },  // opcional
  "sort": { ... },  // opcional
  "limit": number,  // opcional
  "pipeline": [ ... ],  // para aggregate
  "explanation": "explicación breve en español de qué hace la consulta"
}

## Ejemplos:

Pregunta: "Buscar todos los instructores con estado activo"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "status": 0 },
  "explanation": "Busca instructores con status 0 (activo)"
}

Pregunta: "Listar los últimos 5 horarios creados"
Respuesta:
{
  "collection": "schedules",
  "operation": "find",
  "query": {},
  "sort": { "createdAt": -1 },
  "limit": 5,
  "explanation": "Obtiene los 5 horarios más recientes ordenados por fecha de creación descendente"
}

Pregunta: "Contar cuántos aprendices hay por ficha"
Respuesta:
{
  "collection": "learners",
  "operation": "aggregate",
  "pipeline": [
    { "$group": { "_id": "$ficheNumber", "count": { "$sum": 1 } } },
    { "$sort": { "count": -1 } }
  ],
  "explanation": "Agrupa aprendices por número de ficha y los cuenta"
}

Pregunta: "Buscar programas cuyo nombre contenga 'análisis'"
Respuesta:
{
  "collection": "programs",
  "operation": "find",
  "query": { "name": { "$regex": "análisis", "$options": "i" } },
  "explanation": "Busca programas donde el nombre coincida parcialmente con 'análisis' (insensible a mayúsculas)"
}

Pregunta: "Buscar instructores que se llamen miguel"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "name": { "$regex": "miguel", "$options": "i" } },
  "explanation": "Busca instructores donde el nombre contenga 'miguel' (insensible a mayúsculas/minúsculas)"
}

Pregunta: "Buscar instructor con nombre completo miguel angel dulcey diaz"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "name": { "$regex": "miguel angel dulcey diaz", "$options": "i" } },
  "explanation": "Busca instructores con el nombre completo 'miguel angel dulcey diaz' (insensible a mayúsculas)"
}

Pregunta: "Listar todos los johanson"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "name": { "$regex": "johanson", "$options": "i" } },
  "explanation": "Busca instructores donde el nombre contenga 'johanson' (insensible a mayúsculas)"
}

Pregunta: "¿Cuántas horas tiene libres el instructor miguel angel?"
Respuesta:
{
  "collection": "instructors",
  "operation": "aggregate",
  "pipeline": [
    { "$match": { "name": { "$regex": "miguel angel", "$options": "i" } } },
    {
      "$project": {
        "name": 1,
        "hourswork": 1,
        "caphour": 1,
        "horasLibres": { "$subtract": ["$caphour", "$hourswork"] },
        "horasOcupadas": "$hourswork",
        "porcentajeOcupacion": { "$multiply": [{ "$divide": ["$hourswork", "$caphour"] }, 100] }
      }
    }
  ],
  "explanation": "Busca el instructor Miguel Angel y calcula sus horas libres (caphour - horas trabajadas)"
}

Pregunta: "¿Cuántas horas ocupadas tiene el instructor con documento 12345678?"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "numdocument": "12345678" },
  "projection": {
    "name": 1,
    "hourswork": 1,
    "caphour": 1,
    "horasOcupadas": "$hourswork"
  },
  "explanation": "Busca el instructor por documento y muestra sus horas ocupadas (trabajadas)"
}

Pregunta: "Listar instructores con más de 40 horas libres"
Respuesta:
{
  "collection": "instructors",
  "operation": "aggregate",
  "pipeline": [
    {
      "$project": {
        "name": 1,
        "hourswork": 1,
        "caphour": 1,
        "horasLibres": { "$subtract": ["$caphour", "$hourswork"] }
      }
    },
    { "$match": { "horasLibres": { "$gt": 40 } } },
    { "$sort": { "horasLibres": -1 } }
  ],
  "explanation": "Calcula horas libres de cada instructor y filtra los que tienen más de 40 horas disponibles"
}

Pregunta: "¿Cuántas horas tiene el instructor X en marzo?"
Respuesta:
{
  "collection": "instructors",
  "operation": "find",
  "query": { "name": { "$regex": "instructor x", "$options": "i" } },
  "projection": {
    "name": 1,
    "hourswork": 1,
    "caphour": 1,
    "horasLibres": { "$subtract": ["$caphour", "$hourswork"] }
  },
  "explanation": "ADVERTENCIA: El campo hourswork es acumulativo de TODOS los meses, no solo de marzo. Para obtener horas específicas de marzo, se requiere un cálculo complejo usando Schedule y Otherschedule con rango de fechas. Esta consulta devuelve los campos caphour y hourswork que son totales acumulados de todos los meses."
}

Pregunta: "Listar horarios de este año"
Respuesta:
{
  "collection": "schedules",
  "operation": "find",
  "query": {
    "$expr": {
      "$eq": [{ "$year": "$fstart" }, ${new Date().getFullYear()}]
    }
  },
  "explanation": "Busca horarios donde el año de fstart sea ${new Date().getFullYear()} (año actual)"
}

Pregunta: "¿Qué fichas tiene programadas el instructor Miguel este año?"
Respuesta:
{
  "collection": "schedules",
  "operation": "find",
  "query": {
    "name": { "$regex": "miguel", "$options": "i" },
    "$expr": {
      "$eq": [{ "$year": "$fstart" }, ${new Date().getFullYear()}]
    }
  },
  "projection": {
    "fiche": 1,
    "program": 1,
    "fstart": 1,
    "fend": 1
  },
  "explanation": "Busca horarios del instructor Miguel en el año ${new Date().getFullYear()} y muestra las fichas asociadas"
}

Ahora, genera la consulta para la pregunta del usuario.

IMPORTANTE: Responde SOLO con el objeto JSON, sin texto adicional, sin markdown, sin \`\`\`json.
NO incluyas comentarios (líneas con //) dentro del JSON. El JSON debe ser limpio y válido.
`;
}

/**
 * Prompt para refinar una consulta cuando la primera no fue exitosa
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {string} previousQuery - Consulta anterior que falló
 * @param {string} errorMessage - Mensaje de error recibido
 * @param {string} schemaContext - Contexto de los esquemas
 * @returns {string} - Prompt de refinamiento
 */
export function generateRefinementPrompt(userQuestion, previousQuery, errorMessage, schemaContext) {
  return `La consulta anterior falló. Necesito que la corrijas.

# Pregunta Original:
"${userQuestion}"

# Consulta Anterior (que falló):
${JSON.stringify(previousQuery, null, 2)}

# Error Recibido:
${errorMessage}

# CONTEXTO DE LA BASE DE DATOS

${schemaContext}

# Instrucciones de Corrección:

Analiza el error y genera una versión corregida de la consulta. Posibles problemas:

1. **Nombre de colección incorrecto**: Verifica que el nombre de colección exista en el contexto
2. **Campo inexistente**: Verifica que los campos usados existan en la colección
3. **Tipo de dato incorrecto**: Verifica que los valores tengan el tipo correcto (String, Number, Date, ObjectId)
4. **Sintaxis inválida**: Revisa la sintaxis de MongoDB
5. **Operador incorrecto**: Verifica que los operadores ($regex, $in, etc.) se usen correctamente
6. **BÚSQUEDA SENSIBLE A MAYÚSCULAS**: Si la consulta busca texto (nombres, emails, etc.) y no trae resultados o trae pocos, AGREGA "$options": "i" al $regex para hacerlo insensible a mayúsculas

Responde con el mismo formato JSON que antes:

{
  "collection": "nombre_de_coleccion",
  "operation": "find|aggregate|count|findOne",
  "query": { ... },
  "projection": { ... },
  "sort": { ... },
  "limit": number,
  "pipeline": [ ... ],
  "explanation": "explicación breve en español de qué hace la consulta y qué se corrigió"
}

IMPORTANTE: Responde SOLO con el objeto JSON, sin texto adicional.
NO incluyas comentarios (líneas con //) dentro del JSON. El JSON debe ser limpio y válido.
`;
}
