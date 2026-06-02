import Instructor from "../models/Instructor.js";
import { comitesHelper } from "../helpers/comites.helper.js";
import webToken from "../middlewares/webToken.js";
import sendEmail from "../utils/emails/sendEmail.js";

const comitesCtrl = {};

// Enviar código de verificación al correo del instructor
comitesCtrl.sendCode = async (req, res) => {
  const { email } = req.body;

  try {
    // Buscar instructor por correo institucional o personal (activo)
    const instructor = await comitesHelper.findInstructorByEmail(email);
    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado o inactivo" });
    }

    // Generar código de 6 dígitos y guardarlo en la BD con timestamp
    const code = comitesHelper.generateSixDigitCode();
    instructor.accessCodeComites = code;
    instructor.accessCodeComitesCreatedAt = new Date();
    await instructor.save();

    console.log(`Código para ${email}: ${code}`);

    // Recolectar todos los correos registrados del instructor
    const emailsToSend = [instructor.email, instructor.emailpersonal].filter(Boolean);

    // Intentar enviar el correo (no bloqueante: si falla el email el código igual queda guardado)
    const fromEmail = process.env.FROM_EMAIL;
    const fromPass  = process.env.SECURY_EMAIL;

    if (fromEmail && fromPass) {
      const sendPromises = emailsToSend.map((dest) =>
        sendEmail(
          fromEmail,
          fromPass,
          [dest],
          "Código de acceso – Comités SENA",
          { code },
          "./template/comitesAccessCode.hbs"
        ).catch((err) => {
          console.error(`[COMITES-EMAIL] Error enviando a ${dest}:`, err.message);
        })
      );
      // Enviar en paralelo sin bloquear la respuesta
      Promise.allSettled(sendPromises);
    } else {
      console.warn("[COMITES-EMAIL] Credenciales de correo no configuradas en .env");
    }

    res.json({
      msg: "Código enviado correctamente",
      emails: emailsToSend,  // El frontend los usa para mostrar las direcciones enmascaradas
    });
  } catch (error) {
    console.error("[COMITES] sendCode error:", error.message);
    res.status(400).json({ msg: "Error al enviar código" });
  }
};

// Verificar código y generar token de acceso al módulo de comités
comitesCtrl.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    if (!email || !code) {
      return res.status(400).json({ msg: "Datos incompletos" });
    }

    // Buscar instructor
    const instructor = await comitesHelper.findInstructorByEmail(email);
    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado o inactivo" });
    }

    // Validar código (lanza error si es incorrecto o expirado)
    comitesHelper.validateCodeMatch(
      instructor.accessCodeComites,
      instructor.accessCodeComitesCreatedAt,
      code
    );

    // Limpiar el código de la BD una vez usado
    await comitesHelper.clearAccessCode(instructor);

    // Generar token JWT de acceso al módulo de comités
    const token = await webToken.generateTokenComites(instructor);

    res.json({
      msg: "Código verificado correctamente",
      token,
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        email: instructor.email,
      },
    });
  } catch (error) {
    console.error("[COMITES] verifyCode error:", error.message);
    res.status(400).json({ msg: error.message || "Error al verificar código" });
  }
};

export { comitesCtrl };
