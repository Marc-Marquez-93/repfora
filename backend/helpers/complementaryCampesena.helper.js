import ComplementaryCampesena from "../models/ComplementaryCampesena.js";

const complementaryCampesenaHelper = {};

complementaryCampesenaHelper.validateExistCampesenaById = async (id) => {
  try {
    const campesena = await ComplementaryCampesena.findById(id, { status: 0 });
    if (!campesena) {
      throw new Error();
    }
  } catch (error) {
    throw new Error("La campesena no existe");
  }
};

complementaryCampesenaHelper.validateNombreUnique = async (nombre, id = "") => {
  try {
    const exists = await ComplementaryCampesena.findOne({
      nombre: nombre.toUpperCase().trim(),
      status: 0,
    });
    if (exists) {
      if (id && exists._id.toString() !== id) {
        throw new Error();
      } else if (!id) {
        throw new Error();
      }
    }
  } catch (error) {
    throw new Error("El nombre de la campesena ya existe");
  }
};

export { complementaryCampesenaHelper };
