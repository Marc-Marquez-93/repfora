Modelo de comite:

```javascript

import { Schema, model } from "mongoose";

/**
 * Evidence Schema (Subdocumento)
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
    competences: [
      {
        type: String
      }
    ],
    outcomes: [
      {
        type: String
      }
    ],

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
  }
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

    // --- INTEGRANTES LOGÍSTICOS ---
    coordinator: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Coordinador académico
    invitedInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor"
      }
    ], // Instructores adicionales citados
    wellnessRepresentative: {
      type: Schema.Types.ObjectId,
      ref: "Instructor"
    }, // Representante de Bienestar
    newsRepresentative: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Profesional de Novedades

    // --- ASISTENTES LIBRES Y COMUNICACIÓN ---
    spokesperson: {
      type: String
    }, // Vocero
    representative: {
      type: String
    }, // Representante estudiantil
    additionalAssistants: [
      {
        type: String
      }
    ], // Otros asistentes libres
    participantEmails: [
      {
        type: String
      }
    ], // Correos electrónicos para notificaciones masivas

    // --- DATOS DE AGENDAMIENTO ---
    meetingDate: {
      type: Date
    },
    meetingLocation: {
      type: String
    },

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
    }
  },
  {
    timestamps: true
  }
);

CommitteeSchema.index({ fiche: 1, status: 1 });

export default model("Committee", CommitteeSchema);
```
