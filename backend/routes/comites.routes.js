import { Router } from "express";
import { comitesCtrl } from "../controller/comites.controller.js";
import { comitesVali } from "../validations/comites.validation.js";

const {
  validateSendCode,
  validateVerifyCode,
} = comitesVali;

const {
  sendCode,
  verifyCode,
} = comitesCtrl;

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

export { routerComites };
