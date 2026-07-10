import Committee from "../models/Committee.js";
import Fiche from "../models/Fiche.js";
import Instructor from "../models/Instructor.js";
import Competence from "../models/Competence.js";
import Outcome from "../models/Outcome.js";
import registerAction from "../middlewares/binnacle.js";
import { sendEmail } from "../utils/emails/comites.js";

const committeeCtrl = {};

// Obtener todos los comités
committeeCtrl.getCommittees = async (req, res) => {
  try {
    const committees = await Committee.find()
      .populate({
        path: "fiche",
        populate: { path: "program" }
      })
      .populate("requestingInstructors")
      .populate("createdBy")
      .populate("meetingCoordinador")
      .populate("meetingInvitedInstructors")
      .populate("meetingBienestar")
      .populate("meetingNovedades")
      .sort({ createdAt: -1 });

    res.json(committees);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al obtener comités" });
  }
};

// Obtener un comité por ID
committeeCtrl.getCommitteeById = async (req, res) => {
  const { id } = req.params;

  try {
    const committee = await Committee.findById(id)
      .populate({
        path: "fiche",
        populate: { path: "program" }
      })
      .populate("requestingInstructors")
      .populate("createdBy")
      .populate("meetingCoordinador")
      .populate("meetingInvitedInstructors")
      .populate("meetingBienestar")
      .populate("meetingNovedades");

    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    res.json(committee);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al obtener comité" });
  }
};

// Registrar nuevo comité
committeeCtrl.registerCommittee = async (req, res) => {
  const {
    fiche,
    requestingInstructors,
    learners,
    meetingDate,
    meetingTime,
    meetingLocation,
  } = req.body;

  try {
    // Verificar que la ficha existe
    const fichaExists = await Fiche.findById(fiche);
    if (!fichaExists) {
      return res.status(400).json({ msg: "La ficha no existe" });
    }

    // Verificar que los instructores existen
    for (const instructorId of requestingInstructors) {
      const instructor = await Instructor.findById(instructorId);
      if (!instructor) {
        return res.status(400).json({ msg: `Instructor con ID ${instructorId} no encontrado` });
      }
    }

    // Usar el usuario autenticado del token como createdBy
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({ msg: "No se pudo identificar al usuario autenticado" });
    }

    // Verificar que el instructor que crea existe
    const creator = await Instructor.findById(createdBy);
    if (!creator) {
      return res.status(400).json({ msg: "Instructor creador no encontrado" });
    }

    // Crear el comité
    const newCommittee = new Committee({
      fiche,
      requestingInstructors,
      createdBy, // Usuario autenticado
      learners: learners.map(learner => ({
        ...learner,
        decision: "PENDING",
        conclusions: ""
      })),
      meetingDate: meetingDate ? new Date(meetingDate) : undefined,
      meetingTime,
      meetingLocation,
      status: "PENDING",
    });

    await newCommittee.save();

    // Registrar en bitácora
    await registerAction(
      "COMITE",
      {
        event: "CREAR COMITE",
        data: {
          committeeId: newCommittee._id,
          fiche: fichaExists.number,
          learnersCount: learners.length
        },
      },
      req.headers.token
    );

    res.status(201).json({
      msg: "Comité creado correctamente",
      committee: newCommittee
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible crear el comité" });
  }
};

// Actualizar comité (agendar / completar)
committeeCtrl.updateCommittee = async (req, res) => {
  const { id } = req.params;
  const {
    meetingDate,
    meetingTime,
    meetingLocation,
    status,
    learners,
    meetingCoordinador,
    meetingInvitedInstructors,
    meetingBienestar,
    meetingNovedades,
    meetingVocero,
    meetingVoceroCorreo,
    meetingRepresentante,
    meetingRepresentanteCorreo,
    meetingAdditionalParticipants,
  } = req.body;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    // Actualizar campos básicos
    if (meetingDate) committee.meetingDate = new Date(meetingDate);
    if (meetingTime) committee.meetingTime = meetingTime;
    if (meetingLocation) committee.meetingLocation = meetingLocation;
    if (status) committee.status = status;

    // Actualizar campos de agendamiento
    if (meetingCoordinador) committee.meetingCoordinador = meetingCoordinador;
    if (meetingInvitedInstructors) committee.meetingInvitedInstructors = meetingInvitedInstructors;
    if (meetingBienestar) committee.meetingBienestar = meetingBienestar;
    if (meetingNovedades) committee.meetingNovedades = meetingNovedades;
    if (meetingVocero !== undefined) committee.meetingVocero = meetingVocero;
    if (meetingVoceroCorreo !== undefined) committee.meetingVoceroCorreo = meetingVoceroCorreo;
    if (meetingRepresentante !== undefined) committee.meetingRepresentante = meetingRepresentante;
    if (meetingRepresentanteCorreo !== undefined) committee.meetingRepresentanteCorreo = meetingRepresentanteCorreo;
    if (meetingAdditionalParticipants) committee.meetingAdditionalParticipants = meetingAdditionalParticipants;

    // Actualizar learners si se proporcionan
    if (learners && Array.isArray(learners)) {
      learners.forEach(updatedLearner => {
        const learnerIndex = committee.learners.findIndex(
          l => l._id.toString() === updatedLearner._id
        );
        if (learnerIndex !== -1) {
          committee.learners[learnerIndex] = {
            ...committee.learners[learnerIndex].toObject(),
            ...updatedLearner
          };
        }
      });
    }

    await committee.save();

    await registerAction(
      "COMITE",
      {
        event: "ACTUALIZAR COMITE",
        data: { committeeId: id }
      },
      req.headers.token
    );

    res.json({ msg: "Comité actualizado correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible actualizar el comité" });
  }
};

// Cancelar comité
committeeCtrl.cancelCommittee = async (req, res) => {
  const { id } = req.params;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    if (committee.status !== "PENDING") {
      return res.status(400).json({ msg: "Solo se pueden cancelar comités en estado PENDIENTE" });
    }

    committee.status = "CANCELLED";
    await committee.save();

    await registerAction(
      "COMITE",
      {
        event: "CANCELAR COMITE",
        data: { committeeId: id }
      },
      req.headers.token
    );

    res.json({ msg: "Comité cancelado correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible cancelar el comité" });
  }
};

// Solicitar cancelación de comité (por instructor)
committeeCtrl.requestCancellation = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    if (committee.status !== "PENDING") {
      return res.status(400).json({ msg: "Solo se pueden solicitar cancelación de comités en estado PENDIENTE" });
    }

    if (committee.cancellationRequested) {
      return res.status(400).json({ msg: "Ya existe una solicitud de cancelación para este comité" });
    }

    // Usar el usuario autenticado del token
    const instructorId = req.user?.id;
    if (!instructorId) {
      return res.status(401).json({ msg: "No se pudo identificar al usuario autenticado" });
    }

    committee.cancellationRequested = true;
    committee.cancellationRequestedBy = instructorId;
    committee.cancellationRequestedAt = new Date();
    committee.cancellationReason = reason || "";
    committee.cancellationStatus = "PENDING";

    await committee.save();

    await registerAction(
      "COMITE",
      {
        event: "SOLICITAR CANCELACION",
        data: { committeeId: id, reason }
      },
      req.headers.token
    );

    res.json({ msg: "Solicitud de cancelación enviada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible solicitar la cancelación" });
  }
};

// Aprobar solicitud de cancelación (por Novedades)
committeeCtrl.approveCancellation = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    if (!committee.cancellationRequested) {
      return res.status(400).json({ msg: "No hay solicitud de cancelación para este comité" });
    }

    if (committee.cancellationStatus !== "PENDING") {
      return res.status(400).json({ msg: "La solicitud de cancelación ya fue procesada" });
    }

    // Usar el usuario autenticado del token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ msg: "No se pudo identificar al usuario autenticado" });
    }

    committee.cancellationStatus = "APPROVED";
    committee.cancellationDecisionBy = userId;
    committee.cancellationDecisionAt = new Date();
    committee.cancellationDecisionNote = note || "";
    committee.status = "CANCELLED";

    await committee.save();

    await registerAction(
      "COMITE",
      {
        event: "APROBAR CANCELACION",
        data: { committeeId: id, note }
      },
      req.headers.token
    );

    res.json({ msg: "Cancelación aprobada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible aprobar la cancelación" });
  }
};

// Rechazar solicitud de cancelación (por Novedades)
committeeCtrl.rejectCancellation = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    if (!committee.cancellationRequested) {
      return res.status(400).json({ msg: "No hay solicitud de cancelación para este comité" });
    }

    if (committee.cancellationStatus !== "PENDING") {
      return res.status(400).json({ msg: "La solicitud de cancelación ya fue procesada" });
    }

    // Usar el usuario autenticado del token
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ msg: "No se pudo identificar al usuario autenticado" });
    }

    committee.cancellationStatus = "REJECTED";
    committee.cancellationDecisionBy = userId;
    committee.cancellationDecisionAt = new Date();
    committee.cancellationDecisionNote = note || "";
    committee.cancellationRequested = false;
    committee.cancellationRequestedBy = null;
    committee.cancellationRequestedAt = null;
    committee.cancellationReason = "";

    await committee.save();

    await registerAction(
      "COMITE",
      {
        event: "RECHAZAR CANCELACION",
        data: { committeeId: id, note }
      },
      req.headers.token
    );

    res.json({ msg: "Solicitud de cancelación rechazada correctamente" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "No fue posible rechazar la cancelación" });
  }
};

// Obtener comités por ficha
committeeCtrl.getCommitteesByFiche = async (req, res) => {
  const { ficheId } = req.params;

  try {
    const committees = await Committee.find({ fiche: ficheId })
      .populate({
        path: "fiche",
        populate: { path: "program" }
      })
      .populate("requestingInstructors")
      .populate("createdBy")
      .populate("meetingCoordinador")
      .populate("meetingInvitedInstructors")
      .populate("meetingBienestar")
      .populate("meetingNovedades")
      .sort({ createdAt: -1 });

    res.json(committees);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al obtener comités de la ficha" });
  }
};

// Obtener comités pendientes
committeeCtrl.getPendingCommittees = async (req, res) => {
  try {
    const committees = await Committee.find({ status: "PENDING" })
      .populate({
        path: "fiche",
        populate: { path: "program" }
      })
      .populate("requestingInstructors")
      .populate("createdBy")
      .populate("meetingCoordinador")
      .populate("meetingInvitedInstructors")
      .populate("meetingBienestar")
      .populate("meetingNovedades")
      .sort({ createdAt: -1 });

    res.json(committees);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al obtener comités pendientes" });
  }
};

// Obtener comités programados
committeeCtrl.getScheduledCommittees = async (req, res) => {
  try {
    const committees = await Committee.find({ status: "SCHEDULED" })
      .populate({
        path: "fiche",
        populate: { path: "program" }
      })
      .populate("requestingInstructors")
      .populate("createdBy")
      .populate("meetingCoordinador")
      .populate("meetingInvitedInstructors")
      .populate("meetingBienestar")
      .populate("meetingNovedades")
      .sort({ meetingDate: 1 });

    res.json(committees);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al obtener comités programados" });
  }
};

// ==================== Funciones de búsqueda ====================

// Buscar fichas por número
committeeCtrl.searchFiches = async (req, res) => {
  const { number } = req.query;

  try {
    let query = { status: 0 };

    if (number && number.trim()) {
      // Buscar por número exacto o que contenga
      query.number = { $regex: number.trim(), $options: "i" };
    }

    const fiches = await Fiche.find(query)
      .populate("program")
      .sort({ number: 1 })
      .limit(20);

    res.json(fiches);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al buscar fichas" });
  }
};

// Buscar instructores por nombre o documento
committeeCtrl.searchInstructors = async (req, res) => {
  const { search } = req.query;

  try {
    let query = { status: 0 };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { numdocument: { $regex: searchTerm, $options: "i" } }
      ];
    }

    const instructors = await Instructor.find(query)
      .sort({ name: 1 })
      .limit(50);

    res.json(instructors);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al buscar instructores" });
  }
};

// Buscar competencias por nombre, número o programa
committeeCtrl.searchCompetences = async (req, res) => {
  const { search, program } = req.query;

  try {
    let query = { status: 0 };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { number: { $regex: searchTerm, $options: "i" } }
      ];
    }

    // Si se proporciona un programa, filtrar por ese programa
    if (program && program.trim()) {
      query.program = program.trim();
    }

    const competences = await Competence.find(query)
      .populate("program")
      .sort({ name: 1 })
      .limit(50);

    res.json(competences);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al buscar competencias" });
  }
};

// Buscar resultados de aprendizaje por código, descripción o competencia
committeeCtrl.searchOutcomes = async (req, res) => {
  const { search, competence } = req.query;

  try {
    let query = { status: 0 };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { outcomes: { $regex: searchTerm, $options: "i" } },
        { code: { $regex: searchTerm, $options: "i" } }
      ];
    }

    // Si se proporciona una competencia, filtrar por esa competencia
    if (competence && competence.trim()) {
      query.competence = competence.trim();
    }

    const outcomes = await Outcome.find(query)
      .populate("competence")
      .sort({ code: 1 })
      .limit(100);

    res.json(outcomes);
  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: "Error al buscar resultados de aprendizaje" });
  }
};

// ── Enviar correo del comité ──────────────────────────────────────────────────
committeeCtrl.sendCommitteeEmail = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body; // 'CITACION' | 'MODIFICACION' | 'FINALIZACION'

  try {
    const committee = await Committee.findById(id)
      .populate({ path: 'fiche', populate: { path: 'program' } })
      .populate('requestingInstructors')
      .populate('createdBy')
      .populate('meetingCoordinador')
      .populate('meetingInvitedInstructors')
      .populate('meetingBienestar')
      .populate('meetingNovedades');

    if (!committee) {
      return res.status(404).json({ msg: 'Comité no encontrado' });
    }

    // ── Recolectar destinatarios ─────────────────────────────────────────────
    const destinatarios = new Set();

    // Instructores solicitantes
    (committee.requestingInstructors || []).forEach(i => { if (i?.email) destinatarios.add(i.email); });
    if (committee.createdBy?.email) destinatarios.add(committee.createdBy.email);

    // Participantes del comité
    if (committee.meetingCoordinador?.email) destinatarios.add(committee.meetingCoordinador.email);
    if (committee.meetingBienestar?.email)    destinatarios.add(committee.meetingBienestar.email);
    if (committee.meetingNovedades?.email)    destinatarios.add(committee.meetingNovedades.email);
    (committee.meetingInvitedInstructors || []).forEach(i => { if (i?.email) destinatarios.add(i.email); });

    // Aprendices del comité
    (committee.learners || []).forEach(l => { if (l?.email) destinatarios.add(l.email); });

    // Correos adicionales manuales (vocero / representante)
    if (committee.meetingVoceroCorreo)        destinatarios.add(committee.meetingVoceroCorreo);
    if (committee.meetingRepresentanteCorreo) destinatarios.add(committee.meetingRepresentanteCorreo);

    if (destinatarios.size === 0) {
      return res.status(400).json({ msg: 'No hay destinatarios para enviar el correo' });
    }

    // ── Datos generales del comité ───────────────────────────────────────────
    const ficha = committee.fiche?.number || 'N/A';
    const programa = committee.fiche?.program?.name || 'Sin nombre';

    const fechaFormateada = committee.meetingDate
      ? new Date(committee.meetingDate).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
          timeZone: 'America/Bogota'
        })
      : 'Por confirmar';

    const hora   = committee.meetingTime     || 'Por confirmar';
    const lugar  = committee.meetingLocation || 'Por confirmar';

    // ── Aprendices (tabla HTML) ───────────────────────────────────────────────
    const rowsAprendices = (committee.learners || []).map(l => {
      const tipoNov = l.noveltyType === 'ACADEMIC' ? 'Académica'
                    : l.noveltyType === 'DISCIPLINARY' ? 'Disciplinaria'
                    : 'Los dos tipos';
      return `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${l.name || 'N/A'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${l.documentType || 'CC'} ${l.documentNumber || ''}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${tipoNov}</td>
        </tr>`;
    }).join('');

    const tablaAprendices = `
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
        <thead>
          <tr style="background-color:#f3f4f6;">
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #318335;">Aprendiz</th>
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #318335;">Documento</th>
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #318335;">Tipo Novedad</th>
          </tr>
        </thead>
        <tbody>${rowsAprendices}</tbody>
      </table>`;

    // ── Decisiones por aprendiz (para FINALIZACION) ──────────────────────────
    const decisionLabel = d => {
      const m = {
        PLAN_MEJORAMIENTO: 'Plan de Mejoramiento',
        LLAMADO_ATENCION: 'Llamado de Atención',
        CONDICIONAMIENTO: 'Condicionamiento de Matrícula',
        CANCELACION: 'Cancelación de Matrícula',
      };
      return m[d] || d;
    };

    const rowsDecisiones = (committee.learners || []).map(l => {
      const decs = (l.decisiones || []).map(decisionLabel).join(', ') || 'Sin decisión registrada';
      return `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${l.name || 'N/A'}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${decs}</td>
        </tr>`;
    }).join('');

    const tablaDecisiones = `
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
        <thead>
          <tr style="background-color:#f3f4f6;">
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #318335;">Aprendiz</th>
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #318335;">Decisión(es)</th>
          </tr>
        </thead>
        <tbody>${rowsDecisiones}</tbody>
      </table>`;

    // ── Bloque de información general (usado en todos los tipos) ─────────────
    const bloqueInfo = `
      <div style="background-color:#f9fafb; border-left:4px solid #318335; border-radius:6px; padding:16px 20px; margin:16px 0;">
        <p style="margin:4px 0;"><strong>Ficha:</strong> ${ficha}</p>
        <p style="margin:4px 0;"><strong>Programa:</strong> ${programa}</p>
        <p style="margin:4px 0;"><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p style="margin:4px 0;"><strong>Hora:</strong> ${hora}</p>
        <p style="margin:4px 0;"><strong>Lugar:</strong> ${lugar}</p>
      </div>`;

    // ── Construir el HTML y asunto según el tipo ─────────────────────────────
    let asunto, htmlBody;

    if (tipo === 'CITACION') {
      asunto = `📋 Citación a Comité Evaluador – Ficha ${ficha}`;
      htmlBody = `
        <h2 style="color:#318335; margin-bottom:4px;">Citación a Comité Evaluador</h2>
        <p>Se le informa que ha sido convocado(a) a un <strong>Comité Evaluador</strong> del SENA.</p>
        ${bloqueInfo}
        <p><strong>Aprendices citados:</strong></p>
        ${tablaAprendices}
        <p style="margin-top:16px;">Por favor confirme su asistencia y prepare la documentación necesaria.</p>`;

    } else if (tipo === 'MODIFICACION') {
      asunto = `🔄 Modificación de Comité – Ficha ${ficha}`;
      htmlBody = `
        <h2 style="color:#d97706; margin-bottom:4px;">Modificación de Comité Evaluador</h2>
        <p>Le informamos que los datos del <strong>Comité Evaluador</strong> han sido actualizados.</p>
        ${bloqueInfo}
        <p><strong>Aprendices citados:</strong></p>
        ${tablaAprendices}
        <p style="margin-top:16px;">Por favor tome nota de los cambios realizados.</p>`;

    } else if (tipo === 'FINALIZACION') {
      asunto = `✅ Resultado de Comité Evaluador – Ficha ${ficha}`;
      htmlBody = `
        <h2 style="color:#318335; margin-bottom:4px;">Resultado del Comité Evaluador</h2>
        <p>El <strong>Comité Evaluador</strong> ha concluido. A continuación encontrará las decisiones tomadas:</p>
        ${bloqueInfo}
        <p><strong>Decisiones adoptadas:</strong></p>
        ${tablaDecisiones}
        <p style="margin-top:16px;">Las actas quedan disponibles para consulta en el sistema REPFORA.</p>`;

    } else {
      return res.status(400).json({ msg: `Tipo de correo desconocido: ${tipo}` });
    }

    // ── Enviar a cada destinatario ───────────────────────────────────────────
    const toArray = Array.from(destinatarios);
    const results = await Promise.allSettled(
      toArray.map(email => sendEmail(email, asunto, htmlBody))
    );

    const enviados  = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const fallidos  = results.length - enviados;

    res.json({
      msg: `Correos enviados: ${enviados} exitosos, ${fallidos} fallidos.`,
      total: results.length,
      enviados,
      fallidos
    });

  } catch (error) {
    console.error('Error enviando correos del comité:', error);
    res.status(500).json({ msg: 'Error al enviar correos' });
  }
};

export { committeeCtrl };

