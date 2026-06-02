import pdfplumber
import json
import requests
import re
import os
import sys
import unicodedata
import traceback

# Configuración de codificación para Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# Configuración de log interno
DEBUG_LOG = "extractor_debug.log"
with open(DEBUG_LOG, "w") as f: f.write("--- INICIO DE EXTRACCION ---\n")

def log_debug(msg):
    print(msg)
    with open(DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

def clean_cid_and_spacing(text):
    if not text: return ""
    text = re.sub(r'\(cid:\d+\)', ' ', text)
    text = re.sub(r'\d{2}/\d{2}/\d{2,4}.*?Página \d+ de \d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'GFPI- F-\d+ v\d+', '', text, flags=re.IGNORECASE)
    text = "".join(c for c in text if c.isprintable() or c in "\n\r\t")
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_text(text):
    if not text: return ""
    text = clean_cid_and_spacing(text)
    text = unicodedata.normalize('NFD', text)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    return text.upper().strip()

def ultra_normalize(text):
    if not text: return ""
    text = normalize_text(text)
    return re.sub(r'[^A-Z0-9]', '', text)

def normalize_date(date_str):
    """ Convierte fechas tipo '10 de Febrero 2025' o '10/02/2025' a ISO (YYYY-MM-DD) para MongoDB """
    if not date_str: return None
    months = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    }
    try:
        d = date_str.lower().replace(' de ', ' ').replace('/', ' ').replace('-', ' ')
        parts = d.split()
        if len(parts) < 3: return None
        day = parts[0].zfill(2)
        month = parts[1]
        year = parts[2]
        if month in months: month = months[month]
        else: month = month.zfill(2)
        if len(year) == 2: year = "20" + year
        return f"{year}-{month}-{day}"
    except: return None

class SenaExtractor:
    def __init__(self, program_pdf, project_pdf, team_pdf=None, fiche="000000"):
        self.program_pdf = program_pdf
        self.project_pdf = project_pdf
        self.team_pdf = team_pdf
        self.fiche = str(fiche).strip()
        if self.fiche in ["000000", "", "EXTRACTED", "undefined", "null"]:
            self._auto_detect_fiche()
        
        log_debug(f"[INIT] Usando Ficha: {self.fiche}")
        self.unique_raps_codes = set()
        self.global_rap_registry = set()
        self.data = {"pedagogicalPlanning": {"metadata": {"programName": "", "programCode": "", "totalHours": 0, "lectivaHours": 0, "productivaHours": 0, "teamPdfProcessed": False}, "fiche": self.fiche, "status": "draft", "content": []}}
        
        self.competencies_data = {} 
        self.instructor_map = {}   
        self.temp_content = {}
        self.phase_activities = {}

    def _auto_detect_fiche(self):
        try:
            with pdfplumber.open(self.project_pdf) as pdf:
                for page in pdf.pages[:3]:
                    text = page.extract_text()
                    if text:
                        match = re.search(r'C[oó]digo\s+Proyecto\s+SOFIA\s*:\s*(\d+)', text, re.IGNORECASE)
                        if match: self.fiche = match.group(1).strip(); return
        except: pass

    def extract_program_details(self):
        """ PDF 1: DICCIONARIO DE DATOS (REFORZADO) """
        log_debug(f"[STEP 1] Analizando Programa (PDF 1)...")
        try:
            with pdfplumber.open(self.program_pdf) as pdf:
                all_text = ""
                for page in pdf.pages: all_text += (page.extract_text() or "") + "\n---PAGE---\n"
                
                all_text_clean = re.sub(r'\(cid:\d+\)', ' ', all_text)
                self.data["pedagogicalPlanning"]["metadata"]["programName"] = self._regex_find(r'Denominaci[oó]n\s*del Programa:\s*(.*)', all_text_clean, "PROGRAMA")
                self.data["pedagogicalPlanning"]["metadata"]["programCode"] = self._regex_find(r'C[oó]digo\s*Programa:\s*(\d+)', all_text_clean, "000000")
                
                comp_sections = re.split(r'CONTENIDOS\s+CURRICULARES', all_text_clean, flags=re.IGNORECASE)
                for section in comp_sections[1:]:
                    code_match = re.search(r'\b(\d{9})\b', section)
                    if not code_match: continue
                    code = code_match.group(1)
                    
                    # LIMPIEZA AGRESIVA DE NOMBRE
                    name_match = re.search(r'(?:4\.1|COMPETENCIA)\s*(.*?)\s*(?:4\.2|C[OÓ]DIGO|DURACI[OÓ]N)', section, re.IGNORECASE | re.DOTALL)
                    raw_name = name_match.group(1) if name_match else f"{code}"
                    full_name = re.sub(r'^.*?NORMA\s*/\s*UNIDAD\s*DE\s*', '', raw_name, flags=re.IGNORECASE | re.DOTALL)
                    full_name = re.sub(r'^\s*COMPETENCIA\s*', '', full_name, flags=re.IGNORECASE)
                    full_name = re.sub(r'\s*COMPETENCIA\s*$', '', full_name, flags=re.IGNORECASE)
                    full_name = re.sub(r'^\s*4\.1\s*', '', full_name, flags=re.IGNORECASE)
                    full_name = clean_cid_and_spacing(full_name).upper().strip()
                    
                    # EXTRACCIÓN DE DURACIÓN (Numeral 4.4)
                    dur_match = re.search(r'4\.4\s+DURACI[OÓ]N\s+M[AÁ]XIMA.*?(\d+)\s*horas', section, re.IGNORECASE | re.DOTALL)
                    duration = int(dur_match.group(1)) if dur_match else 0
                    
                    self.competencies_data[code] = {"name": full_name, "code": code, "duration": duration, "concepts": [], "processes": [], "criteria": []}
                    
                    s_match = re.search(r'CONOCIMIENTOS\s+DEL\s+SABER\s*(.*?)\s*(?:CONOCIMIENTOS\s+DE\s+PROCESO|CRITERIOS|4\.)', section, re.IGNORECASE | re.DOTALL)
                    if s_match: self.competencies_data[code]["concepts"] = self._clean_list(s_match.group(1))
                    p_match = re.search(r'CONOCIMIENTOS\s+DE\s+PROCESO\s*(.*?)\s*(?:CONOCIMIENTOS\s+DEL\s+SABER|CRITERIOS|4\.)', section, re.IGNORECASE | re.DOTALL)
                    if p_match: self.competencies_data[code]["processes"] = self._clean_list(p_match.group(1))
                    c_match = re.search(r'CRITERIOS\s+DE\s+EVALUACI[OÓ]N\s*(.*?)\s*(?:PERFIL|CONTENIDOS|4\.|5\.|6\.)', section, re.IGNORECASE | re.DOTALL)
                    if c_match: self.competencies_data[code]["criteria"] = self._clean_list(c_match.group(1))
        except Exception as e: log_debug(f"[ERROR PDF 1] {e}")

    def extract_team_details(self):
        """ PDF 3: EQUIPO - CRUCE FLEXIBLE """
        if not self.team_pdf: return
        log_debug(f"[STEP 1.5] Analizando Equipo (PDF 3)...")
        try:
            with pdfplumber.open(self.team_pdf) as pdf:
                full_text = ""
                for page in pdf.pages: full_text += (page.extract_text() or "") + "\n"
                
                date_p = r'(\d{1,2}(?:\s+de\s+[a-zA-Z]+|\s*[\/\-]\s*\d{1,2})\s*[\/\-]?\s*\d{2,4})'
                s_match = re.search(r'inicio.*?Etapa.*?Lectiva.*?' + date_p, full_text, re.IGNORECASE | re.DOTALL)
                if s_match: self.data["pedagogicalPlanning"]["metadata"]["lectivaStartDate"] = normalize_date(s_match.group(1))
                e_match = re.search(r'Fin.*?Etapa.*?Lectiva.*?' + date_p, full_text, re.IGNORECASE | re.DOTALL)
                if e_match: self.data["pedagogicalPlanning"]["metadata"]["lectivaEndDate"] = normalize_date(e_match.group(1))

                for page in pdf.pages:
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if not row or len(row) < 2: continue
                            instructor = clean_cid_and_spacing(str(row[0]))
                            if not instructor or normalize_text(instructor) in ["INSTRUCTOR", "NOMBRE", "COMPETENCIAS"]: continue
                            
                            # Separar competencias por viñetas o saltos
                            c_raw = str(row[1])
                            c_lines = re.split(r'[•●\-\*]|\n', c_raw)
                            for c_line in c_lines:
                                line_clean = clean_cid_and_spacing(c_line)
                                if len(line_clean) < 10: continue
                                
                                code_m = re.search(r'\b(\d{9})\b', line_clean)
                                if code_m:
                                    self.instructor_map[code_m.group(1)] = instructor
                                else:
                                    # Fallback: Coincidencia por palabras clave
                                    words = {w for w in normalize_text(line_clean).split() if len(w) > 3}
                                    if words:
                                        if "keyword_matches" not in self.instructor_map: self.instructor_map["keyword_matches"] = []
                                        self.instructor_map["keyword_matches"].append({"keywords": words, "name": instructor})
            log_debug(f"  [PDF 3] Datos procesados.")
        except Exception as e: log_debug(f"[ERROR PDF 3] {e}")

    def _get_suggested_instructor(self, c_code, c_full_name):
        if c_code in self.instructor_map: return self.instructor_map[c_code]
        if "keyword_matches" in self.instructor_map:
            comp_words = {w for w in normalize_text(c_full_name).split() if len(w) > 3}
            best_match, max_overlap = "", 0
            for entry in self.instructor_map["keyword_matches"]:
                overlap = len(comp_words.intersection(entry["keywords"]))
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_match = entry["name"]
            if max_overlap > 0 and (max_overlap / len(comp_words)) >= 0.4: return best_match
        return ""

    def _detect_phase(self, text):
        if not text: return None
        raw = clean_cid_and_spacing(text).upper()
        if len(raw) < 5 or len(raw) > 15: return None
        nl = normalize_text(raw)
        if nl == "ANALISIS": return "ANALYSIS"
        if nl == "PLANEACION": return "PLANNING"
        if nl == "EJECUCION": return "EXECUTION"
        if nl == "EVALUACION": return "EVALUATION"
        if nl == "INDUCCION": return "INDUCCION"
        return None

    def extract_project_structure(self):
        log_debug(f"[STEP 2] Analizando Proyecto (PDF 2)...")
        current_phase = "ANALYSIS"
        last_comp = None
        try:
            with pdfplumber.open(self.project_pdf) as pdf:
                for page in pdf.pages:
                    if any(x in (page.extract_text() or "").upper() for x in ["TABLA DE CONTENIDO", "INDICE"]): continue
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if not row or len(row) < 2: continue
                            cells = [clean_cid_and_spacing(str(c)) for c in row]
                            for i in [0, 1]:
                                if i < len(cells):
                                    found = self._detect_phase(cells[i])
                                    if found: current_phase = found; break
                            if len(cells) > 1 and len(cells[1]) > 25:
                                self.phase_activities[current_phase] = cells[1].strip().upper()
                            comp_match = re.search(r'\b(\d{9})\b', " ".join(cells))
                            if comp_match: last_comp = comp_match.group(1)
                            for i in range(1, len(cells)):
                                r_match = re.search(r'\b(\d{6,7})\b', cells[i])
                                if r_match and last_comp:
                                    r_code = r_match.group(1)
                                    if r_code in self.global_rap_registry: continue
                                    r_desc = re.sub(r'^[ \-.\d]+', '', cells[i].replace(r_code, "")).strip().upper()
                                    if len(r_desc) > 10:
                                        self._integrate(current_phase, last_comp, r_desc, r_code)
                                        self.global_rap_registry.add(r_code)
                                        self.unique_raps_codes.add(r_code)
                                        break
            self._final_cleanup()
        except Exception as e: log_debug(f"[ERROR PDF 2] {e}"); self._final_cleanup()

    def _integrate(self, phase, c_code, r_desc, r_code):
        if phase not in self.temp_content: self.temp_content[phase] = []
        c_info = self.competencies_data.get(c_code) or {"name": f"COMPETENCIA {c_code}", "code": c_code, "duration": 0, "concepts": [], "processes": [], "criteria": []}
        c_node = next((c for c in self.temp_content[phase] if c["code"] == c_code), None)
        if not c_node:
            instr = self._get_suggested_instructor(c_code, c_info["name"])
            c_node = {
                "name": c_info["name"], "code": c_code, "totalCompetenceHours": c_info.get("duration", 0),
                "knowledge": {"conceptsAndPrinciples": c_info["concepts"], "processes": c_info["processes"]},
                "evaluationCriteria": c_info["criteria"], "learningOutcomes": [], 
                "suggestedInstructor": {"id": "", "name": instr}
            }
            self.temp_content[phase].append(c_node)
        if not any(r["description"] == r_desc for r in c_node["learningOutcomes"]):
            c_node["learningOutcomes"].append({
                "description": r_desc, "evaluationCriteria": [], 
                "pedagogicalActivities": [{
                    "description": "", 
                    "hours": {"direct": 0, "independent": 0}, 
                    "learningEvidences": [], "didacticStrategies": [], 
                    "environment": {"type": "", "materials": []}, "observations": "",
                    "suggestedInstructor": c_node["suggestedInstructor"], 
                    "scheduleDetails": {"assignedDays": [], "shift": "", "calendarNotes": ""}
                }]
            })

    def _final_cleanup(self):
        self.data["pedagogicalPlanning"]["content"] = []
        for p in ["INDUCCION", "ANALYSIS", "PLANNING", "EXECUTION", "EVALUATION"]:
            if p in self.temp_content:
                phase_act = self.phase_activities.get(p, "ACTIVIDAD GENERAL DE LA FASE")
                self.data["pedagogicalPlanning"]["content"].append({"phase": p, "projectActivity": phase_act, "competencies": self.temp_content[p]})

    def _regex_find(self, pattern, text, default):
        m = re.search(pattern, text, re.IGNORECASE)
        return clean_cid_and_spacing(m.group(1)) if m else default

    def _clean_list(self, text):
        if not text: return []
        text = clean_cid_and_spacing(text)
        items = re.split(r'\.\s+|\n|(?<=[A-Z])\s*-\s*', text)
        cleaned = []
        for i in items:
            s = re.sub(r'^\d+(\.\d+)*\s*', '', i).strip()
            if len(s) > 2 and "Página" not in s: cleaned.append(s.upper())
        return list(dict.fromkeys(cleaned))

    def output_result(self):
        if self.data["pedagogicalPlanning"]["content"]:
            print("---JSON_START---")
            print(json.dumps(self.data))
            print("---JSON_END---")

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 3: sys.exit(1)
    program, project, team, fiche = args[0], args[1], (args[2] if len(args)==4 else None), (args[3] if len(args)==4 else args[2])
    ext = SenaExtractor(program, project, team, fiche)
    ext.extract_program_details(); ext.extract_team_details(); ext.extract_project_structure(); ext.output_result()
    log_debug(f"[DONE] Total RAPs: {len(ext.unique_raps_codes)}. Ficha: {ext.fiche}")
