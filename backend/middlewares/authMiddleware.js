import webToken from "./webToken.js";
import Instructor from "../models/Instructor.js";
import User from "../models/User.js";

/**
 * Middleware que autentica el token y agrega el usuario a req.user
 * Funciona tanto para tokens de usuarios como de instructores
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({ msg: "No se ha enviado el token" });
    }

    // Decodificar el token
    const decoded = webToken.decodeToken(token);

    // Buscar el usuario según el rol
    let user;
    if (decoded.rol === "INSTRUCTOR") {
      user = await Instructor.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (user.status !== 0) {
      return res.status(401).json({ msg: "Usuario inactivo" });
    }

    // Agregar el usuario a la request
    req.user = {
      id: user._id,
      rol: decoded.rol,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error("[AUTH] Error autenticando token:", error.message);
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};

/**
 * Middleware que autentica el token específicamente para comités
 * Acepta tanto tokens temporales de instructores (generateTokenComites) como tokens regulares de usuarios (NOVEDADES)
 */
const authenticateComitesToken = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({ msg: "No se ha enviado el token" });
    }

    // Intentar validar como token temporal de instructor primero
    try {
      const decoded = await webToken.validateTokenComplementaria(token);
      // Token de instructor válido
      req.user = {
        id: decoded.id,
        rol: decoded.rol,
        email: decoded.email,
      };
      return next();
    } catch (instructorError) {
      // No es un token de instructor, intentar como token regular de usuario
    }

    // Intentar validar como token regular de usuario
    try {
      const decoded = webToken.decodeToken(token);

      // Verificar que el rol esté autorizado para comités
      const rolesAutorizados = ["COORDINADOR", "PROGRAMADOR", "EVALUADOR", "NOVEDADES"];
      if (!rolesAutorizados.includes(decoded.rol)) {
        return res.status(403).json({ msg: "No tienes permisos para gestionar comités" });
      }

      // Verificar que el usuario exista y esté activo
      let user;
      if (decoded.rol === "INSTRUCTOR") {
        user = await Instructor.findById(decoded.id);
      } else {
        user = await User.findById(decoded.id);
      }

      if (!user) {
        return res.status(401).json({ msg: "Usuario no encontrado" });
      }

      if (user.status !== 0) {
        return res.status(401).json({ msg: "Usuario inactivo" });
      }

      req.user = {
        id: decoded.id,
        rol: decoded.rol,
        email: decoded.email,
        name: user.name,
      };

      next();
    } catch (userError) {
      console.error("[AUTH-COMITES] Error autenticando token:", userError.message);
      return res.status(401).json({ msg: "Token inválido o expirado" });
    }
  } catch (error) {
    console.error("[AUTH-COMITES] Error autenticando token:", error.message);
    return res.status(401).json({ msg: "Token inválido o expirado" });
  }
};

export { authenticateToken, authenticateComitesToken };
