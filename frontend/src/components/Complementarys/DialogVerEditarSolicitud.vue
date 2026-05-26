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
          />
        </div>
      </q-scroll-area>

      <!-- Footer solo en modo edición -->
      <q-card-actions v-if="modoEdicion" align="center" class="q-pb-lg bg-white shadow-up-1" style="flex-shrink: 0">
        <q-btn label="CANCELAR" flat color="grey-7" v-close-popup />
        <q-btn
          label="GUARDAR CAMBIOS"
          color="green-9"
          unelevated
          :loading="loadingGuardar"
          @click="guardar"
        >
          <template v-slot:loading>
            <q-spinner-oval color="white" size="1em" />
          </template>
        </q-btn>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import FormRegistroSolicitud from './FormRegistroSolicitud.vue'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  solicitud:   { type: Object,  required: true },
  modoEdicion: { type: Boolean, default: false },
  coordinadores: { type: Array, default: () => [] },
  environments:  { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

const loadingGuardar = ref(false)
const formData = ref({})
const formRef  = ref(null)

function mapear(d) {
  if (!d) return {}
  return {
    fechaRegistro:          d.createdAt?.slice(0, 10) || '',
    horaRegistro:           d.createdAt?.slice(11, 16) || '',
    catalogCourse:          d.catalogCourse?._id || d.catalogCourse || '',
    prfCodigo:              d.catalogCourse?.prfCodigo || '',
    prfVersion:             d.catalogCourse?.prfVersion || '',
    prfDuracionMaxima:      d.catalogCourse?.prfDuracionMaxima || 0,
    prfDenominacion:        d.catalogCourse?.prfDenominacion || '',
    tipoPrograma:           d.tipoPrograma || '',
    numAprendices:          d.numAprendices || '',
    tipoPoblacion:          d.tipoPoblacion || '',
    proyectoAsociado:       d.proyectoAsociado || '',
    coordinator:            d.coordinator?._id || d.coordinator || '',
    nombreInstructor:       d.instructor?.name || '',
    cedulaInstructor:       d.instructor?.numdocument || '',
    telefonoInstructor:     d.instructor?.phone || '',
    correoInstructor:       d.instructor?.email || '',
    correoPersonalInstructor: d.instructor?.personalEmail || '',
    municipio:              d.municipio || '',
    vereda:                 d.vereda || '',
    direccion:              d.direccion || '',
    nombreEmpresa:          d.nombreEmpresa || '',
    nitEmpresa:             d.nitEmpresa || '',
    contactoEmpresa:        d.contactoEmpresa || '',
    telefonoEmpresa:        d.telefonoEmpresa || '',
    fechaInicio:            d.fechaInicio?.slice(0, 10) || '',
    fechaFin:               d.fechaFin?.slice(0, 10) || '',
    fechaInscripcion:       d.fechaInscripcion?.slice(0, 10) || '',
    fechaMatriculaInicio:   d.fechaMatriculaInicio?.slice(0, 10) || '',
    fechaMatriculaFin:      d.fechaMatriculaFin?.slice(0, 10) || '',
    competencies: Array.isArray(d.competencies)
      ? d.competencies.join('\n') : (d.competencies || ''),
    outcomes: Array.isArray(d.outcomes)
      ? d.outcomes.join('\n') : (d.outcomes || ''),
    learningActivity:   d.learningActivity || '',
    requisitosIngreso:  d.requisitosIngreso || '',
    recursosNecesarios: d.recursosNecesarios || '',
    environment:        d.environment?._id || d.environment || '',
    formationDocument:  d.formationDocument || '',
    codigoSolicitud:    d.codigoSolicitud || '',
    fichaCaracterizacion: d.fichaCaracterizacion || '',
    sesiones:           d.sesiones || [],
  }
}

watch(() => props.modelValue, (val) => {
  if (val) formData.value = mapear(props.solicitud?._detalle)
}, { immediate: true })

const badgeColor = computed(() => {
  const e = props.solicitud?.estado || ''
  if (e.includes('Aprobad')) return 'green-3'
  if (e.includes('Rechazad')) return 'red-3'
  if (e.includes('Cancelad')) return 'grey-5'
  return 'orange-3'
})

function onShow() {
  nextTick(() => formRef.value?.updateCalendarSize())
}

function guardar() {
  emit('guardado', { id: props.solicitud._id, data: formData.value })
}
</script>
