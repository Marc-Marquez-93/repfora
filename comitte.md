Modelo de comite:

```javascript

import { Schema, model } from "mongoose";

const CommitteeResultSchema = new Schema(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: "Learner",
      required: true
    },
    decision: {
      type: String,
      enum: [
        "PLAN_DE_MEJORAMIENTO",
        "LLAMADO_DE_ATENCION",
        "CONDICIONAMIENTO_DE_MATRICULA",
        "CANCELACION_DE_MATRICULA",
        "NINGUNA"
      ],
      required: true
    },
    conclusions: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const EvidenceSchema = new Schema(
  {
    fileName: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String }
  },
  { _id: false }
);

const CommitteeSchema = new Schema(
  {
    // --- CONTEXTO GEOGRÁFICO Y ESTRUCTURAL ---
    town: {
      type: Schema.Types.ObjectId,
      ref: "Town",
      required: [true, "The town reference ID is required"]
    },
    fiche: {
      type: Schema.Types.ObjectId,
      ref: "Fiche",
      required: [true, "The fiche reference is required"]
    },
    shift: {
      type: String,
      enum: ["MORNING", "AFTERNOON", "NIGHT", "WEEKEND", "VIRTUAL", "OTHER"],
      required: [true, "The training shift is required"]
    },

    // --- ELEMENTOS DE LA SOLICITUD ---
    type: {
      type: String,
      enum: ["ACADEMIC", "DISCIPLINARY", "BOTH"],
      required: [true, "The novelty type must be ACADEMIC, DISCIPLINARY, or BOTH"]
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
    evidence: {
      type: [EvidenceSchema],
      default: []
    },

    // --- SOLICITANTES E INDICIADOS ---
    requestingInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor",
        required: true
      }
    ], // Instructores que radican o solicitan el comité
    learners: [
      {
        type: Schema.Types.ObjectId,
        ref: "Learner",
        required: true
      }
    ], // Aprendices citados o indiciados en el caso

    // --- INTEGRANTES LOGÍSTICOS ---
    coordinator: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Coordinador académico encargado de presidir e instalar el comité
    invitedInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Instructor"
      }
    ], // Instructores adicionales citados con derecho a voz y voto
    wellnessRepresentative: {
      type: Schema.Types.ObjectId,
      ref: "Instructor"
    }, // Profesional del área de Bienestar al Aprendiz (rinde como instructor)
    newsRepresentative: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }, // Profesional o apoyo administrativo del proceso de comités (Rol: NOVEDADES)

    // --- ASISTENTES LIBRES Y COMUNICACIÓN ---
    spokesperson: {
      type: String
    }, // Vocero del grupo/ficha correspondiente
    representative: {
      type: String
    }, // Representante estudiantil de la jornada
    additionalAssistants: [
      {
        type: String
      }
    ], // Otros asistentes libres convocados o invitados de forma externa
    participantEmails: [
      {
        type: String
      }
    ], // Correos electrónicos consolidados de TODOS los participantes para notificaciones

    // --- DATOS DE AGENDAMIENTO ---
    meetingDate: {
      type: Date
    },
    meetingLocation: {
      type: String
    },

    // --- HISTORIAL, RESOLUCIONES Y CIERRE ---
    faultSeverity: {
      type: String,
      enum: ["LIGHT", "SERIOUS", "VERY_SERIOUS", "PENDING"],
      default: "PENDING"
    },
    resolutionNumber: {
      type: String,
      default: ""
    },
    results: [CommitteeResultSchema],
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