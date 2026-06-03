<template>
  <q-dialog v-model="model" persistent>
    <q-card class="dialog-card" style="width: 600px; max-width: 95vw; max-height: 90vh">
      <q-card-section class="bg-green-9 q-px-lg q-py-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-icon name="event_note" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold" style="font-size: 16px">AGREGAR EVENTOS MENSUALES</div>
              <div class="text-green-2" style="font-size: 12px">Registra los días en que se dictó clase</div>
            </div>
          </div>
          <q-btn flat round icon="close" color="white" v-close-popup />
        </div>
      </q-card-section>

      <div class="dialog-scroll-area q-pa-md" style="overflow-y: auto; max-height: 70vh">
        <!-- Resumen de eventos existentes -->
        <div class="q-mb-lg">
          <div class="text-weight-bold text-green-9 q-mb-sm">
            <q-icon name="bar_chart" class="q-mr-xs" />Resumen de eventos registrados
          </div>
          <div v-if="loadingResumen" class="text-center q-pa-md">
            <q-spinner-dots color="green-9" size="32px" />
          </div>
          <div v-else-if="resumen.length === 0" class="text-grey-5 text-center q-pa-md">
            No hay eventos registrados aún
          </div>
          <div v-else class="row q-col-gutter-sm">
            <div v-for="item in resumen" :key="item.mes" class="col-12 col-sm-6">
              <q-card flat bordered>
                <q-card-section class="q-pa-sm">
                  <div class="text-weight-medium text-green-9">{{ item.mes }}</div>
                  <div class="text-caption text-grey-6">{{ item.total }} evento(s)</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- Formulario agregar eventos -->
        <div class="text-weight-bold text-green-9 q-mb-sm">
          <q-icon name="add_circle" class="q-mr-xs" />Agregar nuevos eventos
        </div>

        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="mesSeleccionado"
              :options="opcionesMes"
              emit-value map-options
              outlined dense color="green-9"
              label="Mes *"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="anioSeleccionado"
              :options="opcionesAnio"
              outlined dense color="green-9"
              label="Año *"
            />
          </div>
        </div>

        <div class="q-mb-sm text-caption text-grey-7">Selecciona los días en que se dictó clase:</div>
        <div class="row q-col-gutter-xs q-mb-md">
          <div v-for="dia in diasDelMes" :key="dia" class="col-auto">
            <q-btn
              :label="String(dia)"
              :color="diasSeleccionados.includes(dia) ? 'green-9' : 'grey-3'"
              :text-color="diasSeleccionados.includes(dia) ? 'white' : 'grey-8'"
              size="sm"
              unelevated
              style="min-width: 36px"
              @click="toggleDia(dia)"
            />
          </div>
        </div>

        <div class="text-caption text-grey-6">
          {{ diasSeleccionados.length }} día(s) seleccionado(s)
        </div>
      </div>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="CANCELAR" color="dark" v-close-popup />
        <q-btn
          label="REGISTRAR EVENTOS"
          icon="save"
          color="green-9"
          unelevated
          :loading="loadingGuardar"
          :disable="diasSeleccionados.length === 0 || !mesSeleccionado || !anioSeleccionado"
          @click="guardar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get, put } from '../../../services/api.js'
import { notifySuccessRequest } from '../../../common/notify.js'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  solicitudId: { type: String,  required: true },
})
const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const resumen          = ref([])
const loadingResumen   = ref(false)
const loadingGuardar   = ref(false)
const mesSeleccionado  = ref(null)
const anioSeleccionado = ref(new Date().getFullYear())
const diasSeleccionados = ref([])

const opcionesMes = [
  { label: 'Enero',      value: 1  },
  { label: 'Febrero',    value: 2  },
  { label: 'Marzo',      value: 3  },
  { label: 'Abril',      value: 4  },
  { label: 'Mayo',       value: 5  },
  { label: 'Junio',      value: 6  },
  { label: 'Julio',      value: 7  },
  { label: 'Agosto',     value: 8  },
  { label: 'Septiembre', value: 9  },
  { label: 'Octubre',    value: 10 },
  { label: 'Noviembre',  value: 11 },
  { label: 'Diciembre',  value: 12 },
]

const opcionesAnio = computed(() => {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1]
})

const diasDelMes = computed(() => {
  if (!mesSeleccionado.value || !anioSeleccionado.value) return []
  const total = new Date(anioSeleccionado.value, mesSeleccionado.value, 0).getDate()
  return Array.from({ length: total }, (_, i) => i + 1)
})

function toggleDia(dia) {
  const idx = diasSeleccionados.value.indexOf(dia)
  if (idx === -1) diasSeleccionados.value.push(dia)
  else diasSeleccionados.value.splice(idx, 1)
}

async function cargarResumen() {
  if (!props.solicitudId) return
  loadingResumen.value = true
  try {
    const res = await get(`/complementary/requests/${props.solicitudId}/events-summary`)
    resumen.value = res || []
  } catch {}
  loadingResumen.value = false
}

async function guardar() {
  if (!mesSeleccionado.value || !anioSeleccionado.value || diasSeleccionados.value.length === 0) return
  loadingGuardar.value = true
  try {
    const events = diasSeleccionados.value.map(dia => {
      const d = new Date(Date.UTC(anioSeleccionado.value, mesSeleccionado.value - 1, dia))
      return d.toISOString()
    })
    const res = await put(`/complementary/requests/${props.solicitudId}/add-events`, { events })
    if (res?.msg) notifySuccessRequest(res.msg)
    diasSeleccionados.value = []
    await cargarResumen()
  } catch {}
  loadingGuardar.value = false
}

watch(() => props.modelValue, (val) => {
  if (val) {
    diasSeleccionados.value = []
    mesSeleccionado.value   = new Date().getMonth() + 1
    anioSeleccionado.value  = new Date().getFullYear()
    cargarResumen()
  }
})
</script>
