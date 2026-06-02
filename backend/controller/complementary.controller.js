import AppSettings from "../models/AppSettings.js";
import ComplementaryCatalog from "../models/ComplementaryCatalog.js";
import ComplementaryCampesena from "../models/ComplementaryCampesena.js";
import ComplementaryRequest from "../models/ComplementaryRequest.js";
import Instructor from "../models/Instructor.js";
import Program from "../models/Program.js";
import Schedule from "../models/Schedule.js";
import xlsx from "xlsx";
import sendEmail from "../utils/emails/sendEmail.js";
import registerAction from "../middlewares/binnacle.js";
import webToken from "../middlewares/webToken.js";
import { complementaryHelper } from "../helpers/complementary.helper.js";
import { complementaryScheduleHelper } from "../helpers/complementarySchedule.helper.js";
import { calculateNumHoursWork } from "../utils/functions/dates.js";
import { notifyApproval, notifyRejection, notifyFichaAssigned, notifyNewRequest, notifyCancellation, notifyScheduled, notifyResubmit } from "../services/complementaryNotificationService.js";
import User from "../models/User.js";
import ComplementaryCampesena from "../models/ComplementaryCampesena.js";
import { jobStore } from "../utils/jobStore.js";

const compCtrl = {};

//send access code to instructor emails (email + emailpersonal) — no requiere token
compCtrl.sendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const instructor = await complementaryHelper.findInstructorByEmail(email);

    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    const code = complementaryHelper.generateSixDigitCode();
    instructor.accessCode = code;
    instructor.accessCodeCreatedAt = new Date();
    await instructor.save();

    const fromEmail = process.env.FROM_EMAIL;
    const fromPass = process.env.SECURY_EMAIL;
    const subject = "CODIGO DE ACCESO - COMPLEMENTARIAS SENA";
    const template = "./template/complementaryAccessCode.hbs";

    const sendResults = { email: false, emailpersonal: false };

    if (instructor.email) {
      try {
        await sendEmail(fromEmail, fromPass, [instructor.email], subject, { code }, template);
        sendResults.email = true;
      } catch (err) {
        console.log("[EMAIL] Error enviando a email institucional:", err.message);
      }
    }

    if (instructor.emailpersonal) {
      try {
        await sendEmail(fromEmail, fromPass, [instructor.emailpersonal], subject, { code }, template);
        sendResults.emailpersonal = true;
      } catch (err) {
        console.log("[EMAIL] Error enviando a email personal:", err.message);
      }
    }

    if (!sendResults.email && !sendResults.emailpersonal) {
      return res.status(400).json({ msg: "No fue posible enviar el código de verificación. Intente nuevamente" });
    }

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "ENVIAR CODIGO DE ACCESO",
        data: { email: instructor.email, numdocument: instructor.numdocument, enviadoA: sendResults },
      },
      null
    );

    res.json({
      msg: "Codigo de verificacion enviado correctamente",
      emails: [instructor.email, instructor.emailpersonal].filter(Boolean),
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//verify access code and grant access — no requiere token previo, devuelve token COMPLEMENTARIA
compCtrl.verifyCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    const instructor = await complementaryHelper.findInstructorByEmail(email);

    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    complementaryHelper.validateCodeMatch(
      instructor.accessCode,
      instructor.accessCodeCreatedAt,
      code
    );

    await complementaryHelper.clearAccessCode(instructor);

    const token = await webToken.generateTokenComplementaria(instructor);

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "VERIFICAR CODIGO DE ACCESO",
        data: { email: instructor.email, numdocument: instructor.numdocument },
      },
      null
    );

    res.json({
      msg: "Acceso a complementarias concedido",
      token,
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        tpdocument: instructor.tpdocument,
        numdocument: instructor.numdocument,
        email: instructor.email,
        emailpersonal: instructor.emailpersonal,
        phone: instructor.phone,
        knowledge: instructor.knowledge,
        thematicarea: instructor.thematicarea,
        bindingtype: instructor.bindingtype,
        caphour: instructor.caphour,
        hourswork: instructor.hourswork,
      },
    });
  } catch (error) {
    console.log(error);
    if (
      error.message.includes("incorrecto") ||
      error.message.includes("expirado") ||
      error.message.includes("No tiene codigo")
    ) {
      return res.status(401).json({ msg: error.message });
    }
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//get all catalogs with filters and monthly alert
compCtrl.getCatalogs = async (req, res) => {
  const { status, prfDenominacion, prfCodigo, lineaTecnologica, redConocimiento } = req.query;
  try {
    const filter = {};
    if (status !== undefined) filter.status = Number(status);
    if (prfCodigo) filter.prfCodigo = Number(prfCodigo);
    if (prfDenominacion) filter.prfDenominacion = { $regex: prfDenominacion, $options: "i" };
    if (lineaTecnologica) filter.lineaTecnologica = { $regex: lineaTecnologica, $options: "i" };
    if (redConocimiento) filter.redConocimiento = { $regex: redConocimiento, $options: "i" };

    const catalogs = await ComplementaryCatalog.find(filter).sort({ createdAt: -1 });

    const settings = await AppSettings.findOne();
    let catalogUpdateAlert = false;
    let lastUploadDate = null;
    if (settings && settings.catalogLastUploadDate) {
      lastUploadDate = settings.catalogLastUploadDate;
      const daysSinceUpload = (Date.now() - new Date(lastUploadDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpload > 30) {
        catalogUpdateAlert = true;
      }
    }

    res.json({ data: catalogs, catalogUpdateAlert, lastUploadDate });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//get catalog by id
compCtrl.getCatalogId = async (req, res) => {
  const { id } = req.params;
  try {
    const catalog = await ComplementaryCatalog.findById(id);
    res.json(catalog);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//upload excel with catalog courses — reemplazo completo del catálogo (polling con jobId)
compCtrl.uploadExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ msg: "No se ha subido ningún archivo" });
    }

    const filePath = req.files.file.tempFilePath || null;
    const workbook = filePath
      ? xlsx.readFile(filePath)
      : xlsx.read(req.files.file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ msg: "El archivo Excel no tiene datos" });
    }

    // Normalizar encabezados: quitar acentos, espacios, paréntesis → guiones bajos
    const normalizeKey = (key) =>
      key
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    const normalizedRows = rows.map((row) => {
      const newRow = {};
      for (const [key, val] of Object.entries(row)) {
        newRow[normalizeKey(key)] = val;
      }
      return newRow;
    });

    // Crear job y responder inmediatamente con jobId
    const { jobId, state } = jobStore.createJob();
    state.total = normalizedRows.length;
    const token = req.headers.token;

    res.json({ msg: "Carga masiva iniciada", jobId });

    // Procesamiento en background
    (async () => {
      try {
        const parseDate = (val) => {
          if (!val || (typeof val === "string" && val.trim() === "") || val === "(en blanco)") return null;
          if (typeof val === "number") {
            const date = new Date((val - 25569) * 86400 * 1000);
            return isNaN(date.getTime()) ? null : date;
          }
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        };

        const parseNum = (val) => {
          const n = Number(val);
          return isNaN(n) ? 0 : n;
        };

        await ComplementaryCatalog.deleteMany({});

        for (let i = 0; i < normalizedRows.length; i++) {
          const row = normalizedRows[i];
          try {
            const prfCodigo = row.PRF_CODIGO;
            const prfVersion = row.PRF_VERSION;
            const modalidad = (row.MODALIDAD || "").toString().toUpperCase().trim();

            if (!prfCodigo || !prfVersion) {
              state.errorDetails.push({ row: i + 2, reason: "Falta PRF_CODIGO o PRF_VERSION" });
              state.errors++;
              state.percent = Math.round(((i + 1) / state.total) * 100);
              continue;
            }

            if (modalidad === "VIRTUAL") {
              state.skippedVirtual++;
              state.percent = Math.round(((i + 1) / state.total) * 100);
              continue;
            }

            const newCatalog = new ComplementaryCatalog({
              prfCodigo,
              prfVersion,
              codVer: (row.COD_VER || "").toString().toUpperCase().trim(),
              tipoFormacion: row.TIPO_DE_FORMACION || "",
              prfDenominacion: (row.PRF_DENOMINACION || "").toString().toUpperCase().trim(),
              nivelFormacion: row.NIVEL_DE_FORMACION || "",
              prfDuracionMaxima: parseNum(row.PRF_DURACION_MAXIMA),
              prfDurEtapaLectiva: parseNum(row.PRF_DUR_ETAPA_LECTIVA),
              prfDurEtapaProd: parseNum(row.PRF_DUR_ETAPA_PROD),
              prfFchRegistro: parseDate(row.PRF_FCH_REGISTRO),
              fechaActivoEnEjecucion: parseDate(row.FECHA_ACTIVO_EN_EJECUCION),
              prfEdadMinRequerida: row.PRF_EDAD_MIN_REQUERIDA ? parseNum(row.PRF_EDAD_MIN_REQUERIDA) : null,
              prfGradoMinRequerido: row.PRF_GRADO_MIN_REQUERIDO || "",
              prfDescripcionRequisito: row.PRF_DESCRIPCION_REQUISITO || "",
              prfResolucion: row.PRF_RESOLUCION === "(en blanco)" ? "" : (row.PRF_RESOLUCION || ""),
              prfFechaResolucion: parseDate(row.PRF_FECHA_RESOLUCION),
              prfApoyoFic: row.PRF_APOYO_FIC || "",
              prfCreditos: parseNum(row.PRF_CREDITOS),
              prfAlamedida: row.PRF_ALAMEDIDA || "",
              lineaTecnologica: row.LINEA_TECNOLOGICA || "",
              redTecnologica: row.RED_TECNOLOGICA || "",
              redConocimiento: row.RED_DE_CONOCIMIENTO || "",
              modalidad: row.MODALIDAD || "",
              apuestasPrioritarias: row.APUESTAS_PRIORITARIAS || "",
              fic: row.FIC || "",
            });
            await newCatalog.save();
            state.created++;
          } catch (error) {
            state.errorDetails.push({ row: i + 2, reason: error.message || "Error desconocido al guardar" });
            state.errors++;
          }
          state.percent = Math.round(((i + 1) / state.total) * 100);
        }

        await registerAction(
          "CATALOGO COMPLEMENTARIO",
          { event: "CARGA MASIVA EXCEL", data: { created: state.created, skippedVirtual: state.skippedVirtual, errors: state.errors, total: state.total } },
          token
        );

        const settings = await AppSettings.findOne();
        if (settings) {
          settings.catalogLastUploadDate = new Date();
          await settings.save();
        } else {
          await AppSettings.create({ catalogLastUploadDate: new Date() });
        }

        state.done = true;
        jobStore.scheduleCleanup(jobId);
      } catch (error) {
        console.log(error);
        state.done = true;
        state.failed = true;
        state.error = error.message || "Error desconocido en el procesamiento";
        jobStore.scheduleCleanup(jobId);
      }
    })();
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//consultar progreso de la carga masiva por jobId
compCtrl.getUploadStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const state = jobStore.getJob(jobId);
    if (!state) {
      return res.status(404).json({ msg: "Trabajo no encontrado o ya expirado" });
    }
    res.json(state);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== Coordinador de complementarias ====================

compCtrl.getComplementaryCoordinator = async (req, res) => {
  try {
    const coordinator = await complementaryHelper.findComplementaryCoordinator();
    if (!coordinator) {
      return res.status(404).json({ msg: "Coordinador de complementarias no encontrado" });
    }
    await coordinator.populate("coordinations");
    res.json({ coordinator });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// REUNION2 Cambio 2: obtener coordinadores activos para desplegable de supervisor
compCtrl.getCoordinators = async (req, res) => {
  try {
    const coordinators = await complementaryHelper.findAllCoordinators();
    res.json(coordinators);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== REUNION2 Cambio 3: CRUD campesena ====================

//listar campesenas activas
compCtrl.getCampesenas = async (req, res) => {
  try {
    const campesenas = await ComplementaryCampesena.find({ status: 0 })
      .sort({ nombre: 1 });
    res.json(campesenas);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//obtener una campesena por id
compCtrl.getCampesenaById = async (req, res) => {
  const { id } = req.params;
  try {
    const campesena = await ComplementaryCampesena.findById(id);
    if (!campesena || campesena.status !== 0) {
      return res.status(404).json({ msg: "La campesena no existe" });
    }
    res.json(campesena);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//registrar nueva campesena (solo COORDINADOR)
compCtrl.registerCampesena = async (req, res) => {
  const { nombre } = req.body;
  try {
    const nueva = new ComplementaryCampesena({
      nombre: nombre.toUpperCase().trim(),
    });
    await nueva.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "REGISTRAR CAMPESINA",
        data: nueva,
      },
      req.headers.token
    );

    res.json({ msg: "Campesena registrada correctamente", data: nueva });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//editar campesena (solo COORDINADOR)
compCtrl.updateCampesena = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    const campesena = await ComplementaryCampesena.findById(id);
    if (!campesena || campesena.status !== 0) {
      return res.status(404).json({ msg: "La campesena no existe" });
    }

    campesena.nombre = nombre.toUpperCase().trim();
    await campesena.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "ACTUALIZAR CAMPESINA",
        data: campesena,
      },
      req.headers.token
    );

    res.json({ msg: "Campesena actualizada correctamente", data: campesena });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//desactivar campesena (solo COORDINADOR)
compCtrl.deactivateCampesena = async (req, res) => {
  const { id } = req.params;
  try {
    const campesena = await ComplementaryCampesena.findById(id);
    if (!campesena || campesena.status !== 0) {
      return res.status(404).json({ msg: "La campesena no existe" });
    }

    campesena.status = 1;
    await campesena.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "DESACTIVAR CAMPESINA",
        data: campesena,
      },
      req.headers.token
    );

    res.json({ msg: "Campesena desactivada correctamente" });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-03: Solicitudes de complementarias ====================

//register new complementary request — instructor solo llena datos básicos, coordinador completa después
compCtrl.registerRequest = async (req, res) => {
  const {
    catalogCourse,
    environment,
    formationDocument,
    prfDuracionMaxima,
    numAprendices,
    tipoPrograma,
    tipoPoblacion,
    requisitosIngreso,
    recursosNecesarios,
    // REUNION2 Cambio 2: supervisor como ObjectId
    supervisor,
    // REUNION2 Cambio 3: campesena como ObjectId
    campesena,
  } = req.body;
  try {
    const decoded = await webToken.decodeComplementariaToken(req.headers.token);
    const instructor = await complementaryHelper.findInstructorByEmail(
      decoded.email
    );
    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    const catalog = await ComplementaryCatalog.findById(catalogCourse);
    if (!catalog) {
      return res.status(400).json({ msg: "El curso del catálogo no existe" });
    }

    // REUNION2 Cambio 2: denormalizar nombre del supervisor si viene como ObjectId
    let supervisorNombre = "";
    if (supervisor) {
      const supervisorUser = await User.findById(supervisor);
      if (supervisorUser) {
        supervisorNombre = supervisorUser.name;
      }
    }

    const newRequest = new ComplementaryRequest({
      catalogCourse,
      catalogCourseName: catalog.prfDenominacion,
      catalogCourseCode: String(catalog.prfCodigo),
      catalogCourseVersion: String(catalog.prfVersion),
      prfDuracionMaxima: catalog.prfDuracionMaxima || prfDuracionMaxima || 0,
      instructor: instructor._id,
      ...complementaryHelper.normalizeRequestFields(req.body),
      // Sobreescribir supervisorNombre con el del usuario encontrado
      supervisorNombre,
      supervisor: supervisor || null,
      // Campesena no lo ve el instructor — lo asigna el coordinador después
      campesena: null,
      environment: environment || null,
      formationDocument: formationDocument || "",
      // REUNION2 Cambio 1: instructor ya no llena estos campos
      competencies: [],
      outcomes: [],
      learningActivity: "",
      sesiones: [],
      // REUNION2 Cambio 2: supervisor ObjectId + denormalización
      supervisor: supervisor || null,
      supervisorNombre,
      // REUNION2 Cambio 3: campesena ObjectId
      campesena: campesena || null,
      numAprendices: numAprendices || 0,
      // Proyecto asociado ya no lo llena el instructor — lo completa el coordinador en formation-data
      proyectoAsociado: "",
    });

    // Generar numeroSolicitud consecutivo
    const count = await ComplementaryRequest.countDocuments();
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    newRequest.numeroSolicitud = `${String(count + 1).padStart(7, "0")}-${dateStr}`;

    newRequest.history.push({
      previousState: "",
      newState: "PENDIENTE",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Solicitud creada",
    });

    await newRequest.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "REGISTRAR SOLICITUD",
        data: { id: newRequest._id, catalogCourseName: newRequest.catalogCourseName, instructor: decoded.email },
      },
      req.headers.token
    );

    const instructorName = instructor.name || decoded.email;
    const coordinator = await complementaryHelper.findComplementaryCoordinator();
    const programmers = await complementaryHelper.findComplementaryProgrammers();
    await notifyNewRequest(newRequest, instructorName);

    res.json({
      msg: "Solicitud registrada correctamente",
      data: newRequest,
      notified: {
        coordinator: coordinator
          ? { name: coordinator.name, email: coordinator.email }
          : null,
        programmers: programmers.map((p) => ({ name: p.name, email: p.email })),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//get all requests (admin ve todo, instructor solo las suyas)
// REUNION2 Cambio 12: filtros fichaNumber (regex), sortBy, sortOrder
compCtrl.getRequests = async (req, res) => {
  const { state, instructor, fichaNumber, sortBy, sortOrder } = req.query;
  try {
    const { isInstructor, ...decoded } = await webToken.decodeAnyToken(req.headers.token);

    const filter = { status: 0 };
    if (state) filter.state = state;
    if (fichaNumber) {
      filter.fichaNumber = { $regex: fichaNumber, $options: "i" };
    }

    if (isInstructor || decoded.rol === "INSTRUCTOR") {
      const instructorDoc = await complementaryHelper.findInstructorByEmail(
        decoded.email
      );
      if (!instructorDoc) {
        return res.status(401).json({ msg: "Instructor no encontrado" });
      }
      filter.instructor = instructorDoc._id;
    } else {
      if (instructor) filter.instructor = instructor;
    }

    // Whitelist de campos permitidos para ordenamiento (previene inyección NoSQL)
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fechaInicio",
      "fechaFin",
      "state",
      "fichaNumber",
      "numeroSolicitud",
      "catalogCourseName",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const requests = await ComplementaryRequest.find(filter)
      .populate("catalogCourse", "prfDenominacion prfCodigo prfVersion")
      .populate("instructor", "name email numdocument")
      .populate("environment", "name")
      .sort({ [sortField]: sortDirection });
    res.json(requests);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//get request by id (admin ve cualquiera, instructor solo las suyas)
compCtrl.getRequestId = async (req, res) => {
  const { id } = req.params;
  try {
    const { isInstructor, ...decoded } = await webToken.decodeAnyToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id)
      .populate("catalogCourse")
      .populate("instructor", "name email numdocument phone")
      .populate("environment", "name");

    if (!request) {
      return res.status(400).json({ msg: "La solicitud no existe" });
    }

    if (isInstructor || decoded.rol === "INSTRUCTOR") {
      const instructorDoc = await complementaryHelper.findInstructorByEmail(
        decoded.email
      );
      if (
        !instructorDoc ||
        request.instructor._id.toString() !== instructorDoc._id.toString()
      ) {
        return res
          .status(401)
          .json({ msg: "No tiene permisos para ver esta solicitud" });
      }
    }

    if (!request.visto) {
      request.visto = true;
      await request.save();
    }

    res.json(request);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//get requests by instructor (from token)
compCtrl.getInstructorRequests = async (req, res) => {
  try {
    const decoded = await webToken.decodeComplementariaToken(req.headers.token);
    const instructor = await complementaryHelper.findInstructorByEmail(
      decoded.email
    );
    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    const requests = await ComplementaryRequest.find({
      instructor: instructor._id,
      status: 0,
    })
      .populate("catalogCourse", "prfDenominacion prfCodigo prfVersion")
      .populate("environment", "name")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//update request (only if RECHAZADA, only owner instructor)
compCtrl.updateRequest = async (req, res) => {
  const { id } = req.params;
  const {
    environment,
    formationDocument,
    competencies,
    outcomes,
    learningActivity,
    idCampesena,
    rutaCampesena,
    supervisorNombre,
    ambienteNombre,
    ambienteDireccion,
    fechaInicio,
    fechaFin,
    fechaInscripcion,
    fechaMatriculaInicio,
    fechaMatriculaFin,
    municipio,
    vereda,
    direccion,
    nombreEmpresa,
    nitEmpresa,
    contactoEmpresa,
    telefonoEmpresa,
    numAprendices,
    tipoPrograma,
    tipoPoblacion,
    requisitosIngreso,
    recursosNecesarios,
    proyectoAsociado,
  } = req.body;
  try {
    const decoded = await webToken.decodeComplementariaToken(req.headers.token);

    await ComplementaryRequest.findByIdAndUpdate(id, {
      ...complementaryHelper.normalizeRequestFields(req.body),
      environment: environment || null,
      formationDocument: formationDocument || "",
      competencies: competencies || [],
      outcomes: outcomes || [],
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      fechaInscripcion: fechaInscripcion || null,
      fechaMatriculaInicio: fechaMatriculaInicio || null,
      fechaMatriculaFin: fechaMatriculaFin || null,
      numAprendices: numAprendices || 0,
    });

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "EDITAR SOLICITUD RECHAZADA",
        data: { id, instructor: decoded.email },
      },
      req.headers.token
    );
    res.json({ msg: "Solicitud actualizada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//resubmit request (RECHAZADA → PENDIENTE)
compCtrl.resubmitRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const decoded = await webToken.decodeComplementariaToken(req.headers.token);
    const request = await ComplementaryRequest.findById(id);

    request.state = "PENDIENTE";
    request.history.push({
      previousState: "RECHAZADA",
      newState: "PENDIENTE",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Solicitud reenviada por el instructor",
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "REENVIAR SOLICITUD",
        data: { id, instructor: decoded.email },
      },
      req.headers.token
    );

    const instructor = await complementaryHelper.findInstructorByEmail(decoded.email);
    const instructorName = instructor?.name || decoded.email;
    await notifyResubmit(request, instructorName);

    res.json({ msg: "Solicitud reenviada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-04: Aprobación de solicitudes ====================

//approve request — PENDIENTE → APROBADA + crear Program (solo COORDINADOR y ADMIN)
compCtrl.approveRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request || request.state !== "PENDIENTE") {
      return res
        .status(400)
        .json({ msg: "La solicitud no existe o no está en estado PENDIENTE" });
    }

    request.state = "APROBADA";
    request.history.push({
      previousState: "PENDIENTE",
      newState: "APROBADA",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Solicitud aprobada",
    });
    await request.save();

    const newProgram = new Program({
      code: request.catalogCourseCode,
      name: request.catalogCourseName,
      version: request.catalogCourseVersion,
    });
    await newProgram.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "APROBAR SOLICITUD",
        data: {
          id: request._id,
          catalogCourseName: request.catalogCourseName,
          approvedBy: decoded.email,
          programId: newProgram._id,
        },
      },
      req.headers.token
    );

    await notifyApproval(request);

    res.json({ msg: "Solicitud aprobada correctamente", data: request });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//reject request — PENDIENTE → RECHAZADA + observaciones obligatorias (solo COORDINADOR y ADMIN)
compCtrl.rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { observations } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request || request.state !== "PENDIENTE") {
      return res
        .status(400)
        .json({ msg: "La solicitud no existe o no está en estado PENDIENTE" });
    }

    request.state = "RECHAZADA";
    request.history.push({
      previousState: "PENDIENTE",
      newState: "RECHAZADA",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: observations.toUpperCase().trim(),
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "RECHAZAR SOLICITUD",
        data: {
          id: request._id,
          catalogCourseName: request.catalogCourseName,
          rejectedBy: decoded.email,
          observations,
        },
      },
      req.headers.token
    );

    await notifyRejection(request, observations);

    res.json({ msg: "Solicitud rechazada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-05: Asignación de ficha y gestión de estados ====================

//get all coordinators for supervisor dropdown — cualquier token válido
compCtrl.getCoordinators = async (req, res) => {
  try {
    const coordinators = await complementaryHelper.findAllCoordinators();
    res.json(coordinators);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//assign ficha number to approved request — APROBADA → FICHA_ASIGNADA (solo ADMIN)
//Ahora también asigna las fechas del programa (antes las llenaba el instructor)
compCtrl.assignFicha = async (req, res) => {
  const { id } = req.params;
  const {
    fichaCaracterizacion,
    fechaInicio,
    fechaFin,
    fechaInscripcion,
    fechaMatriculaInicio,
    fechaMatriculaFin,
  } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request || request.state !== "APROBADA") {
      return res
        .status(400)
        .json({ msg: "La solicitud no existe o no está en estado APROBADA" });
    }

    request.fichaCaracterizacion = (fichaCaracterizacion || "").toUpperCase().trim();
    // REUNION2 Cambio 6: fechas se asignan al asignar ficha (antes las enviaba el instructor)
    request.fechaInicio = fechaInicio || null;
    request.fechaFin = fechaFin || null;
    request.fechaInscripcion = fechaInscripcion || null;
    request.fechaMatriculaInicio = fechaMatriculaInicio || null;
    request.fechaMatriculaFin = fechaMatriculaFin || null;
    request.state = "FICHA_ASIGNADA";
    request.history.push({
      previousState: "APROBADA",
      newState: "FICHA_ASIGNADA",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: `Ficha asignada — ${request.numeroSolicitud}`,
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "ASIGNAR FICHA",
        data: {
          id: request._id,
          numeroSolicitud: request.numeroSolicitud,
          fichaCaracterizacion: request.fichaCaracterizacion,
          catalogCourseName: request.catalogCourseName,
          assignedBy: decoded.email,
          fechaInicio,
          fechaFin,
        },
      },
      req.headers.token
    );

    await notifyFichaAssigned(request);

    res.json({ msg: "Ficha asignada correctamente", data: request });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== Coordinador completa datos de formación post-aprobación ====================

//coordinador agrega competencias, resultados, sesiones — marca formationDataCompleted = true
compCtrl.addFormationData = async (req, res) => {
  const { id } = req.params;
  const {
    competencies,
    outcomes,
    learningActivity,
    sesiones,
    proyectoAsociado,
    campesena,
  } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request) {
      return res.status(400).json({ msg: "La solicitud no existe" });
    }

    // Verificar que se pueden agregar datos de formación
    if (request.state !== "APROBADA" && request.state !== "FICHA_ASIGNADA") {
      return res.status(400).json({
        msg: "La solicitud debe estar en estado APROBADA o FICHA_ASIGNADA para agregar datos de formación",
      });
    }

    if (request.formationDataCompleted) {
      return res.status(400).json({
        msg: "Los datos de formación ya fueron completados para esta solicitud",
      });
    }

    // Guardar datos de formación
    request.competencies = competencies.map((c) => c.toUpperCase().trim());
    request.outcomes = outcomes.map((o) => o.toUpperCase().trim());
    request.learningActivity = (learningActivity || "").toUpperCase().trim();
    request.proyectoAsociado = (proyectoAsociado || "").toUpperCase().trim();

    // Sesiones con campos expandidos (competencia + resultados por sesión)
    if (sesiones && sesiones.length > 0) {
      request.sesiones = sesiones.map((s) => ({
        fecha: s.fecha || "",
        horaInicio: s.horaInicio || "",
        horaFin: s.horaFin || "",
        totalHoras: s.totalHoras || 0,
        competencia: (s.competencia || "").toUpperCase().trim(),
        resultados: (s.resultados || []).map((r) => r.toUpperCase().trim()),
        actividadAprendizaje: (s.actividadAprendizaje || "").toUpperCase().trim(),
      }));
    }

    // Asignar campesena si viene (coordinador la selecciona)
    if (campesena) {
      const CampesenaModel = (await import("../models/ComplementaryCampesena.js")).default;
      const campesenaDoc = await CampesenaModel.findOne({ _id: campesena, status: 0 });
      if (!campesenaDoc) {
        return res.status(400).json({ msg: "La opción de campesena seleccionada no existe" });
      }
      request.campesena = campesena;
    }

    request.formationDataCompleted = true;
    request.history.push({
      previousState: request.state,
      newState: request.state,
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Datos de formación completados por coordinador",
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "COMPLETAR DATOS DE FORMACIÓN",
        data: {
          id: request._id,
          numeroSolicitud: request.numeroSolicitud,
          catalogCourseName: request.catalogCourseName,
          competencias: competencies.length,
          resultados: outcomes.length,
          sesiones: sesiones ? sesiones.length : 0,
          completedBy: decoded.email,
        },
      },
      req.headers.token
    );

    res.json({
      msg: "Datos de formación guardados correctamente",
      data: request,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

//change state manually — avance de estados y cancelación (solo ADMIN)
compCtrl.changeState = async (req, res) => {
  const { id } = req.params;
  const { newState, observations } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request) {
      return res.status(400).json({ msg: "La solicitud no existe" });
    }

    const previousState = request.state;
    request.state = newState;
    request.history.push({
      previousState,
      newState,
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: observations ? observations.toUpperCase().trim() : `Estado cambiado a ${newState}`,
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "CAMBIAR ESTADO SOLICITUD",
        data: {
          id: request._id,
          fichaNumber: request.fichaNumber,
          previousState,
          newState,
          changedBy: decoded.id,
          observations: observations || "",
        },
      },
      req.headers.token
    );

    // Enviar notificación por correo si la solicitud fue cancelada
    if (newState === "CANCELADA") {
      await notifyCancellation(request, previousState, observations || "");
    }

    res.json({ msg: "Estado actualizado correctamente", data: request });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// REUNION2 Cambio 4: coordinador completa datos de formación (competencias, resultados, sesiones)
compCtrl.addFormationData = async (req, res) => {
  const { id } = req.params;
  const { competencies, outcomes, learningActivity, sesiones } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request) {
      return res.status(400).json({ msg: "La solicitud no existe" });
    }

    // Normalizar campos de texto
    request.competencies = (competencies || []).map((c) => c.toUpperCase().trim());
    request.outcomes = (outcomes || []).map((o) => o.toUpperCase().trim());
    request.learningActivity = (learningActivity || "").toUpperCase().trim();
    request.sesiones = (sesiones || []).map((s) => ({
      ...s,
      competencia: (s.competencia || "").toUpperCase().trim(),
      resultados: (s.resultados || []).map((r) => r.toUpperCase().trim()),
      actividadAprendizaje: (s.actividadAprendizaje || "").toUpperCase().trim(),
    }));
    request.formationDataCompleted = true;

    // Registrar en history
    request.history.push({
      previousState: request.state,
      newState: request.state,
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Datos de formación completados por el coordinador",
    });

    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "COMPLETAR DATOS DE FORMACIÓN",
        data: {
          requestId: request._id,
          fichaNumber: request.fichaNumber,
          completedBy: decoded.email,
        },
      },
      req.headers.token
    );

    res.json({ msg: "Datos de formación completados correctamente", data: request });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-12: Cierre de ficha complementaria ====================

compCtrl.closeFicha = async (req, res) => {
  const { id } = req.params;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const request = await ComplementaryRequest.findById(id);
    if (!request) {
      return res.status(400).json({ msg: "La solicitud no existe" });
    }

    if (request.state !== "PROGRAMADA") {
      return res
        .status(400)
        .json({ msg: "La solicitud debe estar en estado PROGRAMADA para poder cerrarla" });
    }

    // Buscar schedules asociados a esta solicitud
    const schedules = await Schedule.find({
      complementaryRequest: id,
      status: 0,
    });

    // Verificar que todos los outcomes esten evaluados
    const pendingSchedules = schedules.filter((s) => !s.rated);
    if (pendingSchedules.length > 0) {
      return res.status(400).json({
        msg: "Hay resultados de aprendizaje sin evaluar. No se puede cerrar la ficha",
        pending: pendingSchedules.map((s) => ({
          _id: s._id,
          outcome: s.outcome,
          tstart: s.tstart,
          tend: s.tend,
          days: s.days,
        })),
      });
    }

    // Todos evaluados — cerrar ficha
    const previousState = request.state;
    request.state = "CERRADA";
    request.history.push({
      previousState,
      newState: "CERRADA",
      changedBy: decoded.id,
      changedByRole: decoded.rol,
      observations: "Ficha complementaria cerrada — todos los resultados evaluados",
    });
    await request.save();

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "CERRAR FICHA COMPLEMENTARIA",
        data: {
          id: request._id,
          fichaNumber: request.fichaNumber,
          catalogCourseName: request.catalogCourseName,
          closedBy: decoded.email,
          totalSchedules: schedules.length,
        },
      },
      req.headers.token
    );

    res.json({
      msg: "Ficha complementaria cerrada correctamente",
      data: request,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-08: Programación horaria complementaria ====================

compCtrl.scheduleComplementary = async (req, res) => {
  const { id } = req.params;
  const {
    instructor,
    environment,
    days,
    fstart,
    fend,
    tstart,
    tend,
    events,
    supporttext,
    observation,
  } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);
    const isCoordinador = decoded.rol === "COORDINADOR";

    // REUNION2 Cambio 9: fstart/fend opcionales para COORDINADOR, obligatorios para ADMIN/PROGRAMADOR
    if (!fstart || !fend) {
      if (isCoordinador) {
        // Coordinador: derivar fechas del array de events
        if (!events || !Array.isArray(events) || events.length === 0) {
          return res.status(400).json({
            msg: "No se proporcionaron fechas de inicio/fin y no hay eventos para derivarlas",
          });
        }
      } else {
        return res.status(400).json({
          msg: "Las fechas de inicio y fin son obligatorias",
        });
      }
    }

    // 1. Validar que la solicitud sea programable
    const request = await complementaryScheduleHelper.validateRequestProgrammable(id);

    // 2. Validar que no exista ya un schedule activo para esta solicitud
    await complementaryScheduleHelper.validateNoDuplicateSchedule(id);

    // Calcular eventDates del instructor (necesario para derivar fstart/fend y para horas)
    const eventDates = events
      .filter((e) => e.idInstructor === instructor && e.autogenerated)
      .map((e) => e.start)
      .filter(Boolean);

    // Resolver fstart/fend: prioridad eventDates > body > error
    let resolvedFstart = fstart;
    let resolvedFend = fend;
    if (eventDates.length > 0) {
      const sortedDates = [...eventDates].sort((a, b) => new Date(a) - new Date(b));
      resolvedFstart = sortedDates[0];
      resolvedFend = sortedDates[sortedDates.length - 1];
    } else if (isCoordinador) {
      // Coordinador sin eventDates del instructor: usar todos los events
      const allDates = events.map((e) => e.start).filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
      if (allDates.length === 0) {
        return res.status(400).json({
          msg: "No hay eventos válidos para derivar las fechas de inicio y fin",
        });
      }
      resolvedFstart = allDates[0];
      resolvedFend = allDates[allDates.length - 1];
    }

    // 3. Validar disponibilidad del instructor contra TODA la colección Schedule
    await complementaryScheduleHelper.validateInstructorAvailability(
      instructor, resolvedFstart, resolvedFend, tstart, tend, days
    );

    // 4. Validar disponibilidad del ambiente (si viene) contra TODA la colección Schedule
    if (environment) {
      await complementaryScheduleHelper.validateEnvironmentAvailability(
        environment, resolvedFstart, resolvedFend, tstart, tend, days
      );
    }

    // 5. Calcular horas de trabajo
    const hourswork = calculateNumHoursWork(tstart, tend, eventDates.length);

    // 6. Validar límite de horas del curso
    await complementaryScheduleHelper.validateHoursLimit(id, instructor, hourswork);

    // 7. Buscar el Program creado en RF-04
    const dbProgram = await Program.findOne({
      code: request.catalogCourseCode,
      name: request.catalogCourseName,
    });
    if (!dbProgram) {
      return res.status(400).json({
        msg: "No se encontró el programa asociado a esta solicitud. Verifique que la solicitud fue aprobada correctamente",
      });
    }

    // 8. Crear el Schedule complementario
    const newSchedule = new Schedule({
      program: dbProgram._id,
      instructor,
      supporttext: (supporttext || "PLANEACIÓN COMPLEMENTARIA").toUpperCase().trim(),
      observation: (observation || "PROGRAMADO DESDE EL MÓDULO DE COMPLEMENTARIAS").toUpperCase().trim(),
      environment: environment || undefined,
      days,
      fstart: new Date(resolvedFstart),
      fend: new Date(resolvedFend),
      tstart,
      tend,
      hourswork,
      events: eventDates.map((d) => new Date(d)),
      scheduleType: "COMPLEMENTARIA",
      complementaryRequest: request._id,
      status: 0,
    });
    await newSchedule.save();

    // 9. Actualizar horas del instructor
    const dbInstructor = await Instructor.findById(instructor);
    if (dbInstructor) {
      dbInstructor.hourswork = (dbInstructor.hourswork || 0) + hourswork;
      await dbInstructor.save();
    }

    // 10. Avanzar estado si es necesario
    if (request.state === "FICHA_ASIGNADA" || request.state === "INSCRIPCION") {
      const previousState = request.state;
      request.state = "PROGRAMADA";
      request.history.push({
        previousState,
        newState: "PROGRAMADA",
        changedBy: decoded.id,
        changedByRole: decoded.rol,
        observations: "Estado avanzado automáticamente al programar horario",
      });
      await request.save();
    }

    // 11. Notificar al instructor por correo
    await notifyScheduled(request, newSchedule);

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "PROGRAMAR HORARIO COMPLEMENTARIO",
        data: {
          scheduleId: newSchedule._id,
          requestId: request._id,
          fichaNumber: request.fichaNumber,
          catalogCourseName: request.catalogCourseName,
          hourswork,
          programmedBy: decoded.email,
        },
      },
      req.headers.token
    );

    res.json({
      msg: "Horario complementario programado correctamente",
      data: newSchedule,
    });
  } catch (error) {
    console.log(error);
    if (
      error.message.includes("programación") ||
      error.message.includes("ambiente") ||
      error.message.includes("solicitud") ||
      error.message.includes("horas") ||
      error.message.includes("programa") ||
      error.message.includes("formación")
    ) {
      return res.status(400).json({ msg: error.message });
    }
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-10: Reportes ====================

compCtrl.getFichasSinRuta = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  try {
    const filter = {
      state: { $in: ["FICHA_ASIGNADA", "INSCRIPCION"] },
      status: 0,
    };
    if (fechaInicio || fechaFin) {
      filter.fechaInicio = {};
      if (fechaInicio) filter.fechaInicio.$gte = new Date(fechaInicio);
      if (fechaFin) filter.fechaInicio.$lte = new Date(fechaFin);
    }

    const solicitudes = await ComplementaryRequest.find(filter)
      .populate("instructor", "name email numdocument")
      .sort({ createdAt: -1 });

    const solicitudesIds = solicitudes.map((s) => s._id);
    const schedules = await Schedule.find({
      complementaryRequest: { $in: solicitudesIds },
      status: 0,
    }).select("complementaryRequest");

    const conSchedule = new Set(schedules.map((s) => s.complementaryRequest.toString()));
    const fichasSinRuta = solicitudes.filter(
      (s) => !conSchedule.has(s._id.toString())
    );

    res.json({
      msg: "Reporte generado correctamente",
      total: fichasSinRuta.length,
      data: fichasSinRuta,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.getProyeccionMensual = async (req, res) => {
  const { mes, anio } = req.query;
  try {
    const anioNum = Number(anio) || new Date().getFullYear();
    const mesNum = Number(mes);

    const matchStage = {
      status: 0,
      state: { $nin: ["RECHAZADA", "CANCELADA"] },
    };

    if (mesNum >= 1 && mesNum <= 12) {
      const inicio = new Date(anioNum, mesNum - 1, 1);
      const fin = new Date(anioNum, mesNum, 0, 23, 59, 59);
      matchStage.fechaInicio = { $gte: inicio, $lte: fin };
    } else {
      const inicio = new Date(anioNum, 0, 1);
      const fin = new Date(anioNum, 11, 31, 23, 59, 59);
      matchStage.fechaInicio = { $gte: inicio, $lte: fin };
    }

    const proyeccion = await ComplementaryRequest.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            mes: { $month: "$fechaInicio" },
            anio: { $year: "$fechaInicio" },
            estado: "$state",
          },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": 1, "_id.mes": 1 } },
    ]);

    res.json({
      msg: "Reporte generado correctamente",
      anio: anioNum,
      data: proyeccion,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.getFichasPorEstado = async (req, res) => {
  const { estado } = req.query;
  try {
    const matchStage = { status: 0 };
    if (estado) matchStage.state = estado;

    const fichas = await ComplementaryRequest.find(matchStage)
      .populate("instructor", "name email numdocument")
      .select("fichaNumber catalogCourseName catalogCourseCode state fechaInicio fechaFin instructor")
      .sort({ createdAt: -1 });

    const resumen = await ComplementaryRequest.aggregate([
      { $match: { status: 0 } },
      { $group: { _id: "$state", cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
    ]);

    res.json({
      msg: "Reporte generado correctamente",
      resumen,
      total: fichas.length,
      data: fichas,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.getHorasPorMes = async (req, res) => {
  const { instructor, mes, anio } = req.query;
  try {
    const anioNum = Number(anio) || new Date().getFullYear();
    const mesNum = Number(mes);

    const scheduleFilter = {
      scheduleType: "COMPLEMENTARIA",
      status: 0,
    };

    if (instructor) scheduleFilter.instructor = instructor;

    if (mesNum >= 1 && mesNum <= 12) {
      const inicio = new Date(anioNum, mesNum - 1, 1);
      const fin = new Date(anioNum, mesNum, 0, 23, 59, 59);
      scheduleFilter.fstart = { $gte: inicio, $lte: fin };
    } else {
      const inicio = new Date(anioNum, 0, 1);
      const fin = new Date(anioNum, 11, 31, 23, 59, 59);
      scheduleFilter.fstart = { $gte: inicio, $lte: fin };
    }

    const schedules = await Schedule.find(scheduleFilter)
      .populate("instructor", "name email numdocument")
      .populate("complementaryRequest", "catalogCourseName fichaNumber prfDuracionMaxima");

    const porInstructor = {};
    for (const schedule of schedules) {
      const instId = schedule.instructor?._id?.toString();
      if (!instId) continue;
      if (!porInstructor[instId]) {
        porInstructor[instId] = {
          instructor: schedule.instructor,
          horasTotales: 0,
          fichas: [],
        };
      }
      porInstructor[instId].horasTotales += schedule.hourswork || 0;
      porInstructor[instId].fichas.push({
        fichaNumber: schedule.complementaryRequest?.fichaNumber || "",
        curso: schedule.complementaryRequest?.catalogCourseName || "",
        horas: schedule.hourswork || 0,
        fechaInicio: schedule.fstart,
        fechaFin: schedule.fend,
      });
    }

    const data = Object.values(porInstructor);

    res.json({
      msg: "Reporte generado correctamente",
      anio: anioNum,
      mes: mesNum || "Todos",
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== RF-10: Reprogramacion de ficha ====================

compCtrl.rescheduleFicha = async (req, res) => {
  const { id } = req.params;
  const { fstart, fend, tstart, tend, days, events } = req.body;
  try {
    const decoded = webToken.decodeToken(req.headers.token);

    const schedule = await Schedule.findById(id);
    if (!schedule || schedule.status !== 0) {
      return res.status(400).json({ msg: "El horario no existe o esta inactivo" });
    }
    if (schedule.scheduleType !== "COMPLEMENTARIA") {
      return res.status(400).json({ msg: "Solo se pueden reprogramar horarios complementarios" });
    }

    const newFstart = new Date(fstart);
    if (newFstart < schedule.fstart) {
      return res.status(400).json({
        msg: "La nueva fecha de inicio no puede ser anterior a la fecha de inicio original",
      });
    }

    const previousHours = schedule.hourswork || 0;

    if (fstart) schedule.fstart = fstart;
    if (fend) schedule.fend = fend;
    if (tstart) schedule.tstart = tstart;
    if (tend) schedule.tend = tend;
    if (days) schedule.days = days;
    if (events) schedule.events = events;

    const newHours = calculateNumHoursWork(schedule.tstart, schedule.tend, schedule.events.length);
    schedule.hourswork = newHours;

    await schedule.save();

    const diferencia = newHours - previousHours;
    if (diferencia !== 0) {
      const instructor = await Instructor.findById(schedule.instructor);
      if (instructor) {
        instructor.hourswork = Math.max(0, instructor.hourswork + diferencia);
        await instructor.save();
      }
    }

    if (schedule.complementaryRequest) {
      await ComplementaryRequest.findByIdAndUpdate(schedule.complementaryRequest, {
        $push: {
          history: {
            previousState: "PROGRAMADA",
            newState: "PROGRAMADA",
            changedBy: decoded.id,
            changedByRole: decoded.rol,
            observations: `Ficha reprogramada. Nuevo rango: ${new Date(fstart).toLocaleDateString("es-CO")} - ${new Date(fend).toLocaleDateString("es-CO")}`,
          },
        },
      });
    }

    await registerAction(
      "COMPLEMENTARIAS",
      {
        event: "REPROGRAMAR FICHA",
        data: { scheduleId: id, previousHours, newHours, rescheduledBy: decoded.email },
      },
      req.headers.token
    );

    res.json({ msg: "Horario reprogramado correctamente", data: schedule });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

// ==================== CRUD CampeSENA ====================

compCtrl.getCampesenas = async (req, res) => {
  try {
    const campesenas = await ComplementaryCampesena.find({ status: 0 }).sort({ nombre: 1 });
    res.json(campesenas);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.getCampesenaById = async (req, res) => {
  const { id } = req.params;
  try {
    const campesena = await ComplementaryCampesena.findById(id);
    res.json(campesena);
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.registerCampesena = async (req, res) => {
  const { nombre } = req.body;
  try {
    const newCampesena = new ComplementaryCampesena({ nombre: nombre.toUpperCase().trim() });
    await newCampesena.save();
    res.json({ msg: "Registro creado correctamente", data: newCampesena });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.updateCampesena = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    const campesena = await ComplementaryCampesena.findByIdAndUpdate(
      id,
      { nombre: nombre.toUpperCase().trim() },
      { new: true }
    );
    res.json({ msg: "Registro actualizado correctamente", data: campesena });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

compCtrl.deactivateCampesena = async (req, res) => {
  const { id } = req.params;
  try {
    const campesena = await ComplementaryCampesena.findByIdAndUpdate(
      id,
      { status: 1 },
      { new: true }
    );
    res.json({ msg: "Registro desactivado correctamente", data: campesena });
  } catch (error) {
    res.status(400).json({ msg: "No fue posible terminar la operacion" });
  }
};

export { compCtrl };
