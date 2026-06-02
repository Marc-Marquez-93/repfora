import Planning from '../models/Planning.js';
import Fiche from '../models/Fiche.js';
import Program from '../models/Program.js';
import Competence from '../models/Competence.js';
import Outcome from '../models/Outcome.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sendEmail from '../utils/emails/sendEmail.js';
import Instructor from '../models/Instructor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadPlanning = async (req, res) => {
  try {
    const { fiche, pedagogicalPlanning } = req.body;
    const targetFiche = fiche || pedagogicalPlanning?.fiche;

    if (!targetFiche) {
      return res.status(400).json({ message: 'Falta el número de ficha' });
    }

    // Detect newly confirmed activities (with all details) instead of just instructor names
    const getConfirmedActivities = (content) => {
      const confirmed = new Map();
      if (!content) return confirmed;
      content.forEach(phase => {
        if (phase.competencies) {
          phase.competencies.forEach(comp => {
            if (comp.learningOutcomes) {
              comp.learningOutcomes.forEach(rap => {
                if (rap.pedagogicalActivities) {
                  rap.pedagogicalActivities.forEach(act => {
                    const sugg = act.suggestedInstructor || act.instructors;
                    if (sugg && sugg.name && sugg.assignmentStatus === 'confirmed') {
                      // Crear una clave única que represente a esta actividad asignada y confirmada
                      const key = `${comp.code}||${rap.description}||${act.description || act.observations || ''}`.trim().toUpperCase();
                      confirmed.set(key, {
                        instructorName: sugg.name.trim().toUpperCase(),
                        phase: phase.phase,
                        competenceCode: comp.code,
                        competenceName: comp.name,
                        rapDescription: rap.description,
                        activityDescription: act.description || act.observations || 'Sin descripción',
                        hoursDirect: act.hours?.direct || 0,
                        hoursIndependent: act.hours?.independent || 0
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
      return confirmed;
    };

    const existingPlanning = await Planning.findOne({ 'pedagogicalPlanning.fiche': targetFiche });
    const oldConfirmedActs = existingPlanning ? getConfirmedActivities(existingPlanning.pedagogicalPlanning?.content) : new Map();
    const newConfirmedActs = getConfirmedActivities(pedagogicalPlanning.content);

    const newlyConfirmedActs = [];
    for (const [key, actData] of newConfirmedActs.entries()) {
      if (!oldConfirmedActs.has(key)) {
        newlyConfirmedActs.push(actData);
      }
    }

    let planning = await Planning.findOneAndUpdate(
      { 'pedagogicalPlanning.fiche': targetFiche },
      { $set: { pedagogicalPlanning } },
      { upsert: true, new: true }
    );

    // Send detailed email notifications to newly confirmed instructors in the background
    if (newlyConfirmedActs.length > 0) {
      const programName = pedagogicalPlanning.metadata?.programName || 'Programa de Formación';
      
      // Agrupar actividades por nombre de instructor
      const actsByInstructor = new Map();
      newlyConfirmedActs.forEach(act => {
        const instName = act.instructorName;
        if (!actsByInstructor.has(instName)) {
          actsByInstructor.set(instName, []);
        }
        actsByInstructor.get(instName).push(act);
      });

      (async () => {
        for (const [instName, acts] of actsByInstructor.entries()) {
          try {
            const inst = await Instructor.findOne({ name: new RegExp(`^${instName}$`, 'i') });
            if (inst && inst.email) {
              console.log(`[EMAIL] Notificando al instructor: ${inst.name} (${inst.email}) para ficha ${targetFiche} con ${acts.length} actividades.`);
              
              await sendEmail(
                process.env.FROM_EMAIL,
                process.env.SECURY_EMAIL,
                [inst.email],
                `Nueva Actividad Asignada y Confirmada - Ficha ${targetFiche}`,
                {
                  name: inst.name,
                  fiche: targetFiche,
                  programName: programName,
                  url: `${process.env.URL_FRONTEND}/`,
                  activities: acts
                },
                "./template/planningNotification.hbs"
              );
            } else {
              console.log(`[EMAIL] No se encontró el instructor o su correo para: ${instName}`);
            }
          } catch (emailError) {
            console.error(`[EMAIL ERROR] Error enviando correo a ${instName}:`, emailError.message);
          }
        }
      })();
    }

    res.json({ message: 'Planeación guardada con éxito', data: planning });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar planeación', error: error.message });
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
      return res.status(400).json({ message: 'Faltan archivos esenciales (Programa y Proyecto)' });
    }

    const programPath = path.resolve(req.files.programPdf.tempFilePath);
    const projectPath = path.resolve(req.files.projectPdf.tempFilePath);
    const teamPath = req.files.teamPdf ? path.resolve(req.files.teamPdf.tempFilePath) : null;
    
    const scriptsDir = path.resolve(__dirname, '../scripts');
    const extractorPath = path.join(scriptsDir, 'extractor.py');

    console.log(`[EXTRACT] Iniciando para ficha ${fiche}. Equipo Ejecutor: ${teamPath ? 'SÍ' : 'NO'}`);

    // Construir comando dinámico
    const pyCmd = process.platform === 'win32' ? 'py' : 'python3';
    let command = teamPath
      ? `${pyCmd} "${extractorPath}" "${programPath}" "${projectPath}" "${teamPath}" "${fiche}"`
      : `${pyCmd} "${extractorPath}" "${programPath}" "${projectPath}" "${fiche}"`;

    exec(command, { timeout: 120000 }, async (error, stdout, stderr) => {
      const cleanup = () => {
        try {
          if (fs.existsSync(programPath)) fs.unlinkSync(programPath);
          if (fs.existsSync(projectPath)) fs.unlinkSync(projectPath);
          if (teamPath && fs.existsSync(teamPath)) fs.unlinkSync(teamPath);
          console.log('[CLEANUP] Archivos temporales eliminados');
        } catch (e) { console.error('Error cleanup:', e.message); }
      };

      if (error) {
        cleanup();
        console.error('[ERROR] Extractor:', stderr || error.message);
        return res.status(500).json({ message: 'Error en la extracción', error: stderr || error.message });
      }

      // CAPTURAR JSON DESDE STDOUT (Sincrónico y Seguro)
      let planningData = null;
      const jsonMatch = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);
      if (jsonMatch) {
        try {
          planningData = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
          console.error('[ERROR] Falló el parseo del JSON extraído:', e.message);
        }
      }

      if (!planningData) {
        cleanup();
        return res.status(500).json({ message: 'No se extrajeron datos válidos del PDF', stdout });
      }

      // GUARDAR O ACTUALIZAR EN BASE DE DATOS
      const finalFiche = planningData.pedagogicalPlanning.fiche || fiche;
      try {
        if (leaderEmail) {
          planningData.pedagogicalPlanning.leaderEmail = leaderEmail.trim().toLowerCase();
        }

        // Asegurar nombres de competencias para evitar errores en UI
        if (planningData.pedagogicalPlanning.content) {
          planningData.pedagogicalPlanning.content.forEach(phase => {
            if (phase.competencies) {
              phase.competencies.forEach(comp => {
                if (!comp.name) comp.name = `COMPETENCIA ${comp.code || 'SIN CODIGO'}`;
              });
            }
          });
        }

        let planning = await Planning.findOneAndUpdate(
          { 'pedagogicalPlanning.fiche': finalFiche },
          { $set: planningData },
          { upsert: true, new: true }
        );

        cleanup();
        console.log(`[EXTRACT] Éxito para ficha ${finalFiche}`);
        return res.json({ message: 'Éxito', data: planning, finalFiche });
      } catch (dbError) {
        cleanup();
        console.error('[ERROR] Error al guardar en BD:', dbError.message);
        return res.status(500).json({ message: 'Error al guardar datos extraídos', error: dbError.message });
      }
    });
  } catch (err) {
    console.error('[ERROR GLOBAL]:', err.message);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
};

export const getAllPlannings = async (req, res) => {
  try {
    const plannings = await Planning.find({}, { 'pedagogicalPlanning.metadata': 1, 'pedagogicalPlanning.fiche': 1 });
    res.json(plannings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planeaciones', error: error.message });
  }
};

export const scheduleOutcomeInCalendar = async (req, res) => {
  try {
    const { planningId, phaseIndex, competenceIndex, rapIndex, activityIndex } = req.body;
    
    // Si recibimos formato de índices (nuevo flujo del frontend en SchedulerView)
    if (planningId !== undefined && phaseIndex !== undefined) {
      const planning = await Planning.findById(planningId);
      if (!planning) return res.status(404).json({ message: 'Planeación no encontrada' });

      const phase = planning.pedagogicalPlanning.content[phaseIndex];
      const comp = phase?.competencies[competenceIndex];
      const rap = comp?.learningOutcomes[rapIndex];
      const act = rap?.pedagogicalActivities[activityIndex];

      if (!act) return res.status(404).json({ message: 'Actividad o resultado no encontrado' });

      const sugg = act.suggestedInstructor || act.instructors;
      if (!sugg || sugg.assignmentStatus !== 'confirmed') {
        return res.status(400).json({ message: 'El instructor asignado debe estar CONFIRMADO para poder programar este resultado.' });
      }

      // Marcar como oficialmente programado y publicado
      act.isScheduledInCalendar = true;
      if (!act.scheduleDetails) {
        act.scheduleDetails = {};
      }
      act.scheduleDetails.isPublished = true;

      await planning.save();
      return res.json({ message: '¡Resultado programado con éxito en el calendario oficial!', data: planning });
    }

    // Flujo alternativo/fallback
    const { fiche, phaseId, competenceCode, outcomeDesc, scheduleData } = req.body;
    const planning = await Planning.findOne({ 'pedagogicalPlanning.fiche': fiche });
    if (!planning) return res.status(404).json({ message: 'Planeación no encontrada' });
    const phase = planning.pedagogicalPlanning.content.find(p => p.phase === phaseId);
    const comp = phase?.competencies.find(c => c.code === competenceCode);
    const outcome = comp?.learningOutcomes.find(o => o.description === outcomeDesc);
    if (outcome) {
      if (outcome.pedagogicalActivities && outcome.pedagogicalActivities[0]) {
        outcome.pedagogicalActivities[0].scheduleDetails = scheduleData;
      }
      await planning.save();
      res.json({ message: 'Calendario actualizado', data: planning });
    } else {
      res.status(404).json({ message: 'Resultado no encontrado' });
    }
  } catch (error) {
    console.error('[SCHEDULE OUTCOME ERROR]:', error.message);
    res.status(500).json({ message: 'Error al programar el resultado', error: error.message });
  }
};

export const savePlanningTemplate = async (req, res) => {
  try {
    const { programCode, template } = req.body;
    res.json({ message: 'Planilla guardada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar planilla' });
  }
};

export const getPlanningTemplate = async (req, res) => {
  try {
    const { programCode } = req.params;
    res.json(null);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener planilla' });
  }
};