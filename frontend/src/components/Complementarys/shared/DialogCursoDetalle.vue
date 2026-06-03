<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.sm"
  >
    <q-card class="dialog-card">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-md" style="flex-shrink: 0">
        <div class="row items-center no-wrap">
          <div class="col">
            <div class="text-green-3 text-caption text-uppercase course-code">
              {{ code || course?.codVer }}
            </div>
            <div class="text-white text-weight-bold q-mt-xs course-name">
              {{ title || course?.prfDenominacion }}
            </div>
            <div class="row items-center q-gutter-xs q-mt-sm">
              <template v-if="headerBadges">
                <q-badge v-for="b in headerBadges" :key="b.label"
                  outline :color="b.color || 'green-3'" :label="b.label" class="dialog-badge" />
              </template>
              <template v-else>
                <q-badge outline color="green-3" :label="course?.modalidad || 'Sin modalidad'" class="dialog-badge" />
                <q-badge outline color="green-3"
                  :label="course?.prfDuracionMaxima != null ? course.prfDuracionMaxima + ' horas' : 'Sin duración'"
                  class="dialog-badge" />
                <q-badge outline color="green-3" :label="course?.tipoFormacion || 'Sin tipo'" class="dialog-badge" />
              </template>
            </div>
          </div>
          <q-btn round flat dense icon="close" color="green-3" v-close-popup
            class="q-ml-sm" style="align-self: flex-start" />
        </div>
      </q-card-section>

      <q-separator color="green-8" />

      <!-- Body con scroll -->
      <q-scroll-area class="dialog-scroll-area">
        <div class="q-pa-md">

          <!-- MODO GENÉRICO: secciones dinámicas recibidas por prop -->
          <template v-if="sections">
            <div class="row q-col-gutter-sm q-mb-sm">
              <div v-for="(section, i) in sections" :key="i"
                :class="section.fullWidth ? 'col-12' : 'col-12 col-sm-6'">
                <div class="section-box">
                  <div class="section-box__title">
                    <q-icon :name="section.icon" size="15px" class="q-mr-xs" />
                    {{ section.title }}
                  </div>
                  <div v-if="section.type !== 'list'" class="row section-content-centered">
                    <div v-for="item in section.items" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <q-badge v-if="item.badge"
                        :color="item.badge.color" :label="item.value || '—'"
                        class="q-mt-xs dialog-badge" />
                      <div v-else class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                  <div v-else class="q-px-lg q-py-md">
                    <div v-if="section.items.length">
                      <div v-for="(item, j) in section.items" :key="j"
                        class="row items-start no-wrap q-mb-sm">
                        <q-icon :name="section.listIcon || 'check_circle'"
                          color="green-6" size="15px" class="q-mr-sm" style="margin-top:3px;flex-shrink:0" />
                        <span class="data-value">{{ item }}</span>
                      </div>
                    </div>
                    <span v-else class="data-value text-grey-5">Sin registros</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- MODO CURSO: layout fijo con 4 secciones -->
          <template v-else>

            <!-- Fila 1: Información general | Clasificación -->
            <div class="row q-col-gutter-sm q-mb-sm items-stretch">
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="info" size="15px" class="q-mr-xs" />Información general
                  </div>
                  <div class="row section-content-centered">
                    <div v-for="item in infoGeneral" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <div class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="label" size="15px" class="q-mr-xs" />Clasificación
                  </div>
                  <div class="row section-content-centered">
                    <div v-for="item in clasificacion" :key="item.name" class="col-6 q-px-lg q-py-md">
                      <div class="data-label">{{ item.name }}</div>
                      <div class="data-value">{{ item.value || '—' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fila 2: Información adicional | Requisitos -->
            <div class="row q-col-gutter-sm items-stretch">
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="calendar_today" size="15px" class="q-mr-xs" />Información adicional
                  </div>
                  <div class="row section-content-centered">
                    <div class="col-6 q-px-lg q-py-md">
                      <div class="data-label">Fecha de registro</div>
                      <div class="data-value">{{ formatDate(course?.prfFchRegistro) }}</div>
                    </div>
                    <div class="col-6 q-px-lg q-py-md">
                      <div class="data-label">Inicio de ejecución</div>
                      <div class="data-value">{{ formatDate(course?.fechaActivoEnEjecucion) }}</div>
                    </div>
                    <div class="col-6 q-px-lg q-py-md">
                      <div class="data-label">Nivel de formación</div>
                      <div class="data-value">{{ course?.nivelFormacion || '—' }}</div>
                    </div>
                    <div class="col-6 q-px-lg q-py-md">
                      <div class="data-label">Apoyo FIC</div>
                      <q-badge
                        :color="course?.fic === 'SI' ? 'green-7' : 'grey-4'"
                        :text-color="course?.fic === 'SI' ? 'white' : 'grey-8'"
                        :label="course?.fic || 'NO'"
                        class="q-mt-xs dialog-badge dialog-badge--wide"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="section-box full-height">
                  <div class="section-box__title">
                    <q-icon name="checklist" size="15px" class="q-mr-xs" />
                    Requisitos de ingreso
                    <span class="req-count" v-if="requisitos.length">&nbsp;({{ requisitos.length }})</span>
                  </div>
                  <div class="q-px-lg q-py-md">
                    <div v-if="requisitos.length">
                      <div v-for="(req, i) in requisitos" :key="i"
                        class="row items-start no-wrap q-mb-sm">
                        <q-icon name="check_circle" color="green-6" size="15px"
                          class="q-mr-sm" style="margin-top: 3px; flex-shrink: 0" />
                        <span class="data-value">{{ req }}</span>
                      </div>
                    </div>
                    <span v-else class="data-value text-grey-5">Sin requisitos registrados</span>
                  </div>
                </div>
              </div>
            </div>

          </template>

        </div>
      </q-scroll-area>

      <!-- Footer -->
      <q-separator />
      <q-card-actions align="right" class="q-px-lg q-py-sm q-gutter-sm" style="flex-shrink: 0">
        <q-btn label="CERRAR" icon="close" color="green-9" unelevated class="btn-cancel" v-close-popup />
        <q-btn v-if="showConfirm"
          label="CONFIRMAR CURSO" icon-right="check_circle"
          color="green-9" unelevated class="btn-ok"
          @click="confirmar" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  course:       { type: Object,  default: null  },
  modelValue:   { type: Boolean, required: true },
  title:        { type: String,  default: null  },
  code:         { type: String,  default: null  },
  headerBadges: { type: Array,   default: null  },
  sections:     { type: Array,   default: null  },
  showConfirm:  { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const infoGeneral = computed(() => [
  { name: 'Código',         value: props.course?.codVer },
  { name: 'Modalidad',      value: props.course?.modalidad },
  { name: 'Duración',       value: props.course?.prfDuracionMaxima != null ? `${props.course.prfDuracionMaxima} horas` : null },
  { name: 'Tipo formación', value: props.course?.tipoFormacion },
])

const clasificacion = computed(() => [
  { name: 'Línea tecnológica',   value: props.course?.lineaTecnologica },
  { name: 'Red tecnológica',     value: props.course?.redTecnologica },
  { name: 'Red de conocimiento', value: props.course?.redConocimiento },
  { name: 'Apuesta prioritaria', value: props.course?.apuestasPrioritarias },
])

/* Convierte el texto de requisitos (separado por saltos de línea/tabs) en array */
const requisitos = computed(() => {
  const text = props.course?.prfDescripcionRequisito
  if (!text) return []
  return text.split(/[\n\t]+/).map(r => r.trim()).filter(r => r.length > 0)
})

function confirmar() {
  emit('confirm', props.course)
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
/* ── Card principal ───────────────────────────────────────────────────────── */
.dialog-card {
  width: 98vw;
  max-width: 1600px;
  height: 95vh;
  max-height: 95vh;
  min-width: 320px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.course-code { letter-spacing: 1.4px; font-size: 13px; }
.course-name { font-size: 28px; line-height: 1.3; }
.dialog-badge { font-size: 13px; padding: 4px 12px; border-radius: 20px; }
.dialog-badge--wide { padding: 4px 14px; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.btn-cancel { min-width: 120px; }
.btn-ok     { min-width: 220px; }

/* ── Scroll area ──────────────────────────────────────────────────────────── */
.dialog-scroll-area { flex: 1; min-height: 0; }

/* ── Secciones ────────────────────────────────────────────────────────────── */
.section-box {
  border: 1.5px solid #a5d6a7;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.full-height { height: 100%; }
.section-box__title {
  background-color: #e8f5e9;
  color: var(--color_button);
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  padding: 11px 16px;
  border-bottom: 3px solid #66bb6a;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.section-content-centered { flex: 1; align-content: center; row-gap: 32px; }

/* ── Data items ───────────────────────────────────────────────────────────── */
.data-label {
  font-size: 13px;
  font-weight: 700;
  color: #424242;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
  padding-left: 8px;
  border-left: 3px solid #66bb6a;
}
.data-value { font-size: 16px; color: #111111; line-height: 1.5; }
.req-count  { font-weight: 500; font-size: 14px; color: var(--color_button); text-transform: none; letter-spacing: 0; }
</style>
