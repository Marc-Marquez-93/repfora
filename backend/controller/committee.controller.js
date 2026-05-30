import Committee from "../models/Committee.js";
import Fiche from "../models/Fiche.js";
import Instructor from "../models/Instructor.js";
import registerAction from "../middlewares/binnacle.js";

const committeeCtrl = {};

// Obtener todos los comités
committeeCtrl.getCommittees = async (req, res) => {
  try {
    const committees = await Committee.find()
      .populate("fiche")
      .populate("requestingInstructors")
      .populate("coordinator")
      .populate("invitedInstructors")
      .populate("wellnessRepresentative")
      .populate("newsRepresentative")
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
      .populate("fiche")
      .populate("requestingInstructors")
      .populate("coordinator")
      .populate("invitedInstructors")
      .populate("wellnessRepresentative")
      .populate("newsRepresentative");

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

    // Crear el comité
    const newCommittee = new Committee({
      fiche,
      requestingInstructors,
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
  } = req.body;

  try {
    const committee = await Committee.findById(id);
    if (!committee) {
      return res.status(404).json({ msg: "Comité no encontrado" });
    }

    // Actualizar campos
    if (meetingDate) committee.meetingDate = new Date(meetingDate);
    if (meetingTime) committee.meetingTime = meetingTime;
    if (meetingLocation) committee.meetingLocation = meetingLocation;
    if (status) committee.status = status;

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

// Obtener comités por ficha
committeeCtrl.getCommitteesByFiche = async (req, res) => {
  const { ficheId } = req.params;

  try {
    const committees = await Committee.find({ fiche: ficheId })
      .populate("requestingInstructors")
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
      .populate("fiche")
      .populate("requestingInstructors")
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
      .populate("fiche")
      .populate("requestingInstructors")
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

export { committeeCtrl };
