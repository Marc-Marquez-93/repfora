# Reglas de Negocio - REPFORA

Este archivo explica cómo agregar y modificar reglas de negocio para el Agente LLM MongoDB.

## 📋 ¿Qué son las Reglas de Negocio?

Las **reglas de negocio** son lógicas específicas del dominio que no están directamente en la base de datos, pero que el agente debe entender para responder preguntas complejas.

### Ejemplo:
- **Pregunta**: "¿Cuántas horas tiene libres el instructor X?"
- **Base de datos**: Tiene `hourswork` (horas trabajadas) y `caphour` (capacidad horaria)
- **Regla de negocio**: `Horas libres = caphour - hourswork` (usar la capacidad individual de cada instructor)

## ⚠️ CORRECCIÓN IMPORTANTE - Cálculo de Horas

### Error Cometido Anteriormente:
Antes se usaba **160 horas como valor fijo** para todos los instructores:
```javascript
❌ "horasLibres": { "$subtract": [160, "$hourswork"] }
```

### Cálculo Correcto:
Cada instructor tiene su **propia capacidad horaria (caphour)**:
```javascript
✅ "horasLibres": { "$subtract": ["$caphour", "$hourswork"] }
```

### Por qué es importante:
- El campo `caphour` es la capacidad individual de cada instructor
- NO es 160 para todos, sino que varía por instructor
- Usar 160 como fijo daría resultados incorrectos

## 📁 Archivos de Reglas de Negocio

```
agents/llm-mongodb-repfora/prompts/
├── businessRules.js      # Definición de reglas y ejemplos
├── queryPrompt.js        # Prompt principal (usa businessRules.js)
└── BUSINESS_RULES.md     # Este archivo - documentación
```

## 🔧 Cómo Agregar Nuevas Reglas de Negocio

### Paso 1: Actualiza `businessRules.js`

Agrega tus reglas en el archivo [`prompts/businessRules.js`](prompts/businessRules.js):

```javascript
export const NUEVA_REGLA = {
  DESCRIPCIÓN: 'Descripción de la regla',
  FORMULA: 'fórmula si aplica',
  CAMPOS: {
    campo1: 'descripción',
    campo2: 'descripción'
  }
};
```

### Paso 2: Agrega Ejemplos

Agrega ejemplos en el array `BUSINESS_RULES_EXAMPLES`:

```javascript
{
  question: "¿Tu pregunta específica?",
  description: "Qué hace esta consulta",
  query: {
    collection: "colección",
    operation: "aggregate",
    pipeline: [ ... ],
    explanation: "Explicación clara"
  }
}
```

### Paso 3: Actualiza el Prompt (si es necesario)

Si la regla requiere instrucciones especiales, agrégalas en `generateBusinessRulesPrompt()`:

```javascript
export function generateBusinessRulesPrompt() {
  return `
  # REGLAS DE NEGOCIO - REPFORA

  ## Tu Nueva Regla:
  - Explicación clara
  - Cómo calcularlo en MongoDB
  ...
  `;
}
```

## 📚 Reglas de Negocio Actuales

### 1. Instructores - Cálculo de Horas

**Descubierto en:** `controller/reports.controller.js` (líneas 81-104)

**Horas Libres:**
```
Horas libres = caphour - hourswork
```

**Horas Ocupadas:**
```
Horas ocupadas = hourswork
```

**Horas Excedidas:**
```
Horas excedidas = hourswork - caphour
```

**Cómo se calculan realmente las horas trabajadas:**
1. Se obtienen los horarios (Schedule y OthersSchedule) del instructor
2. Por cada horario: `(tend - tstart) = minutos / 60 = horas`
3. Se suman las horas de todos los eventos en el rango de fechas
4. El campo `hourswork` es el acumulador total
5. `caphour` es la capacidad individual de cada instructor

**Ejemplos de preguntas:**
- "¿Cuántas horas tiene libres el instructor X?"
- "¿Cuántas horas ocupadas tiene el instructor Y?"
- "Listar instructores con más de 40 horas libres"
- "¿Cuáles instructores exceden las 160 horas?"

## 🎯 Ejemplos de Consultas con Reglas de Negocio

### Ejemplo 1: Horas Libres (CORRECTO)

**Pregunta**: "¿Cuántas horas tiene libres el instructor Miguel?"

**Query generada:**
```javascript
{
  "collection": "instructors",
  "operation": "aggregate",
  "pipeline": [
    { "$match": { "name": { "$regex": "miguel", "$options": "i" } } },
    {
      "$project": {
        "name": 1,
        "hourswork": 1,
        "caphour": 1,
        "horasLibres": { "$subtract": ["$caphour", "$hourswork"] }
      }
    }
  ]
}
```

### Ejemplo 2: Filtrar por Horas Disponibles (CORRECTO)

**Pregunta**: "Listar instructores con más de 50 horas libres"

**Query generada:**
```javascript
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
    { "$match": { "horasLibres": { "$gt": 50 } } },
    { "$sort": { "horasLibres": -1 } }
  ]
}
```

## 🧪 Cómo Probar Nuevas Reglas

1. **Agrega la regla** en `businessRules.js`
2. **Reinicia el servidor**: `npm start`
3. **Prueba en la interfaz**: `http://localhost:3000/agent-demo`
4. **Verifica la query generada** en los metadatos de la respuesta

## 📝 Plantilla para Nuevas Reglas

Usa esta plantilla cuando agregues nuevas reglas:

```javascript
// ==========================================
// NOMBRE DE LA REGLA
// ==========================================

/**
 * Descripción de qué hace esta regla
 */
export const MI_REGLA = {
  NOMBRE: 'Nombre de la regla',
  DESCRIPCIÓN: 'Descripción clara',
  FORMULA: 'fórmula si aplica',
  EJEMPLO_USO: 'Ejemplo de pregunta de usuario'
};

// Agrega en BUSINESS_RULES_EXAMPLES:
{
  question: "¿Pregunta del usuario?",
  description: "Descripción",
  query: { ... }
}
```

## 🔍 Operaciones MongoDB Útiles

### Aritmética
```javascript
{ "$subtract": ["$campo1", "$campo2"] }  // Resta
{ "$add": ["$campo1", "$campo2"] }        // Suma
{ "$multiply": ["$campo", 2] }            // Multiplicación
{ "$divide": ["$campo1", "$campo2"] }     // División
```

### Condicionales
```javascript
{ "$cond": [
  { "$gt": ["$hourswork", 160] },  // Si
  "Excedido",                         // Entonces
  "Normal"                           // Si no
]}
```

### Porcentajes
```javascript
{
  "$multiply": [
    { "$divide": ["$parcial", "$total"] },
    100
  ]
}
```

## 💡 Consejos

1. **Sé específico en los ejemplos**: Usa ejemplos reales con datos reales
2. **Incluye el cálculo en la explicación**: Ayuda al LLM a entender
3. **Agrega ejemplos negativos**: Qué NO hacer
4. **Prueba con la interfaz web**: Es más fácil ver los resultados
5. **Revisa los metadatos**: La respuesta incluye la query generada

## 🚨 Casos Especiales

### Cuando necesitas referencias a otros modelos

Si tu consulta necesita datos de dos colecciones (ej: instructores y horarios), usa `$lookup`:

```javascript
{
  "$lookup": {
    "from": "schedules",
    "localField": "_id",
    "foreignField": "instructor",
    "as": "horarios"
  }
}
```

### Cuando necesitas agrupar y contar

```javascript
{
  "$group": {
    "_id": "$campo",
    "total": { "$sum": 1 },
    "suma": { "$sum": "$campoNumerico" }
  }
}
```

## 📖 Referencias

- [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB Operators](https://www.mongodb.com/docs/manual/reference/operator/)
- [README del Agente](../README.md)

---

**¿Necesitas ayuda?** Agrega tu caso específico y prueba en la interfaz web.
