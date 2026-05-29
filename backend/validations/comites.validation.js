import { check } from "express-validator";
import { comitesHelper } from "../helpers/comites.helper.js";
import { validateFields } from "../middlewares/validateFields.js";

const {
  findInstructorByEmail,
} = comitesHelper;

const comitesVali = {};

comitesVali.validateSendCode = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email no es valido").isEmail(),
  check("email").custom(async (email) => {
    const instructor = await findInstructorByEmail(email);
    if (!instructor) throw new Error("Instructor no encontrado");
  }),
  validateFields,
];

comitesVali.validateVerifyCode = [
  check("email", "El email es obligatorio").notEmpty(),
  check("email", "El email no es valido").isEmail(),
  check("code", "El codigo es obligatorio").notEmpty(),
  check("code", "El codigo debe tener 6 digitos").isLength({ min: 6, max: 6 }),
  check("code", "El codigo debe ser numerico").isNumeric(),
  validateFields,
];

export { comitesVali };
