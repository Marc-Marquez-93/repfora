<template>
  <q-dialog :model-value="modelValue" persistent maximized @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="flex column" style="height: 100vh">

      <!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
      <q-card-section class="bg-green-9 q-px-lg q-py-sm row items-center" style="flex-shrink:0">
        <q-icon :name="modo === 'reprogramar' ? 'update' : 'date_range'" color="white" size="22px" class="q-mr-sm" />
        <div class="col">
          <div class="text-white text-weight-bold" style="font-size:16px">
            {{ modo === 'reprogramar' ? 'RE-PROGRAMAR SESIONES' : 'PROGRAMAR SESIONES' }}
          </div>
          <div class="text-green-2" style="font-size:11px">
            {{ instructorNombre }} · {{ duracionMax || '—' }} h totales
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <!-- ══ BODY: dos columnas ════════════════════════════════════════════ -->
      <div class="col row no-wrap" style="overflow:hidden; min-height:0">

        <!-- ─ IZQUIERDA: configuración ─────────────────────────────────── -->
        <div class="col-12 col-md-4 q-pa-md panel-left" style="overflow-y:auto; border-right:1px solid #c8e6c9; min-width:280px; max-width:380px">

          <!-- Progreso -->
          <div v-if="duracionMax > 0 && sesionesGeneradas.length" class="q-mb-md">
            <div class="row justify-between text-caption q-mb-xs">
              <span class="text-grey-7">Horas programadas</span>
              <span :class="totalHoras > duracionMax ? 'text-red-7' : totalHoras === duracionMax ? 'text-green-9' : 'text-orange-8'" class="text-weight-bold">
                {{ totalHoras }} / {{ duracionMax }} h
              </span>
            </div>
            <q-linear-progress
              :value="Math.min(totalHoras / duracionMax, 1)"
              :color="totalHoras > duracionMax ? 'red-7' : totalHoras === duracionMax ? 'green-9' : 'orange-7'"
              size="8px" rounded
            />
            <div class="text-caption q-mt-xs" :class="faltanHoras > 0 ? 'text-orange-8' : faltanHoras < 0 ? 'text-red-7' : 'text-green-9'">
              {{ faltanHoras > 0 ? `Faltan ${faltanHoras} h` : faltanHoras < 0 ? `Excede ${Math.abs(faltanHoras)} h` : '✓ Horas completas' }}
            </div>
          </div>

          <!-- Rango de fechas -->
          <div class="field-label">Rango de fechas</div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
              <q-input v-model="form.fstart" type="date" outlined dense color="green-9" label="Inicio *">
                <template v-slot:prepend><q-icon name="event" size="16px" /></template>
              </q-input>
            </div>
            <div class="col-6">
              <q-input v-model="form.fend" type="date" outlined dense color="green-9" label="Fin *">
                <template v-slot:prepend><q-icon name="event" size="16px" /></template>
              </q-input>
            </div>
          </div>

          <!-- Horario -->
          <div class="field-label">Horario de la sesión</div>
          <div class="row q-col-gutter-sm q-mb-xs">
            <div class="col-6">
              <q-select
                v-model="form.tstart"
                :options="HORAS"
                outlined dense color="green-9" label="Hora inicio *"
                emit-value map-options>
                <template v-slot:prepend><q-icon name="schedule" size="16px" /></template>
              </q-select>
            </div>
            <div class="col-6">
              <q-select
                v-model="form.tend"
                :options="HORAS"
                outlined dense color="green-9" label="Hora fin *"
                emit-value map-options>
                <template v-slot:prepend><q-icon name="schedule" size="16px" /></template>
              </q-select>
            </div>
          </div>
          <div v-if="form.tstart && form.tend && calcularHoras(form.tstart, form.tend) > 0"
            class="text-caption text-green-9 text-weight-bold q-mb-md q-pl-xs">
            {{ calcularHoras(form.tstart, form.tend) }} h por sesión
          </div>
          <div v-else class="q-mb-md" />

          <!-- Días de la semana -->
          <div class="field-label">Días de la semana *</div>
          <div class="row q-gutter-xs q-mb-md">
            <q-btn v-for="dia in DIAS" :key="dia.val"
              :label="dia.label"
              :color="form.days.includes(dia.val) ? 'green-9' : 'grey-3'"
              :text-color="form.days.includes(dia.val) ? 'white' : 'grey-7'"
              size="sm" unelevated padding="4px 10px"
              @click="toggleDia(dia.val)"
            />
          </div>

          <!-- Ambiente (solo programar) -->
          <template v-if="modo === 'programar'">
            <div class="field-label">Ambiente</div>
            <q-select
              v-model="form.environment"
              :options="ambientesConOtro"
              option-value="value" option-label="label"
              emit-value map-options
              outlined dense color="green-9" label="Ambiente (opcional)"
              clearable :loading="cargandoListas"
              class="q-mb-sm">
              <template v-slot:prepend><q-icon name="meeting_room" size="16px" /></template>
            </q-select>
            <q-input v-if="form.environment === '__otro__'"
              v-model="form.otroAmbiente"
              outlined dense color="green-9" label="Nombre del ambiente"
              class="q-mb-md">
              <template v-slot:prepend><q-icon name="door_front" size="16px" /></template>
            </q-input>
          </template>

          <!-- Botones -->
          <div class="column q-gutter-sm q-mt-sm">
            <q-btn
              label="GENERAR SESIONES" icon="event_repeat"
              color="green-9" unelevated
              :disable="!formValido"
              @click="generarSesiones"
            />
            <q-btn
              label="AGREGAR SESIÓN" icon="add"
              outline color="green-9"
              @click="agregarSesionManual"
            />
          </div>

        </div>

        <!-- ─ DERECHA: tabla de sesiones ───────────────────────────────── -->
        <div class="col flex column" style="overflow:hidden; min-height:0">

          <!-- Cabecera de la tabla -->
          <div class="row items-center q-px-md q-py-sm bg-green-1" style="flex-shrink:0; border-bottom:1px solid #c8e6c9">
            <q-icon name="event_note" color="green-9" size="18px" class="q-mr-sm" />
            <span class="text-green-9 text-weight-bold">Sesiones programadas</span>
            <q-badge v-if="sesionesGeneradas.length" color="green-9" class="q-ml-sm">
              {{ sesionesGeneradas.length }}
            </q-badge>
            <q-space />
            <span v-if="sesionesGeneradas.length" class="text-caption text-grey-7">
              Haz clic en cualquier celda para editarla
            </span>
          </div>

          <!-- Tabla -->
          <div class="col" style="overflow-y:auto">
            <q-table
              v-if="sesionesGeneradas.length"
              :rows="sesionesGeneradas"
              :columns="COLUMNAS"
              row-key="start"
              flat bordered
              hide-bottom
              :rows-per-page-options="[0]"
              class="sess-table full-width"
            >
              <template v-slot:header="hp">
                <q-tr :props="hp" class="bg-green-9">
                  <q-th v-for="col in hp.cols" :key="col.name" :props="hp"
                    class="text-white text-weight-bold" style="font-size:13px">
                    {{ col.label }}
                  </q-th>
                </q-tr>
              </template>

              <template v-slot:body="bp">
                <q-tr :props="bp" :class="bp.rowIndex % 2 === 0 ? 'row-par' : 'row-impar'">

                  <!-- N° -->
                  <q-td key="n" class="text-center text-grey-6" style="width:48px; font-size:13px">
                    {{ bp.rowIndex + 1 }}
                  </q-td>

                  <!-- Fecha -->
                  <q-td key="fecha" style="font-size:14px; cursor:pointer">
                    {{ bp.row.start || '—' }}
                    <q-popup-edit v-model="bp.row.start" auto-save>
                      <template v-slot="scope">
                        <q-input v-model="scope.value" type="date" dense autofocus outlined color="green-9" label="Fecha">
                          <template v-slot:after>
                            <q-btn flat dense icon="check" color="green-9" @click="scope.set" />
                          </template>
                        </q-input>
                      </template>
                    </q-popup-edit>
                  </q-td>

                  <!-- H. Inicio -->
                  <q-td key="hinicio" class="text-center" style="width:110px; font-size:14px; cursor:pointer">
                    {{ bp.row.tstart || '—' }}
                    <q-popup-edit v-model="bp.row.tstart" auto-save @save="recalcSesion(bp.rowIndex)">
                      <template v-slot="scope">
                        <q-select v-model="scope.value" :options="HORAS" emit-value map-options
                          dense outlined color="green-9" label="H. inicio" style="min-width:140px">
                          <template v-slot:after>
                            <q-btn flat dense icon="check" color="green-9" @click="scope.set" />
                          </template>
                        </q-select>
                      </template>
                    </q-popup-edit>
                  </q-td>

                  <!-- H. Fin -->
                  <q-td key="hfin" class="text-center" style="width:110px; font-size:14px; cursor:pointer">
                    {{ bp.row.tend || '—' }}
                    <q-popup-edit v-model="bp.row.tend" auto-save @save="recalcSesion(bp.rowIndex)">
                      <template v-slot="scope">
                        <q-select v-model="scope.value" :options="HORAS" emit-value map-options
                          dense outlined color="green-9" label="H. fin" style="min-width:140px">
                          <template v-slot:after>
                            <q-btn flat dense icon="check" color="green-9" @click="scope.set" />
                          </template>
                        </q-select>
                      </template>
                    </q-popup-edit>
                  </q-td>

                  <!-- Horas -->
                  <q-td key="horas" class="text-center" style="width:80px">
                    <q-chip dense :color="bp.row.totalHoras > 0 ? 'green-1' : 'grey-3'"
                      text-color="green-9" size="sm" style="font-size:13px; font-weight:600">
                      {{ bp.row.totalHoras || 0 }} h
                    </q-chip>
                  </q-td>

                  <!-- Eliminar -->
                  <q-td key="del" class="text-center" style="width:48px">
                    <q-btn flat round dense icon="delete_outline" color="red-4" size="sm"
                      @click="eliminarSesion(bp.rowIndex)">
                      <q-tooltip>Eliminar sesión</q-tooltip>
                    </q-btn>
                  </q-td>

                </q-tr>
              </template>
            </q-table>

            <div v-else class="flex flex-center column full-height text-grey-4 q-pa-xl">
              <q-icon name="event_note" size="64px" />
              <div class="q-mt-md text-h6 text-grey-5">Sin sesiones</div>
              <div class="text-body2 text-grey-4 text-center q-mt-sm">
                Configura las fechas, horario y días,<br>luego haz clic en <strong>Generar sesiones</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ FOOTER ═══════════════════════════════════════════════════════════ -->
      <q-card-actions align="center" class="q-py-md bg-white shadow-up-1" style="flex-shrink:0">
        <q-btn label="CANCELAR" flat color="dark" v-close-popup />
        <q-btn
          :label="modo === 'reprogramar' ? 'RE-PROGRAMAR' : 'PROGRAMAR'"
          :icon="modo === 'reprogramar' ? 'update' : 'date_range'"
          color="green-9" unelevated size="md"
          :disable="sesionesGeneradas.length === 0"
          @click="confirmar"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get } from '../../../services/api.js'

const props = defineProps({
  modelValue:    { type: Boolean, required: true },
  modo:          { type: String,  default: 'programar' },
  solicitudId:   { type: String,  required: true },
  scheduleId:    { type: String,  default: '' },
  instructorId:  { type: String,  default: '' },
  duracionMax:   { type: Number,  default: 0 },
  scheduleData:  { type: Object,  default: () => ({}) },
  solicitudData: { type: Object,  default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

const DIAS = [
  { val: 1, label: 'Lun' },
  { val: 2, label: 'Mar' },
  { val: 3, label: 'Mié' },
  { val: 4, label: 'Jue' },
  { val: 5, label: 'Vie' },
  { val: 6, label: 'Sáb' },
  { val: 0, label: 'Dom' },
]

const HORAS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0') + ':00'
  return { label: h, value: h }
})

const COLUMNAS = [
  { name: 'n',       label: 'N°',        field: 'n',          align: 'center' },
  { name: 'fecha',   label: 'Fecha',     field: 'start',      align: 'left'   },
  { name: 'hinicio', label: 'H. Inicio', field: 'tstart',     align: 'center' },
  { name: 'hfin',    label: 'H. Fin',    field: 'tend',       align: 'center' },
  { name: 'horas',   label: 'Horas',     field: 'totalHoras', align: 'center' },
  { name: 'del',     label: '',          field: 'del',        align: 'center' },
]

const form = ref({
  instructor: '', environment: '', otroAmbiente: '',
  fstart: '', fend: '', tstart: '', tend: '',
  days: [],
  supporttext: 'PLANEACIÓN COMPLEMENTARIA',
  observation: 'PROGRAMADO DESDE COMPLEMENTARIAS',
})

const sesionesGeneradas = ref([])
const ambientesList     = ref([])
const cargandoListas    = ref(false)

const instructorNombre = computed(() =>
  props.solicitudData?.instructor?.name || props.instructorId || '—'
)

const ambientesConOtro = computed(() => [
  ...ambientesList.value,
  { label: 'Otro', value: '__otro__' },
])

const totalHoras = computed(() =>
  parseFloat(sesionesGeneradas.value.reduce((s, e) => s + (e.totalHoras || 0), 0).toFixed(2))
)

const faltanHoras = computed(() =>
  parseFloat(((props.duracionMax || 0) - totalHoras.value).toFixed(2))
)

function toDate(v) { return v ? String(v).slice(0, 10) : '' }
function toTime(v) { return v ? String(v).slice(0, 5)  : '' }

function calcularHoras(inicio, fin) {
  if (!inicio || !fin) return 0
  const [h1] = inicio.split(':').map(Number)
  const [h2] = fin.split(':').map(Number)
  const mins = (h2 - h1) * 60
  return mins > 0 ? mins / 60 : 0
}

async function cargarListas() {
  cargandoListas.value = true
  try {
    const amb = await get('/environments?status=0')
    ambientesList.value = (amb || []).map(a => ({ label: a.name, value: a._id }))
  } catch {}
  cargandoListas.value = false
}

watch(() => props.modelValue, (val) => {
  if (!val) return
  cargarListas()

  if (props.modo === 'reprogramar') {
    const s      = props.scheduleData || {}
    const tstart = toTime(s.tstart)
    const tend   = toTime(s.tend)
    form.value = {
      instructor:   props.instructorId || '',
      environment:  s.environment?._id || s.environment || '',
      otroAmbiente: '',
      fstart: toDate(s.fstart),
      fend:   toDate(s.fend),
      tstart, tend,
      days:        s.days ? [...s.days] : [],
      supporttext: s.supporttext || 'PLANEACIÓN COMPLEMENTARIA',
      observation: s.observation || 'PROGRAMADO DESDE COMPLEMENTARIAS',
    }
    const horas = calcularHoras(tstart, tend)
    sesionesGeneradas.value = Array.isArray(s.events)
      ? s.events
          .map(e => ({
            start:         (typeof e === 'string' ? e : e.start || '').slice(0, 10),
            tstart, tend,
            totalHoras:    horas,
            idInstructor:  props.instructorId,
            autogenerated: true,
          }))
          .sort((a, b) => a.start.localeCompare(b.start))
      : []
    return
  }

  // modo programar
  const sesiones = Array.isArray(props.solicitudData?.sesiones) && props.solicitudData.sesiones.length
    ? props.solicitudData.sesiones
    : []

  if (sesiones.length) {
    const fechas = sesiones.map(s => s.fecha).sort()
    const tstart = sesiones[0].horaInicio || ''
    const tend   = sesiones[0].horaFin    || ''
    const daySet = new Set(sesiones.map(s => new Date(s.fecha + 'T00:00:00').getDay()))
    form.value = {
      instructor:   props.instructorId || '',
      environment:  props.solicitudData?.environment?._id || props.solicitudData?.environment || '',
      otroAmbiente: '',
      fstart: fechas[0],
      fend:   fechas[fechas.length - 1],
      tstart, tend,
      days:        [...daySet].sort((a, b) => a - b),
      supporttext: 'PLANEACIÓN COMPLEMENTARIA',
      observation: 'PROGRAMADO DESDE COMPLEMENTARIAS',
    }
    sesionesGeneradas.value = sesiones.map(s => ({
      start:         s.fecha,
      tstart:        s.horaInicio || tstart,
      tend:          s.horaFin    || tend,
      totalHoras:    s.totalHoras || calcularHoras(s.horaInicio || tstart, s.horaFin || tend),
      idInstructor:  props.instructorId,
      autogenerated: true,
    }))
  } else {
    form.value = {
      instructor: '', environment: '', otroAmbiente: '',
      fstart: '', fend: '', tstart: '', tend: '',
      days: [],
      supporttext: 'PLANEACIÓN COMPLEMENTARIA',
      observation: 'PROGRAMADO DESDE COMPLEMENTARIAS',
    }
    sesionesGeneradas.value = []
  }
})

function toggleDia(val) {
  const idx = form.value.days.indexOf(val)
  if (idx === -1) form.value.days.push(val)
  else form.value.days.splice(idx, 1)
}

const formValido = computed(() =>
  form.value.fstart &&
  form.value.fend   && form.value.fend >= form.value.fstart &&
  form.value.tstart &&
  form.value.tend   && form.value.tend > form.value.tstart &&
  form.value.days.length > 0
)

function generarSesiones() {
  if (!formValido.value) return
  const { fstart, fend, days, tstart, tend, instructor } = form.value
  const horas = calcularHoras(tstart, tend)
  const cur   = new Date(fstart + 'T00:00:00')
  const fin   = new Date(fend   + 'T00:00:00')
  const result = []
  while (cur <= fin) {
    if (days.includes(cur.getDay())) {
      result.push({
        start:         cur.toISOString().slice(0, 10),
        tstart, tend,
        totalHoras:    horas,
        idInstructor:  instructor,
        autogenerated: true,
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
  sesionesGeneradas.value = result
}

function recalcSesion(idx) {
  const s = sesionesGeneradas.value[idx]
  if (s) s.totalHoras = calcularHoras(s.tstart, s.tend)
}

function eliminarSesion(idx) {
  sesionesGeneradas.value.splice(idx, 1)
}

function agregarSesionManual() {
  sesionesGeneradas.value.push({
    start:         '',
    tstart:        form.value.tstart || '08:00',
    tend:          form.value.tend   || '16:00',
    totalHoras:    calcularHoras(form.value.tstart || '08:00', form.value.tend || '16:00'),
    idInstructor:  props.instructorId,
    autogenerated: true,
  })
}

function confirmar() {
  if (!sesionesGeneradas.value.length) return
  const base = {
    days:   form.value.days,
    fstart: form.value.fstart,
    fend:   form.value.fend,
    tstart: form.value.tstart,
    tend:   form.value.tend,
  }
  if (props.modo === 'programar') {
    const events = sesionesGeneradas.value.map(({ tstart, tend, totalHoras, ...e }) => e)
    const data   = { ...base, instructor: props.instructorId, events }
    if (form.value.environment && form.value.environment !== '__otro__') {
      data.environment = form.value.environment
    }
    const st = form.value.environment === '__otro__' && form.value.otroAmbiente
      ? `${form.value.supporttext || 'PLANEACIÓN COMPLEMENTARIA'} — Ambiente: ${form.value.otroAmbiente}`
      : form.value.supporttext
    if (st)                     data.supporttext = st
    if (form.value.observation) data.observation = form.value.observation
    emit('guardado', { modo: 'programar', solicitudId: props.solicitudId, data })
  } else {
    const events = sesionesGeneradas.value.map(s => s.start)
    emit('guardado', { modo: 'reprogramar', scheduleId: props.scheduleId, data: { ...base, events } })
  }
  emit('update:modelValue', false)
}
</script>

<style scoped>
.panel-left { background-color: #fafafa; }

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: #558b2f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

/* Tabla */
.sess-table :deep(.q-table__top),
.sess-table :deep(.q-table__bottom) { display: none; }
.sess-table :deep(th) { padding: 8px 12px; }
.sess-table :deep(td) { padding: 6px 12px; }

.row-par  :deep(td) { background-color: #f9fbe7; }
.row-impar :deep(td) { background-color: #fff; }

/* Cursor pointer en celdas editables */
.sess-table :deep(td) { cursor: default; }
</style>
