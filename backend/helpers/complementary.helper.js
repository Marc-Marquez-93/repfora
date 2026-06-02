import Instructor from "../models/Instructor.js";
import ComplementaryCatalog from "../models/ComplementaryCatalog.js";
import ComplementaryRequest from "../models/ComplementaryRequest.js";
import User from "../models/User.js";
import { coordinationHelper } from "./coordination.helper.js";

const complementaryHelper = {};

complementaryHelper.findInstructorByEmail = async (email) => {
  try {
    const instructor = await Instructor.findOne({
      $or: [
        { email: { $regex: `^${email}$`, $options: "i" } },
        { emailpersonal: { $regex: `^${email}$`, $options: "i" } },
      ],
      status: 0,
    });
    return instructor;
  } catch (error) {
    throw new Error("Error al buscar instructor");
  }
};

complementaryHelper.generateSixDigitCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

complementaryHelper.validateCodeMatch = (accessCode, accessCodeCreatedAt, inputCode) => {
  if (!accessCode) {
    throw new Error("No tiene codigo de verificacion activo");
  }
  if (accessCode !== inputCode) {
    throw new Error("Codigo de verificacion incorrecto");
  }
  const now = new Date();
  const expiration = new Date(accessCodeCreatedAt.getTime() + 5 * 60 * 1000);
  if (now > expiration) {
    throw new Error("El codigo de verificacion ha expirado");
  }
};

complementaryHelper.clearAccessCode = async (instructor) => {
  try {
    instructor.accessCode = null;
    instructor.accessCodeCreatedAt = null;
    await instructor.save();
  } catch (error) {
    throw new Error("Error al limpiar codigo de acceso");
  }
};

complementaryHelper.validateExistCatalogById = async (id) => {
  try {
    const catalog = await ComplementaryCatalog.findById(id, { status: 0 });
    if (!catalog) {
      throw new Error();
    }
  } catch (error) {
    throw new Error("El curso del catálogo no existe");
  }
};

complementaryHelper.validateExistRequestById = async (id) => {
  try {
    const request = await ComplementaryRequest.findById(id, { status: 0 });
    if (!request) {
      throw new Error();
    }
  } catch (error) {
    throw new Error("La solicitud no existe");
  }
};

complementaryHelper.validateRequestOwner = async (id, instructorEmail) => {
  try {
    const instructor = await complementaryHelper.findInstructorByEmail(
      instructorEmail
    );
    if (!instructor) {
      throw new Error();
    }
    const request = await ComplementaryRequest.findById(id);
    if (!request || request.instructor.toString() !== instructor._id.toString()) {
      throw new Error();
    }
  } catch (error) {
    throw new Error("La solicitud no pertenece al instructor");
  }
};

complementaryHelper.validateRequestRejected = async (id) => {
  try {
    const request = await ComplementaryRequest.findById(id);
    if (!request || request.state !== "RECHAZADA") {
      throw new Error();
    }
  } catch (error) {
    throw new Error("La solicitud no está en estado RECHAZADA");
  }
};

complementaryHelper.validateRequestPending = async (id) => {
  try {
    const request = await ComplementaryRequest.findById(id, { status: 0 });
    if (!request) throw new Error();
    if (request.state !== "PENDIENTE") throw new Error();
  } catch (error) {
    throw new Error("La solicitud no existe o no está en estado PENDIENTE");
  }
};

// ==================== RF-05: Asignación de ficha ====================

complementaryHelper.validateRequestApproved = async (id) => {
  try {
    const request = await ComplementaryRequest.findById(id, { status: 0 });
    if (!request) throw new Error();
    if (request.state !== "APROBADA") throw new Error();
  } catch (error) {
    throw new Error("La solicitud no existe o no está en estado APROBADA");
  }
};

complementaryHelper.validateFichaNumberUnique = async (fichaNumber, excludeId = "") => {
  try {
    const existing = await ComplementaryRequest.findOne({
      fichaNumber: fichaNumber.toUpperCase().trim(),
      status: 0,
      state: { $nin: ["CANCELADA"] },
    });
    if (existing) {
      if (excludeId && existing._id.toString() === excludeId) return;
      throw new Error();
    }
  } catch (error) {
    throw new Error("El número de ficha ya está asignado a otra solicitud activa");
  }
};

complementaryHelper.validateStateTransition = async (id, newState) => {
  const validTransitions = {
    PENDIENTE: ["CANCELADA"],
    RECHAZADA: ["CANCELADA"],
    APROBADA: ["FICHA_ASIGNADA", "CANCELADA"],
    FICHA_ASIGNADA: ["INSCRIPCION", "CANCELADA"],
    INSCRIPCION: ["PROGRAMADA", "CANCELADA"],
    PROGRAMADA: ["EJECUCION", "CANCELADA"],
    EJECUCION: ["CERRADA"],
  };
  try {
    const request = await ComplementaryRequest.findById(id, { status: 0 });
    if (!request) throw new Error();
    const allowed = validTransitions[request.state];
    if (!allowed || !allowed.includes(newState)) {
      throw new Error();
    }
  } catch (error) {
    throw new Error("Transición de estado no válida");
  }
};

// ==================== Normalización y decodificación ====================

complementaryHelper.findComplementaryCoordinator = async () => {
  try {
    const coordination = await coordinationHelper.findCoordinationByName(
      "PROGRAMAS ESPECIALES",
      "coordinator"
    );
    return coordination?.coordinator || null;
  } catch (error) {
    throw new Error("Error al buscar coordinador de complementarias");
  }
};

complementaryHelper.findComplementaryProgrammers = async () => {
  try {
    const coordination = await coordinationHelper.findCoordinationByName(
      "PROGRAMAS ESPECIALES",
      "programmers"
    );
    return coordination?.programmers || [];
  } catch (error) {
    throw new Error("Error al buscar programadores de complementarias");
  }
};

// ==================== Coordinadores (desplegable supervisor) ====================

complementaryHelper.findAllCoordinators = async () => {
  try {
    return await User.find({ role: "COORDINADOR", status: 0 })
      .select("_id name email role")
      .sort({ name: 1 });
  } catch (error) {
    throw new Error("Error al buscar coordinadores");
  }
};

// ==================== Datos de formación (coordinador post-aprobación) ====================

complementaryHelper.validateFormationDataEditable = async (id) => {
  try {
    const request = await ComplementaryRequest.findById(id, { status: 0 });
    if (!request) {
      throw new Error("La solicitud no existe");
    }
    if (request.state !== "APROBADA" && request.state !== "FICHA_ASIGNADA") {
      throw new Error("La solicitud debe estar en estado APROBADA o FICHA_ASIGNADA para agregar datos de formación");
    }
    if (request.formationDataCompleted) {
      throw new Error("Los datos de formación ya fueron completados para esta solicitud");
    }
  } catch (error) {
    if (
      error.message.includes("APROBADA") ||
      error.message.includes("completados") ||
      error.message.includes("no existe")
    ) {
      throw error;
    }
    throw new Error("Error al validar datos de formación");
  }
};

complementaryHelper.normalizeRequestFields = (body) => {
  const textFields = [
    "supervisorNombre",
    "ambienteNombre", "ambienteDireccion", "municipio",
    "vereda", "direccion", "nombreEmpresa", "nitEmpresa",
    "contactoEmpresa", "telefonoEmpresa",
    "requisitosIngreso", "recursosNecesarios",
  ];
  // Campos con enum definido — solo trim, sin toUpperCase (ya vienen con el formato del enum)
  const enumFields = ["tipoPrograma", "tipoPoblacion"];
  const normalized = {};
  for (const field of textFields) {
    normalized[field] = (body[field] || "").toUpperCase().trim();
  }
  for (const field of enumFields) {
    normalized[field] = (body[field] || "").trim();
  }
  return normalized;
};

complementaryHelper.validateSesionesHours = (sesiones, prfDuracionMaxima) => {
  if (!sesiones || !sesiones.length) return;
  const total = sesiones.reduce((sum, s) => sum + (s.totalHoras || 0), 0);
  if (prfDuracionMaxima && total > prfDuracionMaxima) {
    throw new Error(`Las sesiones suman ${total} horas, pero la duracion maxima es ${prfDuracionMaxima}`);
  }
};

// REUNION2 Cambio 2: obtener coordinadores activos para desplegable de supervisor
complementaryHelper.findAllCoordinators = async () => {
  const coordinators = await User.find({ role: "COORDINADOR", status: 0 })
    .select("_id name email")
    .sort({ name: 1 });
  return coordinators;
};

// REUNION2 Cambio 4: validar que se pueden editar datos de formación (estado correcto y no completados)
complementaryHelper.validateFormationDataEditable = async (id) => {
  const request = await ComplementaryRequest.findById(id);
  if (!request) {
    throw new Error("La solicitud no existe");
  }
  if (request.status !== 0) {
    throw new Error("La solicitud está inactiva");
  }
  const validStates = ["APROBADA", "FICHA_ASIGNADA"];
  if (!validStates.includes(request.state)) {
    throw new Error(
      `La solicitud debe estar en estado APROBADA o FICHA_ASIGNADA para editar datos de formación. Estado actual: ${request.state}`
    );
  }
  if (request.formationDataCompleted) {
    throw new Error("Los datos de formación ya fueron completados");
  }
  return request;
};

export { complementaryHelper };
