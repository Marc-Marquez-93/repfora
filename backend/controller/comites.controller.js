import Instructor from "../models/Instructor.js";

const comitesCtrl = {};

// Enviar código de verificación al correo del instructor
comitesCtrl.sendCode = async (req, res) => {
  const { email } = req.body;

  try {
    // Buscar instructor por email
    const instructor = await Instructor.findOne({ email, status: 0 });
    if (!instructor) {
      return res.status(401).json({ msg: "Instructor no encontrado o inactivo" });
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Aquí iría la lógica para enviar el correo
    // Por ahora, solo devolvemos el código para pruebas
    console.log(`Código para ${email}: ${code}`);

    res.json({
      msg: "Código enviado correctamente",
      code // Solo para pruebas, en producción no devolver el código
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al enviar código" });
  }
};

// Verificar código y generar token
comitesCtrl.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    // Por ahora, solo validamos que se envíen los datos
    // En producción, verificar el código contra la base de datos o caché
    if (!email || !code) {
      return res.status(400).json({ msg: "Datos incompletos" });
    }

    // Generar token JWT
    const token = "fake-token-" + Date.now();

    res.json({
      msg: "Código verificado correctamente",
      token
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al verificar código" });
  }
};

export { comitesCtrl };
