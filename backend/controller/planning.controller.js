import Planning from '../models/Planning.js';
import Fiche from '../models/Fiche.js';
import Program from '../models/Program.js';
import Competence from '../models/Competence.js';
import Outcome from '../models/Outcome.js';
import Instructor from '../models/Instructor.js';
import Environment from '../models/Environment.js';
import Schedule from '../models/Schedule.js';
import PlanningTemplate from '../models/PlanningTemplate.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/emails/sendEmail.js';
import registerAction from '../middlewares/binnacle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadPlanning = async (req, res) => {
  try {
    const { pedagogicalPlanning } = req.body;
    if (!pedagogicalPlanning || !pedagogicalPlanning.fiche) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const updated = await Planning.findOneAndUpdate(
      { 'pedagogicalPlanning.fiche': pedagogicalPlanning.fiche },
      { $set: { pedagogicalPlanning } },
      { upsert: true, new: true }
    );

    res.json({ message: 'Datos guardados', data: updated });
  } catch (error) {
    console.error('[ERROR] uploadPlanning:', error);
    res.status(500).json({ message: 'Error al guardar datos', error: error.message });
  }
};

export const getAllPlannings = async (req, res) => {
  try {
    const plannings = await Planning.find({});
    res.json(plannings);
  } catch (error) {
    console.error('[ERROR] getAllPlannings:', error);
    res.status(500).json({ message: 'Error al obtener planeaciones', error: error.message });
  }
};

export const getPlanningByFiche = async (req, res) => {
  try {
    const { fiche } = req.params;
    const planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planning) return res.status(404).json({ message: 'No se encontró la planeación' });
    res.json(planning);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener datos', error: error.message });
  }
};

export const extractFromPDFs = async (req, res) => {
  try {
    const { fiche, leaderEmail } = req.body;
    if (!req.files || !req.files.programPdf || !req.files.projectPdf) {
      return res.status(400).json({ message: 'Faltan archivos PDF' });
    }

    const programPath = path.resolve(req.files.programPdf.tempFilePath);
    const projectPath = path.resolve(req.files.projectPdf.tempFilePath);
    const scriptsDir = path.resolve(__dirname, '../scripts');
    const extractorPath = path.join(scriptsDir, 'extractor.py');

    console.log(`[EXTRACT] Iniciando para ficha ${fiche}`);

    const command = `py "${extractorPath}" "${programPath}" "${projectPath}" "${fiche}"`;

    exec(command, { timeout: 90000 }, async (error, stdout, stderr) => {
      const cleanup = () => {
        try {
          if (fs.existsSync(programPath)) fs.unlinkSync(programPath);
          if (fs.existsSync(projectPath)) fs.unlinkSync(projectPath);
          console.log('[CLEANUP] Archivos temporales eliminados');
        } catch (e) { console.error('Error cleanup:', e.message); }
      };

      if (error) {
        cleanup();
        console.error('[ERROR] Extractor:', stderr || error.message);
        try { fs.writeFileSync('extract_error.log', `Error: ${error.message}\nStderr: ${stderr}\nStdout: ${stdout}`); } catch (e) { }
        return res.status(500).json({ message: 'Error en la extracción', error: stderr || error.message, stdout: stdout });
      }

      // Intentar detectar el número de ficha final del stdout impreso por el script de python
      let finalFiche = fiche;
      const match = stdout.match(/Ficha:\s*([^\r\n]+)/);
      if (match) {
        finalFiche = match[1].trim();
        console.log(`[EXTRACT] Ficha final detectada del stdout: ${finalFiche}`);
      }

      // Buscar los datos guardados por el script de python usando la ficha final real
      let planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': finalFiche });

      if (planning && leaderEmail) {
        planning.pedagogicalPlanning.leaderEmail = leaderEmail.trim().toLowerCase();
        await planning.save();
      }

      cleanup();

      if (planning) {
        res.json({ message: 'Éxito', data: planning, finalFiche: finalFiche });
      } else {
        const errorLog = `Error: No data found\nStdout: ${stdout}\nStderr: ${stderr}\n`;
        try { fs.writeFileSync('extract_error.log', errorLog); } catch (e) { }
        res.status(500).json({
          message: 'No se encontraron datos tras la extracción',
          debug: stdout
        });
      }
    });
  } catch (error) {
    console.error('[ERROR] extractFromPDFs:', error);
    try { fs.writeFileSync('extract_error.log', `Catch error: ${error.stack}`); } catch (e) { }
    res.status(500).json({ message: 'Error interno del servidor', error: error.message, stack: error.stack });
  }
};

export const scheduleOutcomeInCalendar = async (req, res) => {
  const { planningId, phaseIndex, competenceIndex, rapIndex, activityIndex } = req.body;

  try {
    const planningObj = await Planning.findById(planningId);
    if (!planningObj) {
      return res.status(404).json({ message: 'Planeación no encontrada' });
    }

    const planning = planningObj.pedagogicalPlanning;
    const phase = planning.content[phaseIndex];
    const comp = phase.competencies[competenceIndex];
    const rap = comp.learningOutcomes[rapIndex];
    const act = rap.pedagogicalActivities[activityIndex];

    if (!act.scheduleDetails || !act.scheduleDetails.assignedDays || act.scheduleDetails.assignedDays.length === 0) {
      return res.status(400).json({ message: 'El resultado no tiene días asignados en el calendario' });
    }

    if (!act.suggestedInstructor || !act.suggestedInstructor.id) {
      return res.status(400).json({ message: 'El resultado no tiene un instructor asignado' });
    }

    // 1. Buscar Ficha
    const dbFiche = await Fiche.findOne({ number: planning.fiche });
    if (!dbFiche) {
      return res.status(400).json({ message: `No se encontró la Ficha con número ${planning.fiche} en el sistema general` });
    }

    // 2. Buscar Programa (Priorizar el programa vinculado directamente a la Ficha)
    let dbProgram = await Program.findById(dbFiche.program);
    if (!dbProgram) {
      dbProgram = await Program.findOne({ code: planning.metadata.programCode });
    }
    if (!dbProgram) {
      dbProgram = await Program.findOne(); // Fallback de emergencia
    }
    if (!dbProgram) {
      return res.status(400).json({ message: 'No se encontró ningún Programa registrado en el sistema general' });
    }

    // 3. Buscar Competencia (Auto-creación autosanadora si no existe)
    let dbCompetence = await Competence.findOne({ number: comp.code });
    if (!dbCompetence) {
      dbCompetence = new Competence({
        name: comp.name.toUpperCase().trim(),
        number: comp.code.trim(),
        program: dbProgram._id,
        status: 0
      });
      await dbCompetence.save();
    }

    // 4. Buscar Resultado (RAP) (Auto-creación autosanadora si no existe)
    let dbOutcome = await Outcome.findOne({ outcomes: rap.description, competence: dbCompetence._id });
    if (!dbOutcome) {
      dbOutcome = new Outcome({
        outcomes: rap.description.trim(),
        code: "RAP-AUTO",
        competence: dbCompetence._id,
        status: 0
      });
      await dbOutcome.save();
    }

    // 5. Buscar Instructor
    const dbInstructor = await Instructor.findById(act.suggestedInstructor.id);
    if (!dbInstructor) {
      return res.status(400).json({ message: 'No se encontró el instructor asignado en el sistema general' });
    }

    // 6. Buscar o asignar Ambiente
    let dbEnvironment = null;
    if (act.environment && act.environment.type) {
      dbEnvironment = await Environment.findOne({ name: new RegExp(act.environment.type, 'i') });
    }
    if (!dbEnvironment) {
      dbEnvironment = await Environment.findOne({ status: 0 });
    }

    // Definir tiempos por jornada estándar
    let tstart = '07:00';
    let tend = '12:00';
    if (act.scheduleDetails.shift === 'afternoon') {
      tstart = '13:00';
      tend = '18:00';
    } else if (act.scheduleDetails.shift === 'night') {
      tstart = '18:00';
      tend = '22:00';
    }

    // Formatear fechas y días de la semana
    const sortedDays = [...act.scheduleDetails.assignedDays].sort();
    const fstart = sortedDays[0];
    const fend = sortedDays[sortedDays.length - 1];

    // Obtener días de la semana en formato numérico UTC
    const daysOfWeek = Array.from(new Set(sortedDays.map(d => {
      const dateParts = d.split('-');
      const dateUTC = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
      return dateUTC.getUTCDay();
    })));

    // Calcular horas
    const hourswork = Number(act.hours?.direct) || (sortedDays.length * (act.scheduleDetails.hoursPerDay || 4));

    // Verificar si ya existe este resultado de aprendizaje programado en esta ficha para evitar duplicaciones
    const existingSchedule = await Schedule.findOne({
      fiche: dbFiche._id,
      outcome: dbOutcome._id,
      status: 0
    });

    if (existingSchedule) {
      return res.status(400).json({ message: 'Este Resultado de Aprendizaje ya se encuentra programado para esta ficha' });
    }

    // Crear el nuevo registro de Horario (Schedule)
    const newSchedule = new Schedule({
      fiche: dbFiche._id,
      program: dbProgram._id,
      competence: dbCompetence._id,
      outcome: dbOutcome._id,
      instructor: dbInstructor._id,
      supporttext: 'PLANEACIÓN PEDAGÓGICA',
      observation: act.scheduleDetails.calendarNotes || 'PROGRAMADO DESDE EL MÓDULO DE PLANEACIÓN',
      environment: dbEnvironment ? dbEnvironment._id : undefined,
      days: daysOfWeek,
      fstart: new Date(fstart),
      fend: new Date(fend),
      tstart,
      tend,
      hourswork,
      events: sortedDays.map(d => {
        const dateParts = d.split('-');
        return new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
      }),
      status: 0 // Activo
    });

    await newSchedule.save();

    // Actualizar horas acumuladas del instructor
    dbInstructor.hourswork = (dbInstructor.hourswork || 0) + hourswork;
    await dbInstructor.save();

    res.json({ message: '¡Resultado programado con éxito en el calendario oficial!', schedule: newSchedule });
  } catch (error) {
    console.error('[ERROR] scheduleOutcomeInCalendar:', error);
    res.status(500).json({ message: 'Error interno al programar resultado', error: error.message });
  }
};

export const savePlanningTemplate = async (req, res) => {
  try {
    const { programCode, programName, content, savedBy } = req.body;
    if (!programCode || !programName || !content) {
      return res.status(400).json({ message: 'Datos incompletos para guardar la planilla' });
    }

    const updated = await PlanningTemplate.findOneAndUpdate(
      { programCode: programCode.trim() },
      {
        $set: {
          programName: programName.trim(),
          content,
          savedBy,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Planilla de programa guardada exitosamente', data: updated });
  } catch (error) {
    console.error('[ERROR] savePlanningTemplate:', error);
    res.status(500).json({ message: 'Error al guardar la planilla del programa', error: error.message });
  }
};

export const getPlanningTemplate = async (req, res) => {
  try {
    const { programCode } = req.params;
    const template = await PlanningTemplate.findOne({ programCode: programCode.trim() });
    if (!template) {
      return res.status(404).json({ message: 'No se encontró una planilla guardada para este programa' });
    }
    res.json(template);
  } catch (error) {
    console.error('[ERROR] getPlanningTemplate:', error);
    res.status(500).json({ message: 'Error al obtener la planilla del programa', error: error.message });
  }
};
