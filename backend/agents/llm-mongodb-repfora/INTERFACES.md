# Interfaz Web para Probar el Agente LLM MongoDB

Interfaz web interactiva para probar el agente LLM MongoDB.

## 🌐 Acceder a la Interfaz Web

### 1. Inicia el servidor:

```bash
npm start
```

### 2. Abre tu navegador:

```
http://localhost:3000/agent-demo
```

## ✨ Características de la Interfaz Web

- ✅ **Chat interactivo** - Interfaz tipo chat moderna
- ✅ **Ejemplos rápidos** - Botones con preguntas de ejemplo
- ✅ **Indicadores** - Estado del agente y contador de solicitudes
- ✅ **Markdown** - Respuestas formateadas con Markdown
- ✅ **Errores claros** - Mensajes de error amigables
- ✅ **Responsive** - Funciona en móvil y desktop

## 📖 Uso de la Interfaz

1. **Escribe tu pregunta** en el campo de texto
2. **Presiona Enter** o clic en "Enviar"
3. **La respuesta aparecerá** en el chat
4. **Usa los botones de ejemplo** para preguntas rápidas

### Ejemplos de Preguntas:

- "¿Cuántos instructores hay?"
- "Listar los últimos 5 horarios creados"
- "Buscar programas cuyo nombre contenga 'análisis'"
- "Mostrar los ambientes de aprendizaje disponibles"
- "Contar cuántos aprendices hay por cada ficha"

## 🔧 API Endpoint (Uso Interno)

La interfaz web utiliza el endpoint `/api/agent/ask` internamente.

### POST /api/agent/ask

```bash
curl -X POST http://localhost:3000/api/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Cuántos instructores hay?"}'
```

**Respuesta:**

```json
{
  "success": true,
  "question": "¿Cuántos instructores hay?",
  "answer": "Hay 25 instructores en el sistema...",
  "metadata": {
    "query": { ... },
    "resultsCount": 1,
    "executionTime": "2.34",
    "retries": 0
  }
}
```

### Otros endpoints disponibles:

- `GET /api/agent/stats` - Estadísticas del agente
- `GET /api/agent/health` - Health check
- `POST /api/agent/reset` - Resetear agente

## 📝 Notas Importantes

1. **Configuración previa:**
   - Asegúrate de configurar las API keys de Gemini en `.env`
   - MongoDB debe estar corriendo

2. **Primer uso:**
   - El agente tomará unos segundos en inicializarse
   - Cargará los esquemas de todos los modelos

3. **Rate Limiting:**
   - El servicio Gemini gestiona automáticamente los límites
   - Si tienes múltiples API keys, rotará automáticamente

4. **Persistencia:**
   - El estado de uso de Gemini se guarda automáticamente
   - Los contadores no se reinician al recargar la web

## 🐛 Troubleshooting

### Error: "MongoDB no está conectado"

**Solución:** Asegúrate de que MongoDB esté corriendo y que la conexión en `.env` sea correcta.

### Error: "No se encontraron API keys"

**Solución:** Configura `GEMINI_API_KEY_1` en tu archivo `.env`.

### La web no carga

**Solución:** Verifica que el servidor esté corriendo en el puerto correcto (default: 3000).

### Error: "Todas las API keys han alcanzado su límite"

**Solución:**
- Espera unos minutos antes de intentar de nuevo
- O configura más API keys en el `.env` (hasta 3)

---

**¿Problemas? Consulta los READMEs principales:**
- [Agente LLM MongoDB](README.md)
- [Servicio Gemini](../../services/gemini/README.md)
