<template>
  <q-dialog :model-value="modelValue" maximized @update:model-value="$emit('update:modelValue', $event)" @show="onShow">
    <q-card class="flex column" style="height: 100vh">

      <!-- Header -->
      <q-card-section class="bg-green-9 q-px-lg q-py-md row items-center no-wrap" style="flex-shrink: 0">
        <q-icon
          :name="modoEdicion ? 'edit_note' : 'visibility'"
          color="white" size="30px" class="q-mr-md"
        />
        <div class="col">
          <div class="text-white text-weight-bold ellipsis" style="font-size: 16px">
            {{ solicitud?._detalle?.catalogCourse?.prfDenominacion || solicitud?.nombreCurso || '—' }}
          </div>
          <div class="text-green-2" style="font-size: 12px">
            {{ modoEdicion ? 'Editar y corregir los datos de la solicitud' : 'Detalle completo de la solicitud (solo lectura)' }}
          </div>
        </div>
        <q-badge
          :color="badgeColor"
          class="q-mx-md"
          style="padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600"
        >
          {{ solicitud?.estado }}
        </q-badge>
        <q-btn flat round dense icon="close" color="white" v-close-popup />
      </q-card-section>

      <!-- Body -->
      <q-scroll-area class="col">
        <div class="q-pa-md">
          <FormRegistroSolicitud
            ref="formRef"
            v-model="formData"
            :readonly="!modoEdicion"
            :loading="loadingGuardar"
            :coordinadores="coordinadores"
            :environments="environments"
            :supervisores="supervisores"
            :campesenas="campesenas"
          />

          <!-- Historial de cambios -->
          <div v-if="historial.length" class="q-mt-lg">
            <div class="text-weight-bold text-green-9 q-mb-sm" style="font-size: 15px">
              <q-icon name="history" class="q-mr-xs" />Historial de cambios
            </div>
            <q-timeline color="green-9" layout="dense">
              <q-timeline-entry
                v-for="(h, i) in historial" :key="i"
                :title="STATE_LABEL[h.newState] || h.newState"
                :subtitle="formatFecha(h.timestamp)"
                :icon="estadoIcono(h.newState)"
                :color="estadoColorHistory(h.newState)"
              >
                <div class="text-caption text-grey-7">
                  Por: <strong>{{ h.changedBy }}</strong> ({{ h.changedByRole }})
                </div>
                <div v-if="h.observations" class="q-mt-xs text-body2 text-grey-8 bg-grey-2 q-pa-sm rounded-borders">
                  {{ h.observations }}
                </div>
              </q-timeline-entry>
            </q-timeline>
          </div>
        </div>
      </q-scroll-area>

      <!-- Footer: PDF siempre visible; botones de edición solo en modo edición -->
      <q-card-actions align="center" class="q-pb-lg bg-white shadow-up-1" style="flex-shrink: 0">
        <q-btn
          label="PREVISUALIZAR PDF"
          icon="picture_as_pdf"
          flat color="green-9"
          :loading="loadingPdf"
          @click="previsualizarPdf"
        />
        <template v-if="modoEdicion">
          <q-btn label="CANCELAR" flat color="dark" v-close-popup />
          <q-btn
            label="GUARDAR CAMBIOS"
            color="green-9" unelevated
            :loading="loadingGuardar"
            @click="guardar"
          >
            <template v-slot:loading>
              <q-spinner-oval color="white" size="1em" />
            </template>
          </q-btn>
        </template>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import FormRegistroSolicitud from './FormRegistroSolicitud.vue'
import { generateSolicitudPdf } from '../../../utils/generateSolicitudPdf.js'

const STATE_LABEL = {
  PENDIENTE:      'En proceso',
  APROBADA:       'Aprobada',
  RECHAZADA:      'Rechazada',
  FICHA_ASIGNADA: 'Ficha asignada',
  INSCRIPCION:    'Inscripción',
  PROGRAMADA:     'Programada',
  EJECUCION:      'En ejecución',
  CERRADA:        'Cerrada',
  CANCELADA:      'Cancelada',
}

const props = defineProps({
  modelValue:    { type: Boolean, required: true },
  solicitud:     { type: Object,  required: true },
  modoEdicion:   { type: Boolean, default: false },
  coordinadores: { type: Array,   default: () => [] },
  environments:  { type: Array,   default: () => [] },
  supervisores:  { type: Array,   default: () => [] },
  campesenas:    { type: Array,   default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

const loadingGuardar = ref(false)
const loadingPdf     = ref(false)
const formData       = ref({})
const formRef        = ref(null)

/* Convierte los datos de la solicitud al formato plano que espera FormRegistroSolicitud */
function mapear(d) {
  if (!d) return {}
  return {
    fechaRegistro:            d.createdAt?.slice(0, 10)  || '',
    horaRegistro:             d.createdAt?.slice(11, 16) || '',
    catalogCourse:            d.catalogCourse?._id       || d.catalogCourse || '',
    prfCodigo:                d.catalogCourse?.prfCodigo          || '',
    prfVersion:               d.catalogCourse?.prfVersion         || '',
    prfDuracionMaxima:        d.catalogCourse?.prfDuracionMaxima  || 0,
    prfDenominacion:          d.catalogCourse?.prfDenominacion    || '',
    tipoPrograma:             d.tipoPrograma      || '',
    numAprendices:            d.numAprendices     || '',
    tipoPoblacion:            d.tipoPoblacion     || '',
    coordinator:              d.coordinator?._id  || d.coordinator || '',
    nombreInstructor:         d.instructor?.name          || '',
    cedulaInstructor:         d.instructor?.numdocument   || '',
    telefonoInstructor:       d.instructor?.phone         || '',
    correoInstructor:         d.instructor?.email         || '',
    correoPersonalInstructor: d.instructor?.personalEmail || '',
    municipio:                d.municipio         || '',
    vereda:                   d.vereda            || '',
    direccion:                d.direccion         || '',
    nombreEmpresa:            d.nombreEmpresa     || '',
    nitEmpresa:               d.nitEmpresa        || '',
    contactoEmpresa:          d.contactoEmpresa   || '',
    telefonoEmpresa:          d.telefonoEmpresa   || '',
    fechaInicio:              d.fechaInicio?.slice(0, 10)          || '',
    fechaFin:                 d.fechaFin?.slice(0, 10)             || '',
    fechaInscripcion:         d.fechaInscripcion?.slice(0, 10)     || '',
    fechaMatriculaInicio:     d.fechaMatriculaInicio?.slice(0, 10) || '',
    fechaMatriculaFin:        d.fechaMatriculaFin?.slice(0, 10)    || '',
    competencies:  Array.isArray(d.competencies) ? d.competencies.join('\n') : (d.competencies || ''),
    outcomes:      Array.isArray(d.outcomes)     ? d.outcomes.join('\n')     : (d.outcomes     || ''),
    learningActivity:   d.learningActivity   || '',
    requisitosIngreso:  d.requisitosIngreso  || '',
    recursosNecesarios: d.recursosNecesarios || '',
    environment:        d.environment?._id  || d.environment || '',
    formationDocument:  d.formationDocument  || '',
    codigoSolicitud:    d.codigoSolicitud    || '',
    fichaCaracterizacion: d.fichaCaracterizacion || '',
    sesiones:           (Array.isArray(d.sesiones) && d.sesiones.length)
                          ? d.sesiones
                          : construirSesiones(d._scheduleData),
    numeroSolicitud:    d.numeroSolicitud    || '',
    supervisor:               d.supervisor?._id || d.supervisor || '',
    campesena:                d.campesena?._id  || d.campesena  || '',
    ambienteNombre:     d.ambienteNombre     || '',
    ambienteDireccion:  d.ambienteDireccion  || '',
  }
}

watch(() => props.modelValue, (val) => {
  if (val) formData.value = mapear(props.solicitud?._detalle)
}, { immediate: true })

const badgeColor = computed(() => {
  const MAP = {
    'En proceso':     'orange-8',
    'Aprobada':       'green-9',
    'Rechazada':      'red-8',
    'Ficha asignada': 'purple-8',
    'Inscripción':    'teal-8',
    'Programada':     'blue-8',
    'En ejecución':   'deep-purple-8',
    'Cerrada':        'grey-7',
    'Cancelada':      'grey-6',
  }
  return MAP[props.solicitud?.estado] || 'grey-5'
})

const historial = computed(() =>
  Array.isArray(props.solicitud?._detalle?.history)
    ? [...props.solicitud._detalle.history].reverse()
    : []
)

function calcHorasSched(tstart, tend) {
  if (!tstart || !tend) return 0
  const [h1, m1] = tstart.split(':').map(Number)
  const [h2, m2] = tend.split(':').map(Number)
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
  return mins > 0 ? parseFloat((mins / 60).toFixed(2)) : 0
}

function construirSesiones(schedule) {
  if (!schedule?.events?.length) return []
  const horas = calcHorasSched(schedule.tstart, schedule.tend)
  return schedule.events
    .map(evt => ({ fecha: (evt?.start || evt).toString().slice(0, 10) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(({ fecha }) => ({
      fecha,
      horaInicio: schedule.tstart || '',
      horaFin:    schedule.tend   || '',
      totalHoras: horas,
    }))
}

function formatFecha(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function estadoIcono(state) {
  const MAP = {
    PENDIENTE: 'schedule', APROBADA: 'check_circle', RECHAZADA: 'cancel',
    FICHA_ASIGNADA: 'fact_check', INSCRIPCION: 'how_to_reg', PROGRAMADA: 'date_range',
    EJECUCION: 'play_circle',
    CERRADA: 'lock', CANCELADA: 'block',
  }
  return MAP[state] || 'radio_button_unchecked'
}

function estadoColorHistory(state) {
  const MAP = {
    PENDIENTE: 'orange-8', APROBADA: 'green-9', RECHAZADA: 'red-8',
    FICHA_ASIGNADA: 'purple-8', INSCRIPCION: 'teal-8', PROGRAMADA: 'blue-8',
    EJECUCION: 'deep-purple-8',
    CERRADA: 'grey-7', CANCELADA: 'grey-6',
  }
  return MAP[state] || 'grey-5'
}

function onShow() {
  nextTick(() => formRef.value?.updateCalendarSize())
}

function guardar() {
  emit('guardado', { id: props.solicitud._id, data: formData.value })
}

async function previsualizarPdf() {
  loadingPdf.value = true
  try {
    await generateSolicitudPdf(formData.value)
  } finally {
    loadingPdf.value = false
  }
}
</script>
