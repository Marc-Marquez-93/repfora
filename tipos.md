# Registro de Tipos de Novedades

He añadido los tipos de novedad **CONDICIONADO** y **CANCELADO** al backend para soportar el registro automático de novedades desde el módulo de Comités.

## Cambios Realizados

### 1. Validación del Backend
Se agregaron `"CONDICIONADO"` y `"CANCELADO"` a los tipos permitidos en `backend/validations/new.validation.js`. Esto permite que la API acepte estas novedades cuando provengan de Comités.

### 2. Documentación Swagger
Se actualizó la documentación en `backend/routes/new.routes.js` para incluir estos nuevos tipos en el endpoint de registro público.

## Resumen de Integración

| Decisión del Comité | Endpoint del Backend | Modelo Utilizado |
|---|---|---|
| `PLAN_DE_MEJORAMIENTO` | `registerImprovement` | `Improvement` |
| `CONDICIONAMIENTO_DE_MATRICULA` | `registerNew` (tipo: `CONDICIONADO`) | `News` |
| `CANCELACION_DE_MATRICULA` | `registerNew` (tipo: `CANCELADO`) | `News` |

## Notas Importantes
- **Restricción en el Front-end:** Estos tipos NO se agregaron a los dropdowns públicos. Solo se podrán generar a través de la lógica de Comités.
- **Generación de Código:** El campo `code` es autoincremental y se genera buscando el último registro en la base de datos y sumándole 1.
