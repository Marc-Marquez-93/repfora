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

## 🎨 Fase 3: Adornos y Pulido Estético
- [ ] Integrar animaciones de transición fluidas en las pantallas del flujo condicional (Fase 1).
- [ ] Incorporar librerías visuales para alertas (e.g., SweetAlert2) para la validación de exclusividad en condicionamiento/cancelación.
- [ ] Asegurar que el diseño sea totalmente responsivo y coherente con la paleta de colores de REPFORA.
