import pdfplumber
import json
import requests
import re
import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

class SenaExtractor:
    def __init__(self, program_pdf, project_pdf, fiche="000000"):
        self.program_pdf = program_pdf
        self.project_pdf = project_pdf
        self.fiche = fiche
        
        # Intentar extraer el Código Proyecto SOFIA si la ficha es temporal o genérica
        if self.fiche == "000000" or self.fiche.startswith("EXTRACTED_") or self.fiche == "":
            try:
                with pdfplumber.open(self.project_pdf) as pdf:
                    for page in pdf.pages[:3]: # Buscar en las primeras 3 páginas
                        text = page.extract_text()
                        if text:
                            # Buscar "Código Proyecto SOFIA:" o similar seguido de un número
                            match = re.search(r'C[óo]digo\s+Proyecto\s+SOFIA\s*:\s*(\d+)', text, re.IGNORECASE)
                            if match:
                                self.fiche = match.group(1).strip()
                                print(f"[INFO] Ficha detectada automaticamente de Codigo Proyecto SOFIA: {self.fiche}")
                                break
                            match_var = re.search(r'C[óo]digo\s+(?:del\s+)?Proyecto\s*:\s*(\d+)', text, re.IGNORECASE)
                            if match_var:
                                self.fiche = match_var.group(1).strip()
                                print(f"[INFO] Ficha detectada automaticamente de Codigo Proyecto: {self.fiche}")
                                break
            except Exception as e:
                print(f"[WARN] Error al auto-detectar ficha del PDF: {e}")

        self.processed_raps = set()
        
        self.data = {
            "pedagogicalPlanning": {
                "metadata": {"totalHours": 0, "lectivaHours": 0, "productivaHours": 0},
                "fiche": self.fiche, 
                "status": "draft",
                "content": []
            }
        }
        self.competencies_data = {}

    def extract_program_details(self):
        print(f"[STEP 1] Analizando Programa...")
        with pdfplumber.open(self.program_pdf) as pdf:
            all_text = "\n".join([p.extract_text() or "" for p in pdf.pages[:10]])
            
            # Metadata básica
            self.data["pedagogicalPlanning"]["metadata"]["programName"] = self._regex_find(r'Denominación\s*del Programa:\s*(.*)', all_text, "PROGRAMA DE FORMACION")
            self.data["pedagogicalPlanning"]["metadata"]["programCode"] = self._regex_find(r'Código\s*Programa:\s*(\d+)', all_text, "000000")
            
            lectiva = self._regex_find(r'Etapa\s*Lectiva:\s*(\d+)', all_text, "0")
            productiva = self._regex_find(r'Etapa\s*Productiva:\s*(\d+)', all_text, "0")
            self.data["pedagogicalPlanning"]["metadata"]["lectivaHours"] = int(lectiva)
            self.data["pedagogicalPlanning"]["metadata"]["productivaHours"] = int(productiva)
            self.data["pedagogicalPlanning"]["metadata"]["totalHours"] = int(lectiva) + int(productiva)

            current_comp = None
            for page in pdf.pages[1:]:
                text = page.extract_text()
                if not text: continue
                
                # Detectar Competencia
                comp_match = re.search(r'(\d{9})\b', text)
                if comp_match:
                    c_code = comp_match.group(1)
                    current_comp = c_code
                    if current_comp not in self.competencies_data:
                        self.competencies_data[current_comp] = {
                            "name": f"Competencia {current_comp}",
                            "hours": 0, "concepts": [], "processes": [], "criteria": []
                        }
                        # Buscar horas cerca del código
                        h_match = re.search(r'(\d+)\s*Horas', text[text.find(c_code):text.find(c_code)+200], re.IGNORECASE)
                        if h_match: self.competencies_data[current_comp]["hours"] = int(h_match.group(1))

                if not current_comp: continue
                
                t_up = text.upper()
                # Búsqueda más flexible de conocimientos
                if "CONOCIMIENTOS" in t_up and ("SABER" in t_up or "CONCEPTO" in t_up):
                    try:
                        # Intentar capturar Conceptos/Saber
                        if "CONCEPTO" in t_up or "SABER" in t_up:
                            start_marker = "CONOCIMIENTOS DE CONCEPTO" if "CONOCIMIENTOS DE CONCEPTO" in t_up else "CONOCIMIENTOS DEL SABER"
                            end_marker = "CONOCIMIENTOS DE PROCESO" if "CONOCIMIENTOS DE PROCESO" in t_up else "CONOCIMIENTOS DEL SABER HACER"
                            
                            if start_marker in t_up and end_marker in t_up:
                                part = t_up.split(start_marker)[1].split(end_marker)[0]
                                self.competencies_data[current_comp]["concepts"].extend(self._clean_list(part))
                        
                        # Intentar capturar Procesos/Saber Hacer
                        if "PROCESO" in t_up or "SABER HACER" in t_up:
                            start_marker = "CONOCIMIENTOS DE PROCESO" if "CONOCIMIENTOS DE PROCESO" in t_up else "CONOCICMIENTOS DEL SABER HACER"
                            end_marker = "CRITERIOS DE EVALUACIÓN"
                            
                            if start_marker in t_up and end_marker in t_up:
                                part = t_up.split(start_marker)[1].split(end_marker)[0]
                                self.competencies_data[current_comp]["processes"].extend(self._clean_list(part))
                    except Exception as e:
                        print(f"[WARN] Error extrayendo conocimientos: {e}")

                if "CRITERIOS DE EVALUACIÓN" in t_up:
                    part = t_up.split("CRITERIOS DE EVALUACIÓN")[1].split("12. CONTROL DE CAMBIOS")[0]
                    self.competencies_data[current_comp]["criteria"].extend(self._clean_list(part))

    def extract_project_structure(self):
        print(f"[STEP 2] Analizando Proyecto...")
        current_phase = "ANALYSIS"
        current_proj_act = "Actividad General"
        
        # Mapa de normalización de fases
        phase_map = {
            "ANALISIS": "ANALYSIS", "ANÁLISIS": "ANALYSIS",
            "PLANEACION": "PLANNING", "PLANEACIÓN": "PLANNING",
            "EJECUCION": "EXECUTION", "EJECUCIÓN": "EXECUTION",
            "EVALUACION": "EVALUATION", "EVALUACIÓN": "EVALUATION",
            "ETAPA PRODUCTIVA": "ETAPA_PRODUCTIVA"
        }

        seen_triplets = set()

        with pdfplumber.open(self.project_pdf) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if not tables: continue
                
                for table in tables:
                    for row in table:
                        if not row or len(row) < 3: continue
                        
                        # Limpiar celdas
                        cells = [str(c).replace("\n", " ").strip() if c else "" for c in row]
                        
                        # 1. Detectar cambio de Fase en la primera columna
                        potential_phase = cells[0].upper()
                        for key, val in phase_map.items():
                            if key in potential_phase:
                                current_phase = val
                                break

                        # 2. Detectar Actividad de Proyecto (Segunda columna)
                        if len(cells[1]) > 20 and cells[1].upper() not in phase_map:
                            current_proj_act = cells[1]

                        # 3. Detectar RAP (6 dígitos) y Competencia (9 dígitos)
                        row_text = " ".join(cells)
                        rap_match = re.search(r'(\d{6})\b', row_text)
                        comp_match = re.search(r'(\d{9})\b', row_text)
                        
                        if rap_match and comp_match:
                            r_code, c_code = rap_match.group(1), comp_match.group(1)
                            
                            # Clave única para evitar duplicados en la misma extracción
                            unique_key = (current_phase, r_code, c_code)
                            if unique_key not in seen_triplets:
                                # Buscar la celda que contiene la descripción del RAP
                                r_desc = ""
                                for cell in cells:
                                    if r_code in cell:
                                        r_desc = cell.replace(r_code, "").replace(c_code, "").strip()
                                        r_desc = re.sub(r'^[ \-.]+', '', r_desc)
                                        break
                                
                                if not r_desc: r_desc = f"Resultado de Aprendizaje {r_code}"
                                
                                self._integrate(current_phase, current_proj_act, c_code, r_desc)
                                seen_triplets.add(unique_key)
                                self.processed_raps.add(f"{current_phase}_{r_code}")

        # Garantizar Etapa Productiva si no se detectó en tablas
        if "ETAPA_PRODUCTIVA" not in [p["phase"] for p in self.data["pedagogicalPlanning"]["content"]]:
            prod_h = self.data["pedagogicalPlanning"]["metadata"].get("productivaHours", 0)
            if prod_h > 0:
                self._integrate("ETAPA_PRODUCTIVA", "Etapa Productiva", "999999999", "Realizar etapa productiva")
                ep = next(p for p in self.data["pedagogicalPlanning"]["content"] if p["phase"] == "ETAPA_PRODUCTIVA")
                ep["competencies"][0]["totalCompetenceHours"] = prod_h

        print(f"[INFO] Extraccion finalizada: {len(self.processed_raps)} RAPs unicos in {len(self.data['pedagogicalPlanning']['content'])} fases.")

    def _integrate(self, phase, proj_act, c_code, r_desc):
        content = self.data["pedagogicalPlanning"]["content"]
        comp_info = self.competencies_data.get(c_code, {"name": f"Competencia {c_code}", "hours": 0, "concepts":[], "processes":[], "criteria":[]})
        
        phase_node = next((p for p in content if p["phase"] == phase), None)
        if not phase_node:
            phase_node = {"phase": phase, "projectActivity": proj_act, "competencies": []}
            content.append(phase_node)
        
        c_node = next((c for c in phase_node["competencies"] if c["code"] == c_code), None)
        if not c_node:
            c_node = {
                "name": comp_info["name"], "code": c_code, "totalCompetenceHours": comp_info["hours"],
                "knowledge": {
                    "conceptsAndPrinciples": list(set(comp_info["concepts"])), 
                    "processes": list(set(comp_info["processes"]))
                },
                "learningOutcomes": []
            }
            phase_node["competencies"].append(c_node)
        
        c_node["learningOutcomes"].append({
            "description": r_desc, 
            "evaluationCriteria": comp_info["criteria"],
            "pedagogicalActivities": [{
                "description": "", # Actividades de aprendizaje a desarrollar
                "hours": {"direct": 0, "independent": 0},
                "learningEvidences": [],
                "didacticStrategies": [],
                "environment": {
                    "type": "", # Ambientes de aprendizaje tipificados
                    "materials": [] # Materiales de formación
                },
                "observations": "", # Fechas y observaciones
                "suggestedInstructor": {"id": "", "name": ""},
                "scheduleDetails": {
                    "assignedDays": [],
                    "shift": "",
                    "calendarNotes": ""
                }
            }]
        })

    def _regex_find(self, pattern, text, default):
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).split("\n")[0].strip() if m else default

    def _clean_list(self, text):
        items = re.split(r'[\u2022\u00b7\-]|\d+\.', text)
        return [i.strip() for i in items if len(i.strip()) > 8]

    def send(self):
        if not self.data["pedagogicalPlanning"]["content"]:
            print("[WARN] No se extrajo contenido. Abortando subida.")
            return
        url = "http://localhost:4500/api/planning/upload"
        try:
            res = requests.post(url, json=self.data)
            if res.status_code == 200: print(f"[SYNC] Sincronizado con MongoDB con exito.")
            else: print(f"[ERROR] Error al subir: {res.text}")
        except Exception as e: print(f"[ERROR] No se pudo conectar al backend: {e}")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        p_pdf, pr_pdf, fiche = sys.argv[1], sys.argv[2], sys.argv[3]
        ext = SenaExtractor(p_pdf, pr_pdf, fiche)
        ext.extract_program_details()
        ext.extract_project_structure()
        ext.send()
        print(f"[DONE] Proceso finalizado. Ficha: {ext.fiche}")
