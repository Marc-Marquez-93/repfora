# Project Context & Analysis: Repfora

Este documento resume el estado actual, la pila tecnológica y la estructura arquitectónica del espacio de trabajo local (conocido como repositorio "Frankenstein") para el proyecto `repfora`, así como un análisis detallado del estado del repositorio oficial (`sena-cat-development/repfora`).

## 1. Arquitectura de Repositorios (Local vs Oficial)

### El Repositorio Oficial (`sena-cat-development`)
El repositorio oficial maneja una estructura de **ramas separadas por entorno**:
- **Rama `backend`**: Contiene exclusivamente el código de Node.js en la raíz del repositorio.
- **Rama `frontend`**: Contiene exclusivamente el código de Vue/Vite en la raíz.
- **Ramas de desarrolladores**: Cada desarrollador (Diego, David, Camilo, Jeison, etc.) tiene su propia rama donde trabajan características específicas.

### El Repositorio Local ("Frankenstein")
El repositorio local actual (`Marc-Marquez-93/repfora`) unificó ambas partes en una sola rama `main`, creando dos carpetas distintas:
- `/backend`: Contiene todo el entorno de Node.
- `/frontend`: Contiene todo el entorno de Vue.

Esta estructura facilita el desarrollo unificado, pero requiere el uso de comandos Git avanzados (`git merge -X subtree`) para sincronizar cambios con las ramas aisladas del repositorio oficial sin causar conflictos de rutas.

## 2. Pila Tecnológica (Tech Stack)

### Backend
- **Framework:** Node.js con Express (`express`)
- **Database:** MongoDB vía Mongoose (`mongoose`)
- **Autenticación & Seguridad:** JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), CORS
- **Email/Notificaciones:** Nodemailer (`nodemailer`) con plantillas Handlebars (`hbs`)
- **Utilidades:** Procesamiento de Excel (`exceljs`, `xlsx`), subida de archivos (`express-fileupload`), Cron Jobs (`node-cron`), manejo de PDFs e imágenes (`tinify`, `archiver`)

### Frontend
- **Framework:** Vue 3 (`vue`)
- **Build Tool:** Vite (`vite`)
- **UI Library:** Quasar Framework (`quasar`)
- **State Management:** Pinia (`pinia`)
- **Routing:** Vue Router (`vue-router`)
- **Librerías Clave:** FullCalendar (`@fullcalendar/vue3`), Axios (`axios`), Chart.js (`chart.js`), HTML2PDF (`html2pdf.js`)

## 3. Estado de Ramas y Análisis de Integración (Mayo 2026)

Durante la sincronización del proyecto, se realizó una investigación forense de las ramas oficiales para evitar la pérdida de código crítico (específicamente el módulo de `complementarias` y `planeaciones`).

### Análisis del Frontend
- **Rama `sena-oficial/frontend`**: Desactualizada (último commit el 20 de mayo). No contiene el módulo de complementarias.
- **Rama de Diego (`sena-oficial/diego`)**: Contiene las actualizaciones más recientes (25 de mayo) e integra correcciones de otros desarrolladores como Jeison.
- **Estado Local:** La carpeta `frontend/` actual contiene el código provisto por Diego más el desarrollo del módulo de complementarias. **Es la versión más avanzada y no debe sobrescribirse con la rama oficial `frontend`.**

### Análisis del Backend
- **Rama `sena-oficial/backend`**: Desactualizada. Al intentar integrarla, se comprobó que eliminaba las rutas y servicios del módulo de complementarias.
- **Ramas de David y Camilo**: Ambos desarrolladores trabajaron en el backend hasta el 26 de mayo. 
- **Estado Local:** Se integró la rama de **David** (`sena-oficial/david`) hacia la carpeta `backend/` local, ya que contenía la lógica más reciente para el módulo de complementarias (asignación de coordinadores y programadores, y envío de notificaciones de nuevas solicitudes).

## 4. Verificación de Seguridad: Flujo de Recuperación de Contraseña

Se auditó el flujo de *Reset Password* (Token y Email) garantizando su funcionalidad y seguridad:
1. **Backend (`users.controller.js`):** El endpoint recibe el correo, verifica la existencia del usuario y utiliza `jsonwebtoken` para generar un token criptográfico de recuperación.
2. **Nodemailer:** Utilizando la función utilitaria `sendEmail`, el sistema se conecta a un servidor SMTP y despacha un correo utilizando la plantilla `resertPassword.hbs`, adjuntando el token en una URL segura.
3. **Frontend (`ResetPassword.vue`):** El enrutador intercepta dinámicamente la URL (`/resetpassword/:token`), extrae el token y lo envía junto con la nueva contraseña hacia el endpoint de actualización en el backend, cerrando el ciclo exitosamente.

---
*Documento actualizado automáticamente por Antigravity AI tras el análisis del repositorio.*
