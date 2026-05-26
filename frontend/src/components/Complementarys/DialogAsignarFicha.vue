<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="width: 520px; max-width: 95vw">

      <q-card-section class="bg-green-9 q-px-lg q-py-md">
        <div class="row items-center justify-center q-gutter-sm">
          <q-icon name="folder_special" color="white" size="32px" />
          <div>
            <div class="text-white text-weight-bold text-center" style="font-size: 17px">ASIGNAR FICHA</div>
            <div class="text-green-2 text-center" style="font-size: 12px">Registra el número de ficha y las fechas del programa</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">

          <div class="col-12">
            <q-input
              v-model="ficha.fichaNumber"
              outlined dense color="green-9"
              label="Número de ficha *"
            >
              <template v-slot:prepend><q-icon name="assignment" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model="ficha.fechaInicio"
              type="date" outlined dense color="green-9"
              label="Fecha de inicio *"
            >
              <template v-slot:prepend><q-icon name="event" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model="ficha.fechaFin"
              type="date" outlined dense color="green-9"
              label="Fecha de finalización *"
            >
              <template v-slot:prepend><q-icon name="event" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-4">
            <q-input
              v-model="ficha.fechaInscripcion"
              type="date" outlined dense color="green-9"
              label="Fecha de inscripción *"
            >
              <template v-slot:prepend><q-icon name="assignment_turned_in" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-4">
            <q-input
              v-model="ficha.fechaMatriculaInicio"
              type="date" outlined dense color="green-9"
              label="Inicio de matrícula *"
            >
              <template v-slot:prepend><q-icon name="how_to_reg" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-4">
            <q-input
              v-model="ficha.fechaMatriculaFin"
              type="date" outlined dense color="green-9"
              label="Fin de matrícula *"
            >
              <template v-slot:prepend><q-icon name="how_to_reg" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model="ficha.codigoSolicitud"
              outlined dense color="green-9"
              label="Código solicitud"
            >
              <template v-slot:prepend><q-icon name="tag" /></template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-input
              v-model="ficha.fichaCaracterizacion"
              outlined dense color="green-9"
              label="Ficha de caracterización"
            >
              <template v-slot:prepend><q-icon name="description" /></template>
            </q-input>
          </div>

        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-lg">
        <q-btn label="CANCELAR" flat color="grey-7" v-close-popup />
        <q-btn
          label="CONFIRMAR"
          color="green-9"
          unelevated
          :disable="!camposValidos"
          @click="confirmar"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  solicitudId: { type: String,  required: true },
})

const emit = defineEmits(['update:modelValue', 'guardado'])

const ficha = ref({
  fichaNumber:          '',
  fechaInicio:          '',
  fechaFin:             '',
  fechaInscripcion:     '',
  fechaMatriculaInicio: '',
  fechaMatriculaFin:    '',
  codigoSolicitud:      '',
  fichaCaracterizacion: '',
})

watch(() => props.modelValue, (val) => {
  if (val) {
    ficha.value = {
      fichaNumber: '', fechaInicio: '', fechaFin: '',
      fechaInscripcion: '', fechaMatriculaInicio: '', fechaMatriculaFin: '',
      codigoSolicitud: '', fichaCaracterizacion: '',
    }
  }
})

const camposValidos = computed(() =>
  ficha.value.fichaNumber?.trim() &&
  ficha.value.fechaInicio &&
  ficha.value.fechaFin &&
  ficha.value.fechaInscripcion &&
  ficha.value.fechaMatriculaInicio &&
  ficha.value.fechaMatriculaFin
)

function confirmar() {
  if (!camposValidos.value) return
  const payload = { ...ficha.value }
  if (!payload.codigoSolicitud) delete payload.codigoSolicitud
  if (!payload.fichaCaracterizacion) delete payload.fichaCaracterizacion
  emit('guardado', { id: props.solicitudId, data: payload })
  emit('update:modelValue', false)
}
</script>
