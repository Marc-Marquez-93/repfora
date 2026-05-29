import Instructor from "../models/Instructor.js";
import sendEmail from "../utils/emails/sendEmail.js";
import registerAction from "../middlewares/binnacle.js";
import webToken from "../middlewares/webToken.js";
import { comitesHelper } from "../helpers/comites.helper.js";

const comitesCtrl = {};

//send access code to instructor emails (email + emailpersonal) — no requiere token
comitesCtrl.sendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const instructor = await comitesHelper.findInstructorByEmail(email);

    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    const code = comitesHelper.generateSixDigitCode();
    instructor.accessCodeComites = code;
    instructor.accessCodeComitesCreatedAt = new Date();
    await instructor.save();

    const fromEmail = process.env.FROM_EMAIL;
    const fromPass = process.env.SECURY_EMAIL;
    const subject = "CODIGO DE ACCESO - COMITÉS SENA";
    const template = "./template/comitesAccessCode.hbs";

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
      "COMITES",
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

//verify access code and grant access — no requiere token previo, devuelve token COMITES
comitesCtrl.verifyCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    const instructor = await comitesHelper.findInstructorByEmail(email);

    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado" });
    }

    comitesHelper.validateCodeMatch(
      instructor.accessCodeComites,
      instructor.accessCodeComitesCreatedAt,
      code
    );

    await comitesHelper.clearAccessCode(instructor);

    const token = await webToken.generateTokenComites(instructor);

    await registerAction(
      "COMITES",
      {
        event: "VERIFICAR CODIGO DE ACCESO",
        data: { email: instructor.email, numdocument: instructor.numdocument },
      },
      null
    );

    res.json({
      msg: "Acceso a comités concedido",
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

export { comitesCtrl };
