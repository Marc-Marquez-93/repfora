/**
 * @typedef {Object} ComplementaryCampesena
 * @property {string} nombre - Nombre de la opción campesena (único)
 * @property {number} status - Estado del registro (0=activo, 1=inactivo)
 * @property {Date} createdAt - Fecha de creación
 * @property {Date} updatedAt - Fecha de última actualización
 */
import { Schema, model } from "mongoose";

const ComplementaryCampesenaSquema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default model("ComplementaryCampesena", ComplementaryCampesenaSquema);
