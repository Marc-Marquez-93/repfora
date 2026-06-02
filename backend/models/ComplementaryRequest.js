/**
 * @typedef {Object} ComplementaryRequest
 * @property {string} numeroSolicitud - Consecutivo automático (0000001-YYYYMMDD)
 * @property {Schema.Types.ObjectId} catalogCourse - Referencia al curso del catálogo
 * @property {string} catalogCourseName - Nombre del curso denormalizado
 * @property {string} catalogCourseCode - Código del curso denormalizado
 * @property {string} catalogCourseVersion - Versión del curso denormalizada
 * @property {number} prfDuracionMaxima - Duración máxima en horas del programa
 * @property {Schema.Types.ObjectId} instructor - Referencia al instructor solicitante
 * @property {string} idCampesena - ID Campesena (deshabilitado para instructor, lo llena coordinador)
 * @property {string} rutaCampesena - Ruta Campesena (deshabilitado para instructor, lo llena coordinador)
 * @property {Schema.Types.ObjectId} campesena - Referencia a la opción campesena seleccionada
 * @property {string} supervisorNombre - Nombre del supervisor (denormalizado)
 * @property {Schema.Types.ObjectId} supervisor - Referencia al coordinador supervisor
 * @property {string} ambienteNombre - Nombre del ambiente de formación
 * @property {string} ambienteDireccion - Dirección del ambiente de formación
 * @property {string} formationDocument - Ruta del documento de formación subido
 * @property {string[]} competencies - Competencias de formación (llenado por coordinador post-aprobación)
 * @property {string[]} outcomes - Resultados de aprendizaje (llenado por coordinador post-aprobación)
 * @property {string} learningActivity - Actividad de aprendizaje (llenado por coordinador post-aprobación)
 * @property {Array} sesiones - Sesiones con competencia, resultados y actividad de aprendizaje
 * @property {Date} fechaInicio - Fecha de inicio del programa (asignado en assign-ficha)
 * @property {Date} fechaFin - Fecha de finalización del programa (asignado en assign-ficha)
 * @property {Date} fechaInscripcion - Fecha de apertura de inscripciones (asignado en assign-ficha)
 * @property {Date} fechaMatriculaInicio - Fecha inicio de matrícula (asignado en assign-ficha)
 * @property {Date} fechaMatriculaFin - Fecha fin de matrícula (asignado en assign-ficha)
 * @property {string} municipio - Municipio de ubicación
 * @property {string} vereda - Vereda de ubicación
 * @property {string} direccion - Dirección de ubicación
 * @property {string} nombreEmpresa - Nombre de la empresa asociada
 * @property {string} nitEmpresa - NIT de la empresa
 * @property {string} contactoEmpresa - Contacto de la empresa
 * @property {string} telefonoEmpresa - Teléfono de la empresa
 * @property {number} numAprendices - Número de aprendices (required)
 * @property {string} tipoPrograma - Tipo de programa (enum 11 valores)
 * @property {string} tipoPoblacion - Tipo de población (enum 7 valores)
 * @property {string} requisitosIngreso - Requisitos de ingreso
 * @property {string} recursosNecesarios - Recursos necesarios
 * @property {string} state - Estado de la solicitud (incluye EJECUCION)
 * @property {Array} history - Historial de cambios de estado
 * @property {boolean} formationDataCompleted - Si el coordinador completó datos de formación
 * @property {Schema.Types.ObjectId[]} instructoresAdicionales - Instructores adicionales de la ficha
 * @property {string} fichaNumber - Número de ficha asignado
 * @property {string} codigoSolicitud - Código de solicitud SOFIA PLUS
 * @property {string} fichaCaracterizacion - Ficha de caracterización SOFIA PLUS
 * @property {string} proyectoAsociado - Proyecto asociado
 * @property {number} status - Estado del registro
 */
import { Schema, model } from "mongoose";

const ComplementaryRequestSquema = new Schema(
  {
    catalogCourse: {
      type: Schema.Types.ObjectId,
      ref: "ComplementaryCatalog",
      required: true,
    },
    catalogCourseName: {
      type: String,
      required: true,
    },
    catalogCourseCode: {
      type: String,
      required: true,
    },
    catalogCourseVersion: {
      type: String,
      required: true,
    },
    prfDuracionMaxima: {
      type: Number,
      default: 0,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    environment: {
      type: Schema.Types.ObjectId,
      ref: "Environment",
    },
    numeroSolicitud: {
      type: String,
      unique: true,
      sparse: true,
    },
    idCampesena: {
      type: String,
      default: "",
    },
    rutaCampesena: {
      type: String,
      default: "",
    },
    campesena: {
      type: Schema.Types.ObjectId,
      ref: "ComplementaryCampesena",
      default: null,
    },
    supervisorNombre: {
      type: String,
      default: "",
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ambienteNombre: {
      type: String,
      default: "",
    },
    ambienteDireccion: {
      type: String,
      default: "",
    },
    formationDocument: {
      type: String,
      default: "",
    },
    competencies: [
      {
        type: String,
      },
    ],
    outcomes: [
      {
        type: String,
      },
    ],
    learningActivity: {
      type: String,
      default: "",
    },
    sesiones: [
      {
        fecha: { type: String },
        horaInicio: { type: String },
        horaFin: { type: String },
        totalHoras: { type: Number },
        competencia: { type: String, default: "" },
        resultados: [{ type: String }],
        actividadAprendizaje: { type: String, default: "" },
      },
    ],
    fechaInicio: {
      type: Date,
    },
    fechaFin: {
      type: Date,
    },
    fechaInscripcion: {
      type: Date,
    },
    fechaMatriculaInicio: {
      type: Date,
    },
    fechaMatriculaFin: {
      type: Date,
    },
    municipio: {
      type: String,
      default: "",
    },
    vereda: {
      type: String,
      default: "",
    },
    direccion: {
      type: String,
      default: "",
    },
    nombreEmpresa: {
      type: String,
      default: "",
    },
    nitEmpresa: {
      type: String,
      default: "",
    },
    contactoEmpresa: {
      type: String,
      default: "",
    },
    telefonoEmpresa: {
      type: String,
      default: "",
    },
    numAprendices: {
      type: Number,
      required: true,
    },
    tipoPrograma: {
      type: String,
      required: true,
      enum: [
        "ATENCIÓN A INSTITUCIONES",
        "FORMACIÓN ESPECIAL MIPYMES-PND",
        "CAMPSENA",
        "CAMPSENA - AULA MÓVIL",
        "CAMPSENA RADIAL",
        "PROGRAMA DE BILINGÜISMO",
        "FULL POPULAR",
        "FULL POPULAR - AULA MÓVIL",
        "POSCONFLICTO",
        "AULA MÓVIL",
        "INPEC",
      ],
    },
    tipoPoblacion: {
      type: String,
      required: true,
      enum: [
        "Empresa",
        "Demanda social",
        "Emprendedores",
        "Convenio Universidad",
        "Remitidos por el CIE",
        "Apoyo a otros Centros",
        "Microempresarios",
      ],
    },
    requisitosIngreso: {
      type: String,
      default: "",
    },
    recursosNecesarios: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      enum: [
        "PENDIENTE",
        "APROBADA",
        "RECHAZADA",
        "FICHA_ASIGNADA",
        "INSCRIPCION",
        "PROGRAMADA",
        "EJECUCION",
        "CANCELADA",
        "CERRADA",
      ],
      default: "PENDIENTE",
    },
    history: [
      {
        previousState: { type: String },
        newState: { type: String },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedByRole: { type: String },
        timestamp: { type: Date, default: Date.now },
        observations: { type: String, default: "" },
      },
    ],
    formationDataCompleted: {
      type: Boolean,
      default: false,
    },
    instructoresAdicionales: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor",
      },
    ],
    fichaNumber: {
      type: String,
      default: "",
    },
    codigoSolicitud: {
      type: String,
      default: "",
    },
    fichaCaracterizacion: {
      type: String,
      default: "",
    },
    proyectoAsociado: {
      type: String,
      default: "",
    },
    status: {
      type: Number,
      default: 0,
    },
    visto: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model("ComplementaryRequest", ComplementaryRequestSquema);
