# Respaldo de Committee.js (Limpio)

Este archivo contiene el código limpio del modelo `Committee.js` después de la eliminación de los campos redundantes, tal como quedó configurado el 02 de julio de 2026. Es la base de trabajo para el desarrollo.

```javascript
/**
 * @typedef {Object} Evidence
 * @property {string} fileName - Nombre del archivo
 * @property {string} url - URL del archivo
 * @property {string} fileType - Tipo de archivo (pdf, jpg, etc.)
 */

/**
 * @typedef {Object} LearnerDetail
 * @property {string} name - Nombre completo del aprendiz
 * @property {string} documentType - Tipo de documento (CC, CE, TI, PPT)
 * @property {string} documentNumber - Número de documento
 * @property {string} email - Correo electrónico
 * @property {string} noveltyType - Tipo de novedad (ACADEMIC, DISCIPLINARY, BOTH)
 * @property {string} description - Descripción de los hechos
 * @property {string} manual - Reglamento vulnerado
 * @property {string[]} competences - Competencias afectadas
 * @property {string[]} outcomes - Resultados de aprendizaje afectados
 * @property {string} decision - Dictamen del comité
 * @property {string} conclusions - Conclusiones
 */

/**
 * @typedef {Object} Committee
 * @property {Schema.Types.ObjectId} fiche - Referencia a la ficha
 * @property {LearnerDetail[]} learners - Aprendices involucrados
 * @property {Evidence[]} evidence - Evidencias adjuntas
 * @property {Schema.Types.ObjectId[]} requestingInstructors - Instructores solicitantes
 * @property {Date} meetingDate - Fecha de reunión
 * @property {string} meetingLocation - Lugar de reunión
 * @property {string} faultSeverity - Gravedad de la falta (LIGHT, SERIOUS, VERY_SERIOUS, PENDING)
 * @property {string} resolutionNumber - Número de resolución
 * @property {string} status - Estado del comité (PENDING, SCHEDULED, COMPLETED, CANCELLED)
 * @property {Date} createdAt - Fecha de creación
 * @property {Date} updatedAt - Fecha de actualización
 */

import { Schema, model } from "mongoose";

/**
 * Evidence Schema (Subdocumento)
 * Almacena información sobre archivos de evidencia
 */
const EvidenceSchema = new Schema(
  {
    fileName: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String }
  },
  { _id: false }
);

/**
 * LearnerDetail Schema (Subdocumento)
 * Almacena la identidad del aprendiz, su novedad particular y el dictamen final del comité.
 */
const LearnerDetailSchema = new Schema(
  {
    // --- DATOS PERSONALES DEL APRENDIZ ---
    name: { type: String, required: true },
    documentType: { type: String, required: true },
    documentNumber: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: true },

    // --- ELEMENTOS DE LA SOLICITUD (ESPECÍFICOS POR APRENDIZ) ---
    noveltyType: {
      type: String,
      enum: ["ACADEMIC", "DISCIPLINARY", "BOTH"],
      required: [true, "The novelty type is required"]
    },
    description: {
      type: String,
      required: [true, "Detailed description of facts is required"]
    },
    manual: {
      type: String,
      required: true,
    },
    competences: {
      type: [String],
      default: []
    },
    outcomes: {
      type: [String],
      default: []
    },

    // --- RESULTADOS Y DICTAMEN (SE LLENAN AL FINALIZAR EL COMITÉ) ---
    decision: {
      type: String,
      enum: [
        "PLAN_DE_MEJORAMIENTO",
        "LLAMADO_DE_ATENCION",
        "CONDICIONAMIENTO_DE_MATRICULA",
        "CANCELACION_DE_MATRICULA",
        "OTRA",
        "PENDING"
      ],
      default: "PENDING"
    },
    conclusions: {
      type: String,
      default: ""
    }
  },
  { _id: true }
);

/**
 * Committee Schema Principal
 */
const CommitteeSchema = new Schema(
  {
    // --- CONTEXTO GEOGRÁFICO Y ESTRUCTURAL ---
    fiche: {
      type: Schema.Types.ObjectId,
      ref: "Fiche",
      required: [true, "The fiche reference is required"]
    },

    // --- APRENDICES INDICIADOS (Identidad + Solicitud + Resultados) ---
    learners: [LearnerDetailSchema],

    // --- EVIDENCIAS GENERALES ADJUNTAS ---
    evidence: {
      type: [EvidenceSchema],
      default: []
    },

    // --- SOLICITANTES ---
    requestingInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor",
        required: true
      }
    ], // Instructores que radican o solicitan el comité

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Instructor",
      required: true
    }, // Instructor que creó/solicitó el comité (el que está logueado)


    // --- DATOS DE AGENDAMIENTO ---
    meetingDate: {
      type: Date
    },
    meetingTime: {
      type: String
    },
    meetingLocation: {
      type: String
    },

    // --- DATOS ESPECÍFICOS DE LA REUNIÓN AGENDADA ---
    meetingCoordinador: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Coordinador de la reunión agendada
    meetingInvitedInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor"
      }
    ], // Instructores invitados a la reunión
    meetingBienestar: {
      type: Schema.Types.ObjectId,
      ref: "Instructor"
    }, // Bienestar asignado a la reunión
    meetingNovedades: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Novedades asignado a la reunión
    meetingVocero: {
      type: String
    }, // Nombre del vocero para la reunión
    meetingVoceroCorreo: {
      type: String
    }, // Correo del vocero
    meetingRepresentante: {
      type: String
    }, // Nombre del representante para la reunión
    meetingRepresentanteCorreo: {
      type: String
    }, // Correo del representante
    meetingAdditionalParticipants: [
      {
        nombre: { type: String },
        correo: { type: String }
      }
    ], // Participantes adicionales para la reunión

    // --- HISTORIAL Y CIERRE ---
    faultSeverity: {
      type: String,
      enum: ["LIGHT", "SERIOUS", "VERY_SERIOUS", "PENDING"],
      default: "PENDING"
    },
    resolutionNumber: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "PENDING"
    },

    // --- SOLICITUD DE CANCELACIÓN ---
    cancellationRequested: {
      type: Boolean,
      default: false
    },
    cancellationRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: "Instructor"
    },
    cancellationRequestedAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    cancellationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    cancellationDecisionBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    cancellationDecisionAt: {
      type: Date
    },
    cancellationDecisionNote: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

CommitteeSchema.index({ fiche: 1, status: 1 });

export default model("Committee", CommitteeSchema);
```
