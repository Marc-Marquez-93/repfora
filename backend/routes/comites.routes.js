import { Router } from "express";
import { comitesCtrl } from "../controller/comites.controller.js";
import { comitesVali } from "../validations/comites.validation.js";
import { committeeCtrl } from "../controller/committee.controller.js";
import { authenticateComitesToken } from "../middlewares/authMiddleware.js";

const {
  validateSendCode,
  validateVerifyCode,
} = comitesVali;

const {
  sendCode,
  verifyCode,
} = comitesCtrl;

const {
  getCommittees,
  getCommitteeById,
  registerCommittee,
  updateCommittee,
  cancelCommittee,
  getCommitteesByFiche,
  getPendingCommittees,
  getScheduledCommittees,
  searchFiches,
  searchInstructors,
} = committeeCtrl;

const routerComites = Router();

// ==================== Acceso con código ====================

/**
 * @swagger
 * /api/comites/access/send-code:
 *   post:
 *     summary: Envía código de verificación al correo del instructor
 *     tags: [Comites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "instructor@sena.edu.co"
 *     responses:
 *       200:
 *         description: Código enviado correctamente
 *       401:
 *         description: Instructor no encontrado
 */
routerComites.post("/access/send-code", validateSendCode, sendCode);

/**
 * @swagger
 * /api/comites/access/verify-code:
 *   post:
 *     summary: Verifica código y devuelve token de acceso a comités
 *     tags: [Comites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "384729"
 *     responses:
 *       200:
 *         description: Acceso concedido, retorna token JWT
 */
routerComites.post("/access/verify-code", validateVerifyCode, verifyCode);

// ==================== CRUD de Comités ====================
// NOTA: Las rutas de lectura no requieren autenticación para facilitar el acceso
// Las rutas de escritura están protegidas con authenticateComitesToken

/**
 * @swagger
 * /api/comites:
 *   get:
 *     summary: Obtiene todos los comités
 *     tags: [Comites]
 *     responses:
 *       200:
 *         description: Lista de comités
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Committee'
 */
routerComites.get("/", getCommittees);

/**
 * @swagger
 * /api/comites/pending:
 *   get:
 *     summary: Obtiene comités pendientes
 *     tags: [Comites]
 *     responses:
 *       200:
 *         description: Lista de comités pendientes
 */
routerComites.get("/pending", getPendingCommittees);

/**
 * @swagger
 * /api/comites/scheduled:
 *   get:
 *     summary: Obtiene comités programados
 *     tags: [Comites]
 *     responses:
 *       200:
 *         description: Lista de comités programados
 */
routerComites.get("/scheduled", getScheduledCommittees);

/**
 * @swagger
 * /api/comites/fiche/:ficheId:
 *   get:
 *     summary: Obtiene comités por ficha
 *     tags: [Comites]
 *     parameters:
 *       - in: path
 *         name: ficheId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de comités de la ficha
 */
routerComites.get("/fiche/:ficheId", getCommitteesByFiche);

/**
 * @swagger
 * /api/comites/search/fiches:
 *   get:
 *     summary: Buscar fichas por número
 *     tags: [Comites]
 *     parameters:
 *       - in: query
 *         name: number
 *         schema:
 *           type: string
 *         description: Número de ficha a buscar
 *     responses:
 *       200:
 *         description: Lista de fichas encontradas
 */
routerComites.get("/search/fiches", searchFiches);

/**
 * @swagger
 * /api/comites/search/instructors:
 *   get:
 *     summary: Buscar instructores por nombre o documento
 *     tags: [Comites]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Texto a buscar en nombre o documento
 *     responses:
 *       200:
 *         description: Lista de instructores encontrados
 */
routerComites.get("/search/instructors", searchInstructors);

/**
 * @swagger
 * /api/comites/:id:
 *   get:
 *     summary: Obtiene un comité por ID
 *     tags: [Comites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comité encontrado
 *       404:
 *         description: Comité no encontrado
 */
routerComites.get("/:id", getCommitteeById);

/**
 * @swagger
 * /api/comites:
 *   post:
 *     summary: Crea un nuevo comité (requiere autenticación)
 *     tags: [Comites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fiche
 *               - requestingInstructors
 *               - learners
 *             properties:
 *               fiche:
 *                 type: string
 *               requestingInstructors:
 *                 type: array
 *                 items:
 *                   type: string
 *               learners:
 *                 type: array
 *               meetingDate:
 *                 type: string
 *               meetingTime:
 *                 type: string
 *               meetingLocation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comité creado correctamente
 *       400:
 *         description: Error al crear comité
 *       401:
 *         description: No autorizado
 */
routerComites.post("/", authenticateComitesToken, registerCommittee);

/**
 * @swagger
 * /api/comites/:id:
 *   put:
 *     summary: Actualiza un comité (requiere autenticación)
 *     tags: [Comites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meetingDate:
 *                 type: string
 *               meetingTime:
 *                 type: string
 *               meetingLocation:
 *                 type: string
 *               status:
 *                 type: string
 *               learners:
 *                 type: array
 *     responses:
 *       200:
 *         description: Comité actualizado correctamente
 *       404:
 *         description: Comité no encontrado
 *       401:
 *         description: No autorizado
 */
routerComites.put("/:id", authenticateComitesToken, updateCommittee);

/**
 * @swagger
 * /api/comites/:id/cancel:
 *   put:
 *     summary: Cancela un comité (requiere autenticación)
 *     tags: [Comites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comité cancelado correctamente
 *       404:
 *         description: Comité no encontrado
 *       401:
 *         description: No autorizado
 */
routerComites.put("/:id/cancel", authenticateComitesToken, cancelCommittee);

// ==================== Búsquedas para comités ====================

/**
 * @swagger
 * /api/comites/search/fiches:
 *   get:
 *     summary: Buscar fichas por número
 *     tags: [Comites]
 *     parameters:
 *       - in: query
 *         name: number
 *         schema:
 *           type: string
 *         description: Número de ficha a buscar
 *     responses:
 *       200:
 *         description: Lista de fichas encontradas
 */
routerComites.get("/search/fiches", searchFiches);

/**
 * @swagger
 * /api/comites/search/instructors:
 *   get:
 *     summary: Buscar instructores por nombre o documento
 *     tags: [Comites]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Texto a buscar en nombre o documento
 *     responses:
 *       200:
 *         description: Lista de instructores encontrados
 */
routerComites.get("/search/instructors", searchInstructors);

export { routerComites };
