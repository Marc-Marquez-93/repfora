# Project Context & Analysis: Repfora

This document summarizes the current state, tech stack, and structure of the local "Frankenstein" workspace for the `repfora` project.

## Tech Stack

### Backend
- **Framework:** Node.js with Express (`express`)
- **Database:** MongoDB via Mongoose (`mongoose`)
- **Authentication & Security:** JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), CORS
- **Email/Notifications:** Nodemailer (`nodemailer`)
- **Utilities:** Excel processing (`exceljs`, `xlsx`), File Uploads (`express-fileupload`), Cron Jobs (`node-cron`), PDF/Image manipulation (`tinify`, `archiver`)

### Frontend
- **Framework:** Vue 3 (`vue`)
- **Build Tool:** Vite (`vite`)
- **UI Library:** Quasar Framework (`quasar`)
- **State Management:** Pinia (`pinia`)
- **Routing:** Vue Router (`vue-router`)
- **Key Libraries:** FullCalendar (`@fullcalendar/vue3`), Axios (`axios`), Chart.js (`chart.js`), HTML2PDF (`html2pdf.js`)

## Project Structure & Architecture

### Backend (`/backend`)
The backend is structured using a standard MVC-like pattern for Express applications:
- **`models/`**: Mongoose schemas defining the database entities. Key models include:
  - **Core:** `User`, `Instructor`, `Learner`, `Fiche`, `Program`
  - **Schedules:** `Schedule`, `HistorySchedule`, `OthersSchedule`
  - **Planning:** `Planning`, `PlanningTemplate` *(relevant for Step 3)*
  - **Complementary:** `ComplementaryCatalog`, `ComplementaryRequest` *(relevant for Step 3)*
  - **System/Admin:** `AppSettings`, `Binnacle`, `CurrentAuditState`, `DailyAuditLog`
- **`routes/`, `controller/`, `services/`**: Standard layers to handle HTTP requests, business logic, and database operations.
- **`cron/`**: Background jobs (e.g., automated tasks running via `node-cron`).
- **`helpers/`, `utils/`, `validations/`**: Reusable utility functions and request validation middleware.

### Frontend (`/frontend`)
The frontend is a Single Page Application (SPA) built with Vue 3 and Quasar:
- **`src/components/`**: Reusable UI components.
- **`src/views/`**: Main page views/screens of the application.
- **`src/store/`**: Pinia stores for global state management.
- **`src/services/`**: Axios services to communicate with the backend API.
- **`src/routes/`**: Vue Router configuration.
- **`src/layouts/`**: Base layouts (e.g., standard layout with a navigation drawer and header).

## Current Project State

This is a comprehensive platform for the SENA (Servicio Nacional de Aprendizaje) focused on:
1. **User and Role Management**: Instructors, Learners, Coordinators, etc.
2. **Scheduling**: Managing complex schedules (`Horarios`) for different groups (`Fichas`) and instructors.
3. **Plannings (`planeaciones`)**: Modules for managing educational planning and templates.
4. **Complementary Courses (`complementarias`)**: Handling catalogs and requests for complementary educational courses.

**Security Note:** The root directory contains `Horarios_SENA.zip`, which is noted to contain valid, confidential data.
