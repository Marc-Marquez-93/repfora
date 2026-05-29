import Instructor from "../models/Instructor.js";

const comitesHelper = {};

comitesHelper.findInstructorByEmail = async (email) => {
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

comitesHelper.generateSixDigitCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

comitesHelper.validateCodeMatch = (accessCode, accessCodeCreatedAt, inputCode) => {
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

comitesHelper.clearAccessCode = async (instructor) => {
  try {
    instructor.accessCodeComites = null;
    instructor.accessCodeComitesCreatedAt = null;
    await instructor.save();
  } catch (error) {
    throw new Error("Error al limpiar codigo de acceso");
  }
};

export { comitesHelper };
