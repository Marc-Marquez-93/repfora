# Plan de Implementación: Flujo de Cierre de Comités y Gestión de Aprendices

Este documento detalla el plan de desarrollo paso a paso para la sesión de trabajo de hoy. El objetivo es estructurar el flujo de cierre de los comités y crear el módulo de gestión para los aprendices sancionados.

---

## 📋 Fase 0: Preparación y Limpieza (Completado)
- [x] Limpieza del esquema `Committee.js` en Mongoose (eliminación de campos redundantes e JSDocs desactualizados).
- [x] Limpieza de los `.populate()` obsoletos en `committee.controller.js`.
- [x] Creación de respaldo seguro del modelo base en `comitte.md`.

---

## 🔄 Fase 1: Flujo para Completar/Cerrar un Comité (Paso a Paso)

El cierre de un comité debe realizarse de forma individualizada si hay múltiples aprendices asociados. Se debe estructurar el siguiente orden en la interfaz:

### Paso 1.1: Evaluación por Aprendiz (Ciclo)
*Para cada aprendiz involucrado en el comité se debe definir:*
- [ ] **Severidad de la Falta**: Selector único con opciones:
  - Leve
  - Grave
  - Gravísima
- [ ] **Decisión(es) a Tomar**: Selección múltiple de las siguientes opciones:
  - [ ] Plan de Mejoramiento
  - [ ] Llamado de Atención
  - [ ] Condicionamiento de Matrícula
  - [ ] Cancelación de Matrícula
  - *Regla de validación estricta*: **Condicionamiento de Matrícula** y **Cancelación de Matrícula** son mutuamente excluyentes (no se pueden marcar ambos al mismo tiempo).

---

### Paso 1.2: Flujo Condicional según la Decisión

Dependiendo de la decisión tomada en el paso anterior, la interfaz guiará al usuario por una de las siguientes rutas:

#### Ruta A: Llamado de Atención
- [ ] Si se selecciona **únicamente** Llamado de Atención:
  - Finalizar inmediatamente el flujo del aprendiz actual sin requerir datos adicionales.

#### Ruta B: Plan de Mejoramiento (Solo o combinado)
- [ ] Si se incluye esta opción en la decisión:
  - Mostrar pantalla para seleccionar el/los instructor(es) encargados del plan.
  - Para cada instructor seleccionado, habilitar campos de:
    - **Descripción del plan** (campo de texto / string).
    - **Fecha máxima de entrega** (selector de fecha / date).

#### Ruta C: Condicionamiento de Matrícula O Cancelación de Matrícula (Solo una de las dos)
- [ ] Mostrar pantalla de confirmación (Ej: *"¿Está seguro de que desea aplicar [Condicionamiento/Cancelación] a este aprendiz?"*).
- [ ] Opción para **"Volver a elegir decisión"** si el usuario desea corregir.
- [ ] Formulario de datos de resolución:
  - **Número de Resolución** (campo de texto / string).
  - **Fecha de Resolución** (selector de fecha / date).
  - Checkbox/Opción: **"Añadir esta información después"** (permite guardar y continuar sin rellenar estos campos inmediatamente).

---

## 👥 Fase 2: Módulo "Gestión de Aprendices"

Creación de una nueva sección en el sistema para la administración de los aprendices que ya cuentan con una sanción en firme.

### Paso 2.1: Diseño de la Vista
- [ ] Reutilizar el estilo visual premium de las tablas de estado de comité actuales (Pendientes, Agendados, etc.).
- [ ] Crear dos tablas principales independientes:
  1. **Tabla de Aprendices Condicionados**.
  2. **Tabla de Aprendices Cancelados**.

### Paso 2.2: Contenido de las Tablas
Cada fila de las tablas debe mostrar la siguiente información:
- [ ] Tipo de documento.
- [ ] Número de identificación.
- [ ] Nombre completo del aprendiz.
- [ ] Datos de la resolución:
  - Muestra el **Número** y la **Fecha** si ya se ingresaron.
  - Si se guardó con la opción "añadir después", mostrar un botón/enlace rápido para **"Completar datos de resolución"**.

### Paso 2.3: Acciones Operativas
Para cada registro de aprendiz en ambas tablas se debe proveer:
- [ ] Opción para **Editar** (modificar datos de la resolución o el aprendiz).
- [ ] Opción para **Eliminar** (remover al aprendiz de este estado).

---

## 📋 Fase 3: Integraciones de Backend y Generación de Documentos (A Futuro)

### Paso 3.1: Generación de PDFs con jsPDF
Utilizando la librería `jsPDF` (https://github.com/parallax/jsPDF.git), se deben generar dos tipos de documentos institucionales. Ambos deben incluir el logotipo del SENA ubicado en [logoComites.png](file:///c:/Users/USUARIO/Downloads/una/repfora/backend/public/images/logoComites.png) y tener un formato formal/institucional:
- [ ] **Documento de Orden del Día (Al Agendar Comité)**:
  - Generado automáticamente al guardar/agendar el comité.
  - Contenido: Fecha del comité, Lugar, Objeto de la sesión (Analizar el caso de los aprendices citados), listado de Aprendices Citados a Descargos, programa de formación, ficha, temas del orden del día (Saludo, Quórum, Hechos, etc.), Quórum de asistencia (Coordinador Académico, Instructores, Bienestar, Apoyo a Novedades, Vocero, Representante, etc.).
- [ ] **Documento de Acta/Resumen de Cierre (Al Terminar Comité)**:
  - Generado al pasar el estado del comité de "Agendado" a "Terminado".
  - Contenido: Todos los datos generales del comité (Fecha, Hora, Lugar, Quórum), y una sección final detallada de **Decisiones** indicando qué sanción (Plan de Mejoramiento con instructor y fecha límite, Llamado de Atención, Condicionamiento o Cancelación de Matrícula con sus datos de resolución correspondientes) se aplicó individualmente a cada aprendiz.

### Paso 3.2: Envío de Correos Automáticos (Nodemailer)
Utilizando la lógica estructurada en [comites.js](backend/utils/emails/comites.js), se configurará el envío automático de correos (máximo 3 tipos de correos durante todo el ciclo del comité):
- [ ] **Correo 1: Citación al Comité (Al Agendar)**:
  - Destinatarios: Todos los participantes involucrados (Coordinador, Instructores solicitantes/invitados, Bienestar, Novedades, Vocero, Representante y los Aprendices citados).
  - Adjunto: El archivo PDF de la *Orden del Día* generado en el Paso 3.1.
- [ ] **Correo 2: Notificación de Modificación (Al Reagendar/Editar)**:
  - Destinatarios: Todos los participantes involucrados.
  - Se activa si se cambian datos de fecha, hora o lugar del comité agendado.
  - Adjunto: El PDF actualizado de la *Orden del Día*.
- [ ] **Correo 3: Resumen de Finalización (Al Completar)**:
  - Destinatarios: Todos los participantes del comité.
  - Enviado inmediatamente cuando el comité cambia su estado a "Completado/Terminado".
  - Adjunto: El PDF del *Acta/Resumen de Cierre* generado en el Paso 3.1.

### Paso 3.3: Gestión de Archivos en Google Drive (OAuth)
Por facilidad, esta integración se dejará para el final del desarrollo:
- [ ] Almacenar automáticamente en la carpeta de Google Drive configurada:
  - Los documentos/evidencias adjuntos subidos originalmente al solicitar el comité.
  - El PDF de la *Orden del Día* (y su versión actualizada si se edita).
  - El PDF final del *Resumen de Cierre* generado al terminar el comité.

### Paso 3.4: Generación Automática de Novedades Académicas
Al presionar el botón "Completar Comité" en el frontend:
- [ ] Si la decisión incluye **Plan de Mejoramiento**: Generar automáticamente la novedad correspondiente (este tipo ya existe en el sistema).
- [ ] Si la decisión incluye **Condicionamiento de Matrícula** o **Cancelación de Matrícula**:
  - Generar automáticamente la novedad correspondiente.
  - *Regla Crítica*: Estos dos tipos de novedades solo pueden crearse a través del flujo automático de "Completar Comité". **Nunca** deben estar disponibles como opciones de creación manual desde la interfaz gráfica del panel general de Novedades.
