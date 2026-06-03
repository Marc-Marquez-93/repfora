/**
 * Reglas de Negocio - REPFORA
 *
 * Este archivo contiene las reglas de negocio específicas del dominio
 * que se usan para generar consultas MongoDB con lógica de negocio.
 */

/**
 * Reglas de negocio para instructores
 */
export const INSTRUCTOR_RULES = {
  // NOTA: Cada instructor tiene su propia capacidad horaria (caphour)
  // NO es 160 horas para todos, sino caphour es individual por instructor

  /**
   * Cálculo de horas libres
   * Horas libres = caphour - hourswork
   * IMPORTANTE: Usar el campo caphour de CADA instructor, NO un valor fijo de 160
   */
  HOURS_FREE: 'Horas libres = caphour - hourswork (usar caphour individual del instructor)',

  /**
   * Cálculo de horas ocupadas
   * Horas ocupadas = hourswork (campo directo)
   */
  HOURS_BUSY: 'Horas ocupadas = hourswork (campo directo)',

  /**
   * Campos relevantes para horas de instructores
   */
  HOURS_FIELDS: {
    HOURS_WORK: 'hourswork',      // Horas trabajadas acumuladas
    CAP_HOUR: 'caphour',          // Capacidad horaria individual (NO es 160 fijo)
  },

  /**
   * NOTA IMPORTANTE SOBRE EL CÁLCULO DE HORAS:
   *
   * Las horas se calculan desde las programaciones (Schedule y Otherschedule):
   * - Horas de formación: vienen de Schedule (horarios normales)
   * - Horas de otras actividades: vienen de Otherschedule (actividades complementarias)
   *
   * El campo hourswork del Instructor es un acumulador de TODOS los meses,
   * NO se puede usar para calcular horas de un mes específico.
   *
   * Para calcular horas por MES se requiere:
   * 1. Buscar Schedule y Otherschedule del instructor en rango de fechas
   * 2. Calcular: (tend - tstart) = duración por sesión
   * 3. Multiplicar por cantidad de eventos (fechas) en el rango
   * 4. Sumar todo
   *
   * ESTRATEGIA: Cuando pregunten por horas de un mes específico,
   * explicar que se requiere cálculo especial (no es un query simple)
   * porque hourswork es acumulativo de todos los meses.
   *
   * Para calcular horas libres (acumulado total): caphour - hourswork
   */
};

/**
 * Reglas de negocio para horarios
 */
export const SCHEDULE_RULES = {
  /**
   * Estados de horarios
   */
  STATUS: {
    ACTIVE: 0,
    INACTIVE: 1,
    CANCELLED: 2
  },

  /**
   * Campos relevantes para horarios
   */
  FIELDS: {
    FICHE: 'fiche',           // Ficha asociada
    INSTRUCTOR: 'instructor', // Instructor
    HOURS_WORK: 'hourswork',  // Horas trabajadas
    TSTART: 'tstart',         // Hora inicio
    TEND: 'tend',             // Hora fin
    STATUS: 'status'          // Estado
  }
};

/**
 * Ejemplos de consultas con reglas de negocio
 * Estos ejemplos se agregan al prompt para que el LLM aprenda a generarlos
 */
export const BUSINESS_RULES_EXAMPLES = [
  {
    question: "¿Cuántas horas tiene libres el instructor Juan Pérez?",
    description: "Calcula horas libres usando: caphour - hourswork",
    query: {
      collection: "instructors",
      operation: "aggregate",
      pipeline: [
        {
          "$match": {
            "name": { "$regex": "juan pérez", "$options": "i" }
          }
        },
        {
          "$project": {
            "name": 1,
            "hourswork": 1,
            "caphour": 1,
            "horasLibres": { "$subtract": ["$caphour", "$hourswork"] },
            "horasOcupadas": "$hourswork"
          }
        }
      ],
      explanation: "Busca el instructor y calcula horas libres (caphour - horas trabajadas)"
    }
  },

  {
    question: "¿Cuántas horas tiene ocupadas el instructor con documento 12345678?",
    description: "Obtiene las horas trabajadas del instructor",
    query: {
      collection: "instructors",
      operation: "find",
      query: {
        "numdocument": "12345678"
      },
      projection: {
        "name": 1,
        "hourswork": 1,
        "caphour": 1
      },
      explanation: "Busca el instructor por documento y muestra sus horas trabajadas"
    }
  },

  {
    question: "Listar instructores con más de 40 horas libres",
    description: "Filtra instructores basado en horas libres calculadas",
    query: {
      collection: "instructors",
      operation: "aggregate",
      pipeline: [
        {
          "$project": {
            "name": 1,
            "hourswork": 1,
            "caphour": 1,
            "horasLibres": { "$subtract": ["$caphour", "$hourswork"] }
          }
        },
        {
          "$match": {
            "horasLibres": { "$gt": 40 }
          }
        },
        {
          "$sort": { "horasLibres": -1 }
        }
      ],
      explanation: "Calcula horas libres y filtra los que tienen más de 40 horas disponibles"
    }
  },

  {
    question: "¿Cuáles instructores están sobrepasados de su capacidad horaria?",
    description: "Encuentra instructores que exceden su capacidad (caphour)",
    query: {
      collection: "instructors",
      operation: "find",
      query: {
        "$expr": {
          "$gt": ["$hourswork", "$caphour"]
        }
      },
      projection: {
        "name": 1,
        "hourswork": 1,
        "caphour": 1,
        "horasExcedidas": { "$subtract": ["$hourswork", "$caphour"] }
      },
      explanation: "Busca instructores donde horas trabajadas > capacidad horaria"
    }
  },

  {
    question: "Horarios del instructor Miguel Angel",
    description: "Busca horarios filtrando por instructor",
    query: {
      collection: "schedules",
      operation: "find",
      query: {
        "instructor": { "$in": [
          // Array de ObjectIds de instructores que coinciden con "Miguel Angel"
        ] }
      },
      explanation: "Primero buscaría los instructores con nombre 'Miguel Angel' para obtener sus IDs, luego buscaría sus horarios"
    }
  },

  {
    question: "¿Cuántos horarios tiene el instructor X esta semana?",
    description: "Cuenta horarios de un instructor",
    query: {
      collection: "schedules",
      operation: "aggregate",
      pipeline: [
        {
          "$match": {
            "instructor": { "$in": [
              // IDs del instructor
            ] }
          }
        },
        {
          "$count": "totalHorarios"
        }
      ],
      explanation: "Cuenta los horarios del instructor especificado"
    }
  }
];

/**
 * Genera una sección del prompt con las reglas de negocio
 */
export function generateBusinessRulesPrompt() {
  return `
# REGLAS DE NEGOCIO - REPFORA

## Instructores - Cálculo de Horas

### IMPORTANTE - Capacidad Horaria Individual:
Cada instructor tiene su propio campo caphour (capacidad horaria).
**NO usar 160 como valor fijo**, sino el valor de caphour de CADA instructor.

### Horas Libres vs Ocupadas:
- **Horas Ocupadas**: Campo hourswork (horas trabajadas acumuladas)
- **Horas Libres**: caphour - hourswork (capacidad individual - horas trabajadas)
- **Horas Excedidas**: hourswork - caphour (cuando exceden su capacidad)

### Cálculos en Aggregations:
\`\`\`javascript
// Horas libres (usando caphour individual)
"horasLibres": { "$subtract": ["$caphour", "$hourswork"] }

// Horas excedidas
"horasExcedidas": { "$subtract": ["$hourswork", "$caphour"] }

// Porcentaje de ocupación
"porcentajeOcupacion": { "$multiply": [{ "$divide": ["$hourswork", "$caphour"] }, 100] }
\`\`\`

## Consultas Comunes con Lógica de Negocio:

### Ejemplo 1: Horas libres de un instructor
Pregunta: "¿Cuántas horas tiene libres el instructor Juan Pérez?"
\`\`\`json
{
  "collection": "instructors",
  "operation": "aggregate",
  "pipeline": [
    { "$match": { "name": { "$regex": "juan pérez", "$options": "i" } } },
    {
      "$project": {
        "name": 1,
        "hourswork": 1,
        "caphour": 1,
        "horasLibres": { "$subtract": ["$caphour", "$hourswork"] },
        "horasOcupadas": "$hourswork"
      }
    }
  ]
}
\`\`\`

### Ejemplo 2: Instructores sobrepasados
Pregunta: "¿Cuáles instructores exceden su capacidad horaria?"
\`\`\`json
{
  "collection": "instructors",
  "operation": "find",
  "query": { "$expr": { "$gt": ["$hourswork", "$caphour"] } },
  "projection": {
    "name": 1,
    "hourswork": 1,
    "caphour": 1,
    "horasExcedidas": { "$subtract": ["$hourswork", "$caphour"] }
  }
}
\`\`\`

### Ejemplo 3: Instructores con capacidad disponible
Pregunta: "Listar instructores con más de 40 horas libres"
\`\`\`json
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
  ]
}
\`\`\`

## Regla General:
CUANDO la pregunta involucre "horas libres", "horas disponibles", "capacidad restante":
→ USA: { "$subtract": ["$caphour", "$hourswork"] }
→ IMPORTANTE: Usar el campo caphour de cada instructor, NO 160

CUANDO la pregunta involucre "horas ocupadas", "horas trabajadas":
→ USA: "$hourswork" (campo directo)

CUANDO la pregunta involucre "horas excedidas", "sobrepasado":
→ USA: { "$subtract": ["$hourswork", "$caphour"] }
→ Verifica: { "$gt": ["$hourswork", "$caphour"] }

## Nota sobre el cálculo de horas:
Las horas trabajadas (hourswork) se calculan desde las programaciones:
- Schedule: Horarios de formación normales
- OthersSchedule: Actividades complementarias
- Cada horario suma: (tend - tstart) en minutos / 60 = horas
- El campo hourswork es el acumulador total

`;
}

/**
 * Actualiza el prompt principal incluyendo las reglas de negocio
 */
export function generateQueryWithBusinessRules(userQuestion, schemaContext) {
  const businessRules = generateBusinessRulesPrompt();

  return `Eres un experto en MongoDB y MQL (MongoDB Query Language).
Tu tarea es convertir preguntas en español a consultas de MongoDB válidas.

${businessRules}

# CONTEXTO DE LA BASE DE DATOS

${schemaContext}

# INSTRUCCIONES ADICIONALES

Analiza la siguiente pregunta del usuario y genera la consulta de MongoDB más apropiada.

## Pregunta del Usuario:
"${userQuestion}"

...
`;
}

export default {
  INSTRUCTOR_RULES,
  SCHEDULE_RULES,
  BUSINESS_RULES_EXAMPLES,
  generateBusinessRulesPrompt,
  generateQueryWithBusinessRules
};
