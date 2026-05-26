<template>
  <q-dialog :model-value="modelValue" persistent maximized @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="flex column" style="height: 100vh">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-md row items-center" style="flex-shrink: 0">
        <q-icon
          :name="modo === 'reprogramar' ? 'edit_calendar' : 'calendar_month'"
          color="white" size="32px" class="q-mr-md"
        />
        <div class="col">
          <div class="text-white text-weight-bold" style="font-size: 17px">
            {{ modo === 'reprogramar' ? 'RE-PROGRAMAR SESIONES' : 'PROGRAMAR SESIONES' }}
          </div>
          <div class="text-green-2" style="font-size: 12px">
            {{ modo === 'reprogramar'
              ? 'Modifica el horario de la programación existente'
              : 'Define los días y horarios del curso para generar las sesiones' }}
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <!-- Body -->
      <q-scroll-area class="col">
        <div class="q-pa-md">

          <!-- Instructor (solo programar) -->
          <div v-if="modo === 'programar'" class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.instructor"
                outlined dense color="green-9"
                label="ID del instructor"
                hint="Se usa el instructor de la solicitud"
              >
                <template v-slot:prepend><q-icon name="person" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.environment"
                outlined dense color="green-9"
                label="ID del ambiente (opcional)"
              >
                <template v-slot:prepend><q-icon name="meeting_room" /></template>
              </q-input>
            </div>
          </div>

          <!-- Rango de fechas -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.fstart"
                type="date" outlined dense color="green-9"
                label="Fecha de inicio *"
              >
                <template v-slot:prepend><q-icon name="event" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.fend"
                type="date" outlined dense color="green-9"
                label="Fecha de finalización *"
              >
                <template v-slot:prepend><q-icon name="event" /></template>
              </q-input>
            </div>
          </div>

          <!-- Rango de horas -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.tstart"
                type="time" outlined dense color="green-9"
                label="Hora de inicio *"
              >
                <template v-slot:prepend><q-icon name="schedule" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.tend"
                type="time" outlined dense color="green-9"
                label="Hora de finalización *"
              >
                <template v-slot:prepend><q-icon name="schedule" /></template>
              </q-input>
            </div>
          </div>

          <!-- Días de la semana -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-sm">Días de la semana *</div>
            <div class="row q-gutter-sm">
              <q-btn
                v-for="dia in DIAS"
                :key="dia.val"
                :label="dia.label"
                :color="form.days.includes(dia.val) ? 'green-9' : 'grey-4'"
                :text-color="form.days.includes(dia.val) ? 'white' : 'grey-8'"
                size="sm"
                unelevated
                @click="toggleDia(dia.val)"
              />
            </div>
          </div>

          <!-- Textos opcionales (solo programar) -->
          <div v-if="modo === 'programar'" class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.supporttext"
                outlined dense color="green-9"
                label="Texto de soporte"
              >
                <template v-slot:prepend><q-icon name="article" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.observation"
                outlined dense color="green-9"
                label="Observación"
              >
                <template v-slot:prepend><q-icon name="notes" /></template>
              </q-input>
            </div>
          </div>

          <!-- Botón generar -->
          <div class="q-mb-md">
            <q-btn
              label="GENERAR SESIONES"
              icon="event_repeat"
              color="green-9"
              unelevated
              :disable="!formValido"
              @click="generarSesiones"
            />
          </div>

          <!-- Preview sesiones generadas -->
          <div v-if="sesionesGeneradas.length">
            <div class="row justify-between items-center q-mb-sm">
              <div class="text-subtitle2 text-green-9">
                Sesiones generadas ({{ sesionesGeneradas.length }})
              </div>
              <div :class="totalHoras > duracionMax && duracionMax > 0 ? 'text-red-7' : 'text-green-9'" class="text-weight-bold">
                {{ totalHoras }} / {{ duracionMax || '—' }} horas
              </div>
            </div>

            <q-linear-progress
              v-if="duracionMax > 0"
              :value="Math.min(totalHoras / duracionMax, 1)"
              :color="totalHoras > duracionMax ? 'red-7' : 'green-9'"
              class="q-mb-md"
              size="8px"
              rounded
            />

            <q-list bordered separator dense class="rounded-borders">
              <q-item v-for="(s, i) in sesionesGeneradas" :key="i" dense>
                <q-item-section avatar>
                  <q-icon name="schedule" color="green-9" size="18px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ s._display }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div v-else class="text-grey-5 text-center q-pa-lg">
            <q-icon name="event_note" size="40px" />
            <div class="q-mt-sm">Completa los campos y haz clic en "Generar sesiones"</div>
          </div>

        </div>
      </q-scroll-area>

      <!-- Footer -->
      <q-card-actions align="center" class="q-pb-lg bg-white shadow-up-1" style="flex-shrink: 0">
        <q-btn label="CANCELAR" flat color="grey-7" v-close-popup />
        <q-btn
          :label="modo === 'reprogramar' ? 'RE-PROGRAMAR' : 'PROGRAMAR'"
          color="green-9"
          unelevated
          :disable="sesionesGeneradas.length === 0"
          @click="confirmar"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue:   { type: Boolean, required: true },
  modo:         { type: String,  default: 'programar' }, // 'programar' | 'reprogramar'
  solicitudId:  { type: String,  required: true },
  scheduleId:   { type: String,  default: '' },
  instructorId: { type: String,  default: '' },
  duracionMax:  { type: Number,  default: 0 },
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

const form = ref({
  instructor:   '',
  environment:  '',
  fstart:       '',
  fend:         '',
  tstart:       '',
  tend:         '',
  days:         [],
  supporttext:  'PLANEACIÓN COMPLEMENTARIA',
  observation:  'PROGRAMADO DESDE COMPLEMENTARIAS',
})

const sesionesGeneradas = ref([])

watch(() => props.modelValue, (val) => {
  if (val) {
    form.value = {
      instructor:  props.instructorId || '',
      environment: '',
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

function calcularHoras(inicio, fin) {
  if (!inicio || !fin) return 0
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
  return mins > 0 ? parseFloat((mins / 60).toFixed(2)) : 0
}

const formValido = computed(() =>
  form.value.fstart &&
  form.value.fend &&
  form.value.fend >= form.value.fstart &&
  form.value.tstart &&
  form.value.tend &&
  form.value.tend > form.value.tstart &&
  form.value.days.length > 0
)

function generarSesiones() {
  if (!formValido.value) return
  const { fstart, fend, days, tstart, tend, instructor } = form.value
  const cur = new Date(fstart + 'T00:00:00')
  const fin = new Date(fend + 'T00:00:00')
  const result = []
  while (cur <= fin) {
    if (days.includes(cur.getDay())) {
      const fecha = cur.toISOString().slice(0, 10)
      const horas = calcularHoras(tstart, tend)
      result.push({
        start: fecha,
        idInstructor: instructor,
        autogenerated: true,
        _display: `${fecha}   ${tstart} – ${tend}   (${horas} h)`,
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
  sesionesGeneradas.value = result
}

const totalHoras = computed(() => {
  if (!sesionesGeneradas.value.length || !form.value.tstart || !form.value.tend) return 0
  return parseFloat((sesionesGeneradas.value.length * calcularHoras(form.value.tstart, form.value.tend)).toFixed(2))
})

function confirmar() {
  if (!sesionesGeneradas.value.length) return
  const events = sesionesGeneradas.value.map(({ _display, ...e }) => e)
  const base = {
    days:   form.value.days,
    fstart: form.value.fstart,
    fend:   form.value.fend,
    tstart: form.value.tstart,
    tend:   form.value.tend,
    events,
  }
  if (props.modo === 'programar') {
    const data = {
      ...base,
      instructor: form.value.instructor,
    }
    if (form.value.environment) data.environment = form.value.environment
    if (form.value.supporttext) data.supporttext = form.value.supporttext
    if (form.value.observation) data.observation = form.value.observation
    emit('guardado', { modo: 'programar', solicitudId: props.solicitudId, data })
  } else {
    emit('guardado', { modo: 'reprogramar', scheduleId: props.scheduleId, data: base })
  }
  emit('update:modelValue', false)
}
</script>
