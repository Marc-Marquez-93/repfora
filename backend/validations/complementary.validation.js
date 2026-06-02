import { check } from "express-validator";
import jwt from "jsonwebtoken";
import webToken from "../middlewares/webToken.js";
import { validateFields } from "../middlewares/validateFields.js";
import { complementaryHelper } from "../helpers/complementary.helper.js";
import { complementaryScheduleHelper } from "../helpers/complementarySchedule.helper.js";
import { complementaryCampesenaHelper } from "../helpers/complementaryCampesena.helper.js";

const {
  validateExistCatalogById,
  validateExistRequestById,
  validateRequestOwner,
  validateRequestRejected,
  validateRequestPending,
  validateRequestApproved,
  validateFichaNumberUnique,
  validateStateTransition,
  validateFormationDataEditable,
} = complementaryHelper;

const { validateToken, validateTokenComplementaria } = webToken;

const {
  validateExistCampesenaById,
  validateNombreUnique,
} = complementaryCampesenaHelper;

const complementaryVali = {};

complementaryVali.validateHeaders = [
  check("token").custom(async (token) => {
    const decoded = jwt.decode(token);
    if (decoded?.scope === "VERIFY") {
      await validateTokenComplementaria(token);
    } else {
      await validateToken(token, false);
    }
  }),
  validateFields,
];

complementaryVali.validateSendCode = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email no es valido").isEmail(),
  check("email").custom(async (email) => {
    const instructor = await complementaryHelper.findInstructorByEmail(email);
    if (!instructor) throw new Error("Instructor no encontrado");
  }),
  validateFields,
];

complementaryVali.validateVerifyCode = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email no es valido").isEmail(),
  check("code", "El codigo es obligatorio").notEmpty(),
  check("code", "El codigo debe tener 6 digitos").isLength({ min: 6, max: 6 }),
  check("code", "El codigo debe ser numerico").isNumeric(),
  validateFields,
];

complementaryVali.validateExistCatalog = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistCatalogById(id);
  }),
  check("token").custom(async (token) => {
    const decoded = jwt.decode(token);
    if (decoded?.scope === "VERIFY") {
      await validateTokenComplementaria(token);
    } else {
      await validateToken(token);
    }
  }),
  validateFields,
];

complementaryVali.validateRegisterRequest = [
  check("catalogCourse", "El curso del catálogo es obligatorio").notEmpty(),
  check("catalogCourse", "El curso del catálogo no es valido").isMongoId(),
  check("catalogCourse").custom(async (catalogCourse) => {
    await validateExistCatalogById(catalogCourse);
  }),
  check("numAprendices", "El numero de aprendices es obligatorio").notEmpty(),
  check("numAprendices", "El numero de aprendices debe ser numerico").isNumeric(),
  check("tipoPrograma", "El tipo de programa es obligatorio").notEmpty(),
  check("tipoPoblacion", "El tipo de poblacion es obligatorio").notEmpty(),
  // REUNION2 Cambio 3: campesena opcional (ObjectId, validar que exista si viene)
  check("campesena")
    .optional()
    .isMongoId()
    .withMessage("La campesena no es valida")
    .custom(async (campesena) => {
      if (campesena) {
        await validateExistCampesenaById(campesena);
      }
    }),
  // REUNION2 Cambio 2: supervisor opcional (ObjectId, validar que sea COORDINADOR si viene)
  check("supervisor")
    .optional()
    .isMongoId()
    .withMessage("El supervisor no es valido")
    .custom(async (supervisor) => {
      if (supervisor) {
        const User = (await import("../models/User.js")).default;
        const user = await User.findOne({ _id: supervisor, role: "COORDINADOR", status: 0 });
        if (!user) {
          throw new Error("El supervisor no es un coordinador activo");
        }
      }
    }),
  check("prfDuracionMaxima").optional().isNumeric(),
  check("token").custom(async (token) => {
    await validateTokenComplementaria(token);
  }),
  validateFields,
];

complementaryVali.validateExistRequest = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("token").custom(async (token) => {
    const decoded = jwt.decode(token);
    if (decoded?.scope === "VERIFY") {
      await validateTokenComplementaria(token);
    } else {
      await validateToken(token);
    }
  }),
  validateFields,
];

complementaryVali.validateUpdateRequest = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("token").custom(async (token, { req }) => {
    const decoded = await validateTokenComplementaria(token);
    await validateRequestOwner(req.params.id, decoded.email);
  }),
  check("id").custom(async (id) => {
    await validateRequestRejected(id);
  }),
  validateFields,
];

complementaryVali.validateResubmitRequest = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("token").custom(async (token, { req }) => {
    const decoded = await validateTokenComplementaria(token);
    await validateRequestOwner(req.params.id, decoded.email);
  }),
  check("id").custom(async (id) => {
    await validateRequestRejected(id);
  }),
  validateFields,
];

complementaryVali.validateInstructorRequests = [
  check("token").custom(async (token) => {
    await validateTokenComplementaria(token);
  }),
  validateFields,
];

// ==================== RF-04: Aprobación de solicitudes ====================

complementaryVali.validateApprove = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("id").custom(async (id) => {
    await validateRequestPending(id);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR" && decoded?.rol !== "PROGRAMADOR") {
      throw new Error("Solo un coordinador o programador puede realizar esta acción");
    }
  }),
  validateFields,
];

complementaryVali.validateReject = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("id").custom(async (id) => {
    await validateRequestPending(id);
  }),
  check("observations", "Las observaciones son obligatorias").notEmpty(),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR" && decoded?.rol !== "PROGRAMADOR") {
      throw new Error("Solo un coordinador o programador puede realizar esta acción");
    }
  }),
  validateFields,
];

// ==================== RF-05: Asignación de ficha ====================

complementaryVali.validateAssignFicha = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("id").custom(async (id) => {
    await validateRequestApproved(id);
  }),
  check("fichaCaracterizacion", "La ficha de caracterización es obligatoria").notEmpty(),
  // REUNION2 Cambio 6: fechas requeridas al asignar ficha (antes las enviaba el instructor)
  check("fechaInicio", "La fecha de inicio es obligatoria").notEmpty(),
  check("fechaInicio", "La fecha de inicio no es valida").isISO8601(),
  check("fechaFin", "La fecha de fin es obligatoria").notEmpty(),
  check("fechaFin", "La fecha de fin no es valida").isISO8601(),
  check("fechaInscripcion", "La fecha de inscripción es obligatoria").notEmpty(),
  check("fechaInscripcion", "La fecha de inscripción no es valida").isISO8601(),
  check("fechaMatriculaInicio", "La fecha de inicio de matrícula es obligatoria").notEmpty(),
  check("fechaMatriculaInicio", "La fecha de inicio de matrícula no es valida").isISO8601(),
  check("fechaMatriculaFin", "La fecha de fin de matrícula es obligatoria").notEmpty(),
  check("fechaMatriculaFin", "La fecha de fin de matrícula no es valida").isISO8601(),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "ADMIN" && decoded?.rol !== "PROGRAMADOR") {
      throw new Error("Solo un administrador o programador puede asignar fichas");
    }
  }),
  validateFields,
];

// ==================== RF-04 extendido: Coordinador completa datos de formación ====================

complementaryVali.validateFormationData = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("id").custom(async (id) => {
    await validateFormationDataEditable(id);
  }),
  check("competencies", "Las competencias son obligatorias").notEmpty(),
  check("competencies", "Las competencias deben ser un array").isArray({ min: 1 }),
  check("outcomes", "Los resultados de aprendizaje son obligatorios").notEmpty(),
  check("outcomes", "Los resultados de aprendizaje deben ser un array").isArray({ min: 1 }),
  check("sesiones").optional().isArray(),
  check("learningActivity").optional().isString(),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR" && decoded?.rol !== "ADMIN" && decoded?.rol !== "PROGRAMADOR") {
      throw new Error("Solo un coordinador, administrador o programador puede completar datos de formación");
    }
  }),
  validateFields,
];

complementaryVali.validateChangeState = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("newState", "El nuevo estado es obligatorio").notEmpty(),
  check("newState", "El estado no es valido").isIn([
    "FICHA_ASIGNADA",
    "INSCRIPCION",
    "PROGRAMADA",
    "EJECUCION",
    "CANCELADA",
  ]),
  check("id").custom(async (id, { req }) => {
    await validateStateTransition(id, req.body.newState);
  }),
  check("observations")
    .if((value, { req }) => req.body.newState === "CANCELADA")
    .notEmpty()
    .withMessage("Las observaciones son obligatorias al cancelar"),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "ADMIN" && decoded?.rol !== "PROGRAMADOR") {
      throw new Error("Solo un administrador o programador puede cambiar el estado");
    }
  }),
  validateFields,
];

complementaryVali.validateCloseFicha = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistRequestById(id);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (!["ADMIN", "COORDINADOR", "PROGRAMADOR"].includes(decoded?.rol)) {
      throw new Error("Solo un administrador o coordinador puede cerrar una ficha");
    }
  }),
  validateFields,
];

// ==================== RF-08: Programación horaria complementaria ====================

const daysValid = [0, 1, 2, 3, 4, 5, 6];

complementaryVali.validateScheduleComplementary = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await complementaryScheduleHelper.validateRequestProgrammable(id);
  }),
  check("instructor", "El instructor es obligatorio").notEmpty(),
  check("instructor", "El instructor no es valido").isMongoId(),
  check("environment")
    .optional()
    .isMongoId()
    .withMessage("El ambiente no es valido"),
  check("days", "Los dias son obligatorios").notEmpty(),
  check("days", "Los dias no son validos").isArray(),
  check("days").custom(async (days) => {
    days.forEach((day) => {
      if (!daysValid.includes(day)) {
        throw new Error("Los dias no son validos");
      }
    });
  }),
  // REUNION2 Cambio 9: fstart/fend opcionales para COORDINADOR, obligatorios para ADMIN/PROGRAMADOR
  check("fstart")
    .optional()
    .isISO8601()
    .withMessage("La fecha de inicio no es valida"),
  check("fend")
    .optional()
    .isISO8601()
    .withMessage("La fecha de fin no es valida"),
  check("fstart").custom(async (fstart, { req }) => {
    if (fstart && req.body.fend) {
      if (new Date(fstart) > new Date(req.body.fend)) {
        throw new Error("La fecha de inicio no puede ser mayor a la fecha de fin");
      }
    }
  }),
  check("tstart", "La hora de inicio es obligatoria").notEmpty(),
  check("tend", "La hora de fin es obligatoria").notEmpty(),
  check("events", "Los eventos son obligatorios").notEmpty(),
  check("events", "Los eventos no son validos").isArray(),
  check("events").custom(async (events) => {
    if (Array.isArray(events)) {
      events.forEach((event) => {
        if (event.start) {
          const date = new Date(event.start);
          if (date == "Invalid Date") {
            throw new Error("Los eventos no son validos");
          }
        }
      });
    }
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (
      decoded?.rol !== "ADMIN" &&
      decoded?.rol !== "PROGRAMADOR" &&
      decoded?.rol !== "COORDINADOR"
    ) {
      throw new Error("Solo un administrador, programador o coordinador puede programar horarios complementarios");
    }
  }),
  validateFields,
];

// ==================== RF-10: Reportes ====================

complementaryVali.validateReportQuery = [
  check("token").custom(async (token) => {
    await validateToken(token);
  }),
  validateFields,
];

// ==================== Progreso de carga masiva ====================

complementaryVali.validateUploadStatus = [
  check("jobId", "El jobId es obligatorio").notEmpty(),
  check("token").custom(async (token) => {
    const decoded = jwt.decode(token);
    if (decoded?.scope === "VERIFY") {
      await validateTokenComplementaria(token);
    } else {
      await validateToken(token, false);
    }
  }),
  validateFields,
];

// ==================== RF-10: Reprogramacion de ficha ====================

complementaryVali.validateReschedule = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("fstart", "La fecha de inicio es obligatoria").notEmpty(),
  check("fstart", "La fecha de inicio no es valida").isISO8601(),
  check("fend", "La fecha de fin es obligatoria").notEmpty(),
  check("fend", "La fecha de fin no es valida").isISO8601(),
  check("tstart", "La hora de inicio es obligatoria").notEmpty(),
  check("tend", "La hora de fin es obligatoria").notEmpty(),
  check("days", "Los dias son obligatorios").notEmpty(),
  check("days", "Los dias no son validos").isArray(),
  check("events", "Los eventos son obligatorios").notEmpty(),
  check("events", "Los eventos no son validos").isArray(),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (!["ADMIN", "COORDINADOR", "PROGRAMADOR"].includes(decoded?.rol)) {
      throw new Error("No tienes permisos para realizar esta accion");
    }
  }),
  validateFields,
];

// REUNION2 Cambio 4: validación para datos de formación (coordinador completa competencias/resultados/sesiones)
complementaryVali.validateFormationData = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateFormationDataEditable(id);
  }),
  check("competencies", "Las competencias son obligatorias").notEmpty(),
  check("competencies", "Las competencias deben ser un array").isArray(),
  check("outcomes", "Los resultados son obligatorios").notEmpty(),
  check("outcomes", "Los resultados deben ser un array").isArray(),
  check("sesiones", "Las sesiones son obligatorias").notEmpty(),
  check("sesiones", "Las sesiones deben ser un array").isArray(),
  check("sesiones").custom(async (sesiones) => {
    if (Array.isArray(sesiones)) {
      sesiones.forEach((s, i) => {
        if (!s.fecha) throw new Error(`La sesión ${i + 1} debe tener fecha`);
        if (!s.horaInicio) throw new Error(`La sesión ${i + 1} debe tener hora de inicio`);
        if (!s.horaFin) throw new Error(`La sesión ${i + 1} debe tener hora de fin`);
        if (!s.totalHoras) throw new Error(`La sesión ${i + 1} debe tener total de horas`);
      });
    }
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "ADMIN" && decoded?.rol !== "COORDINADOR") {
      throw new Error("Solo un administrador o coordinador puede completar datos de formación");
    }
  }),
  validateFields,
];

// REUNION2 Cambio 3: validaciones CRUD campesena (solo COORDINADOR)
complementaryVali.validateRegisterCampesena = [
  check("nombre", "El nombre es obligatorio").notEmpty(),
  check("nombre").custom(async (nombre) => {
    await validateNombreUnique(nombre);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR") {
      throw new Error("Solo un coordinador puede crear campesenas");
    }
  }),
  validateFields,
];

complementaryVali.validateUpdateCampesena = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistCampesenaById(id);
  }),
  check("nombre", "El nombre es obligatorio").notEmpty(),
  check("nombre").custom(async (nombre, { req }) => {
    await validateNombreUnique(nombre, req.params.id);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR") {
      throw new Error("Solo un coordinador puede editar campesenas");
    }
  }),
  validateFields,
];

complementaryVali.validateDeleteCampesena = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistCampesenaById(id);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
    const decoded = jwt.decode(token);
    if (decoded?.rol !== "COORDINADOR") {
      throw new Error("Solo un coordinador puede desactivar campesenas");
    }
  }),
  validateFields,
];

complementaryVali.validateExistCampesena = [
  check("id", "El id es obligatorio").notEmpty(),
  check("id", "El id no es valido").isMongoId(),
  check("id").custom(async (id) => {
    await validateExistCampesenaById(id);
  }),
  check("token").custom(async (token) => {
    await validateToken(token);
  }),
  validateFields,
];

export { complementaryVali };
