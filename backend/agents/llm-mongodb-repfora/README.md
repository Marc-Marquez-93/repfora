# LLM MongoDB Agent para REPFORA

Agente inteligente que procesa preguntas en español, las convierte a consultas MongoDB, las ejecuta y devuelve respuestas en lenguaje natural usando **Gemini Flash 2.5**.

## 🏗️ Arquitectura

```
agents/llm-mongodb-repfora/
├── agent/
│   ├── queryGenerator.js     # Paso 1: prompt → MQL query
│   ├── queryExecutor.js      # Paso 2: ejecutar en MongoDB
│   └── responseGenerator.js  # Paso 3: resultado → lenguaje natural
├── context/
│   └── schemaExtractor.js    # Introspección de colecciones Mongoose
├── prompts/
│   ├── queryPrompt.js        # Prompt del Paso 1
│   └── responsePrompt.js     # Prompt del Paso 3
├── agent.js                  # Orquestador principal
├── example.js                # Ejemplos de uso
└── README.md                 # Este archivo
```

## 🚀 Características

- ✅ **Preguntas en español** natural y conversacional
- ✅ **Generación automática** de consultas MongoDB con Gemini Flash 2.5
- ✅ **Detección automática** de esquemas Mongoose
- ✅ **Reintentos automáticos** con refinamiento de consultas
- ✅ **Respuestas en lenguaje natural** contextualizadas
- ✅ **Manejo de errores** con explicaciones amigables

## 📋 Requisitos Previos

1. **Node.js** con soporte para ES modules
2. **MongoDB** conectado y funcionando
3. **API Key de Gemini Flash 2.5** configurada en `.env`

## ⚙️ Configuración

### 1. Variables de Entorno

Asegúrate de tener configurado tu archivo `.env`:

```env
# ==========================================
# GEMINI API CONFIGURATION
# ==========================================
# API Keys (puedes configurar hasta 3 keys para rotación)
GEMINI_API_KEY_1=tu_primera_key_aqui
GEMINI_API_KEY_2=tu_segunda_key_aqui  # Opcional - recomendado
GEMINI_API_KEY_3=tu_tercera_key_aqui  # Opcional

# Configuración del modelo
GEMINI_MODEL=gemini-2.5-flash

# Límites de uso (gemini-2.5-flash gratuito)
GEMINI_REQUESTS_PER_MINUTE=15
GEMINI_REQUESTS_PER_DAY=1500

# Persistencia de estado
GEMINI_PERSIST_STATE=true
GEMINI_STATE_FILE_PATH=./services/gemini/.usage-state.json

# MongoDB
MONGO_URL=mongodb://localhost:27017/repfora
```

**Nota:** El servicio de Gemini gestiona automáticamente la rotación de API keys y el rate limiting. Consulta [`services/gemini/README.md`](../../services/gemini/README.md) para más detalles.

### 2. Dependencias

El agente requiere las siguientes dependencias:

```bash
npm install @google/generative-ai mongoose dotenv
```

## 📖 Uso Básico

### Método Rápido

```javascript
import { quickAsk } from './agents/llm-mongodb-repfora/agent.js';

const response = await quickAsk('¿Cuántos instructores hay?');
console.log(response.answer);
```

### Método con Instancia

```javascript
import { createAgent } from './agents/llm-mongodb-repfora/agent.js';

const agent = createAgent({
  maxRetries: 2,
  cacheSchemas: true,
  useLLMForResponse: true
});

await agent.initialize();

const response = await agent.ask('Listar los últimos 5 horarios creados');
console.log(response.answer);

await agent.cleanup(); // Guarda estado de Gemini
```

## 🔍 Ejemplos de Preguntas

### Básicas
- "¿Cuántos instructores hay?"
- "Listar todos los programas de formación"
- "Buscar programas cuyo nombre contenga 'análisis'"

### Intermedias
- "Listar los últimos 5 horarios creados"
- "Mostrar los ambientes de aprendizaje disponibles"
- "Buscar instructores con estado activo"

### Avanzadas
- "Contar cuántos aprendices hay por cada ficha"
- "Listar los instructores con más de 100 horas trabajadas"
- "Mostrar los horarios del programa ADSO ordenados por fecha"

## 📊 Estructura de Respuesta

```javascript
{
  success: true,
  question: "¿Cuántos instructores hay?",
  answer: "Hay 25 instructores en el sistema...",
  metadata: {
    query: {
      collection: "instructors",
      operation: "count",
      query: {},
      explanation: "Cuenta todos los instructores"
    },
    resultsCount: 1,
    executionTime: "2.34",
    retries: 0,
    results: [{ count: 25 }]
  }
}
```

## 🛠️ Cómo Funciona

### Paso 1: Generación de Consulta
El agente usa Gemini Flash 2.5 para convertir la pregunta en español a una consulta MongoDB válida, teniendo en cuenta:
- Estructura de las colecciones
- Tipos de datos
- Campos disponibles
- Relaciones entre modelos

### Paso 2: Ejecución
Ejecuta la consulta generada en MongoDB:
- Carga dinámicamente los modelos Mongoose
- Ejecuta la operación (find, aggregate, count, etc.)
- Maneja errores y reintentos con refinamiento

### Paso 3: Respuesta Natural
Genera una respuesta en español contextualizada:
- Formatea los resultados
- Proporciona explicaciones
- Maneja casos vacíos o con errores

## 🔧 Personalización

### Configuración del Agente

```javascript
const agent = createAgent({
  maxRetries: 3,           // Número máximo de reintentos
  cacheSchemas: true,       // Cachear esquemas en memoria
  useLLMForResponse: true   // Usar LLM para respuestas
});
```

**Nota:** La configuración de Gemini (API keys, modelo, límites) se gestiona a través del servicio global en `services/gemini/`. Ver la [documentación del servicio Gemini](../../services/gemini/README.md).

### Personalizar Prompts

Puedes modificar los prompts en:
- `prompts/queryPrompt.js` - Para generación de consultas
- `prompts/responsePrompt.js` - Para generación de respuestas

## 🐛 Manejo de Errores

El agente maneja errores automáticamente:

1. **Consulta inválida**: Refina la consulta y reintenta
2. **Colección inexistente**: Sugiere colecciones similares
3. **Campo incorrecto**: Corrige el nombre del campo
4. **Error de sintaxis**: Reparsea y corrige

## 📝 Colecciones Soportadas

Actualmente el agente trabaja con todas las colecciones de REPFORA:
- Learner (Aprendices)
- Program (Programas de formación)
- Fiche (Fichas)
- Instructor (Instructores)
- Schedule (Horarios)
- Competence (Competencias)
- Outcome (Resultados de aprendizaje)
- Environment (Ambientes)
- Coordination (Coordinaciones)
- Y más...

## 🚦 Ejecutar Ejemplos

Para ejecutar los ejemplos:

```bash
node agents/llm-mongodb-repfora/example.js
```

## ⚠️ Consideraciones

1. **Conexión MongoDB**: Asegúrate de conectar a MongoDB antes de usar el agente
2. **API Keys Gemini**:
   - Configura hasta 3 API keys en `.env` para rotación automática
   - Protege tus API keys, nunca las commits en el código
   - El servicio gestiona automáticamente los límites de uso (rate limiting)
3. **Modelo Gemini**: Puedes cambiar el modelo en `GEMINI_MODEL`. Opciones comunes:
   - `gemini-2.5-flash` - Rápido y económico (recomendado)
   - `gemini-2.0-flash-exp` - Experimental y rápido
   - `gemini-2.5-pro` - Más potente pero más lento
4. **Límites de Uso**: El plan gratuito de gemini-2.5-flash tiene:
   - 15 requests por minuto
   - 1500 requests por día
   - Configura múltiples API keys para aumentar capacidad
5. **Monitoreo**: Usa `import { getGeminiStats } from './services/gemini/index.js'` para ver el uso
6. **Seguridad**: El agente tiene acceso de lectura a toda tu base de datos

## 🔮 Mejoras Futuras

- [ ] Soporte para operaciones de escritura (insert, update, delete)
- [ ] Caché de respuestas para preguntas recurrentes
- [ ] Modo interactivo de chat
- [ ] Integración con APIs web
- [ ] Métricas y logging avanzado

## 📄 Licencia

Este código es parte del proyecto REPFORA.

## 👥 Contribuir

Para mejorar el agente:
1. Modifica los prompts en `prompts/`
2. Añade más ejemplos en `example.js`
3. Mejora la detección de esquemas en `context/schemaExtractor.js`

---

**¿Preguntas? Consulta el archivo `example.js` para más detalles de uso.**
