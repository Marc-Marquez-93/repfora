# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

REPFORA is a bilingual (Spanish) web application for SENA (National Learning Service) that manages training schedules, complementary formations, committees, and audits. It's a "Frankenstein" repo - unified locally with frontend and backend in separate folders for development, while the official `sena-cat-development/repfora` repo maintains them on separate branches.

## Repository Structure

```
repfora/
├── backend/          # Node.js/Express API
├── frontend/         # Vue 3 + Quasar + Vite SPA
└── CLAUDE.md         # This file
```

## Common Commands

### Backend (Node.js/Express)
```bash
cd backend
npm install           # Install dependencies
npm run dev           # Development with nodemon (hot reload)
npm start             # Production: node app.js
npm run format        # Prettier formatting
npm run docs:generate # Generate API docs from routes
```

Backend runs on port from `PORT` env var (default 4500).

### Frontend (Vue 3 + Vite)
```bash
cd frontend
npm install           # Install dependencies
npm run dev           # Development server (http://localhost:5173)
npm run build         # Production build to dist/
npm run preview       # Preview production build
npm run format        # Prettier formatting
npm run test          # Playwright E2E tests
npm run testui        # Playwright UI mode
```

### Docker
```bash
# From root
docker-compose up --build      # First time: build and start
docker-compose up -d           # Start in background
docker-compose down            # Stop all services
docker-compose logs -f app     # View logs
```

API accessible at http://localhost:4500/api, Swagger at /api-docs.

## Architecture

### Backend (Node.js/Express)
- **Entry**: `app.js` → imports `server.js` (Server class with express setup)
- **Database**: MongoDB via Mongoose, connection in `database.js`
- **Routes**: `routes/*.routes.js` → controllers → models
- **Controllers**: `controller/*.controller.js` contain business logic
- **Models**: `models/*.js` Mongoose schemas (User, Fiche, Schedule, Instructor, Committee, etc.)
- **Services**: `services/*.js` for cross-cutting concerns (notifications, exports, cron jobs)
- **Cron Jobs**: `cron/*.js` for scheduled tasks (database backups, judgment reviews)
- **Middleware**: JWT auth validation on protected routes via `token` header
- **Swagger**: Auto-generated docs via `swagger-jsdoc`

Key models:
- User/Instructor: Authentication and roles
- Fiche: Training groups/courses
- Schedule: Time-based class scheduling
- ComplementaryRequest: Complementary training requests workflow
- Committee: Academic/disciplinary committee management
- Planning: Instructional planning templates

### Frontend (Vue 3 + Quasar)
- **Entry**: `main.js` → creates Vue app with Quasar, Pinia, Router
- **Router**: Hash mode, routes in `src/routes/routes.js` with auth guard (`checkAuth`)
- **State**: Pinia stores in `src/store/` (persisted to sessionStorage)
- **Components**: `src/layouts/` for reusable layouts, `src/views/` for pages
- **API**: Axios wrapper in `src/common/axios.js` with token injection
- **UI**: Quasar Framework v2, Material Symbols icons, custom CSS vars in `style.css`, siempre debes seguir las instrucciones de la skill ubicada en C:\Users\Aprendiz\.agents\skills\emil-design-eng cuando trabajemos en diseño de interfaces o componentes.


**Roles**: PROGRAMADOR, COORDINADOR, INSTRUCTOR, EVALUADOR, NOVEDADES, USER

Auth flow: Login → JWT token → stored in Pinia → sent via `token` header → validated on backend.

## Key Integration Points

### Frontend ↔ Backend
- Frontend dev server proxies `/api` to `http://localhost:4500` (see `vite.config.js`)
- Token sent as custom header: `{ headers: { token: '...' } }`
- All API responses follow format: `{ msg: "...", data: ... }` or `{ msg: "error" }`

### Complementary Module
Complex workflow spanning both sides:
1. Instructors request complementary training
2. Coordinators assign programmers
3. Notifications sent via `services/complementaryNotificationService.js`
4. Routes: `complementary.routes.js`, controller: `complementary.controller.js`

### Committees
Model defined in `comitte.md` (reference), backend implementation in `comites.routes.js` and `committee.controller.js`.

## Development Notes

### Syncing with Official Repo
The official repo has backend/frontend on separate branches. To sync without conflicts:
```bash
git merge -X subtree=<backend|frontend> origin/<branch-name>
```

### Testing
- Frontend: Playwright in `frontend/tests/`
- Backend: Postman collection in `backend/postman-collection/`

### File Uploads
- Backend uses `express-fileupload`, stored in `backend/uploads/`
- MongoDB stores file metadata/references

### Email/Notifications
- Nodemailer with Handlebars templates
- Google Sheets integration via `googleapis`
- Settings in `services/notificationService.js`

## Style Guide (Frontend)

Follow `STYLES_GUIDE.md` for UI consistency:
- Green theme: `--color_button: #2e7d32`, use `var(--color_*)` CSS vars
- Quasar classes: `bg-green-9 text-white` for primary actions
- Inputs: `filled`, `lazy-rules`, Material Symbols prepend
- Tables: `flat bordered my-sticky-header-table`, no pagination
- Dialogs: green header `bg-green-9`, white title, uppercase
- Badges: `bg-green-10` (active), `bg-red` (inactive)

Reusable components (don't recreate):
- `HeaderLayout` (title + green separator)
- `BtnBack` (back button)
- `Card` (home dashboard cards)

## Environment Variables

Backend `.env` requires:
- `PORT`: Server port (default 4500)
- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: For token signing
- Email credentials (Nodemailer)
- Google Sheets credentials

## Important Files

- `contexto.md`: Detailed architecture, tech stack, branch strategy
- `STYLES_GUIDE.md`: Frontend UI patterns (Vue/Quasar)
- `comitte.md`: Committee data model reference
- `backend/DOCKER.md`: Docker deployment guide
