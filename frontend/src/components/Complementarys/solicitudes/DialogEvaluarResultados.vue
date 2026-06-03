<template>
  <q-dialog v-model="model" persistent maximized>
    <q-card class="dialog-card">
      <q-card-section class="bg-green-9 q-px-lg q-py-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-icon name="grading" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold" style="font-size: 16px">EVALUAR RESULTADOS DE APRENDIZAJE</div>
              <div class="text-green-2" style="font-size: 12px">Marca cada resultado como evaluado para poder cerrar la ficha</div>
            </div>
          </div>
          <q-btn flat round icon="close" color="white" v-close-popup />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-auto">
            <q-badge color="green-8" class="q-pa-sm">
              <q-icon name="check_circle" class="q-mr-xs" />
              Evaluados: {{ evaluados }}
            </q-badge>
          </div>
          <div class="col-auto">
            <q-badge color="orange-8" class="q-pa-sm">
              <q-icon name="pending" class="q-mr-xs" />
              Pendientes: {{ pendientes }}
            </q-badge>
          </div>
        </div>

        <q-table
          flat bordered
          :rows="schedules"
          :columns="columnas"
          row-key="_id"
          :loading="loading"
          no-data-label="No hay resultados de aprendizaje registrados"
          rows-per-page-label="Registros por página"
          :pagination="{ rowsPerPage: 30 }"
        >
          <template v-slot:body-cell-rated="props">
            <q-td :props="props" class="text-center">
              <q-badge
                :color="props.value ? 'green-8' : 'orange-7'"
                style="padding: 4px 12px; border-radius: 20px"
              >
                {{ props.value ? 'Evaluado' : 'Pendiente' }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-accion="props">
            <q-td :props="props" class="text-center">
              <q-btn
                v-if="!props.row.rated"
                label="Marcar Evaluado"
                icon="check_circle"
                size="sm"
                color="green-8"
                unelevated
                :loading="loadingId === props.row._id"
                @click="marcarEvaluado(props.row._id)"
              />
              <q-icon v-else name="verified" color="green-8" size="24px">
                <q-tooltip>Ya evaluado</q-tooltip>
              </q-icon>
            </q-td>
          </template>
        </q-table>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="CERRAR" color="dark" v-close-popup />
        <q-btn
          label="MARCAR TODO EVALUADO"
          icon="done_all"
          color="green-9"
          unelevated
          :loading="loadingAll"
          :disable="pendientes === 0"
          @click="marcarTodo"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get, put } from '../../../services/api.js'
import { notifySuccessRequest, notifyErrorRequest } from '../../../common/notify.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  solicitudId: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue', 'guardado'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const schedules  = ref([])
const loading    = ref(false)
const loadingId  = ref(null)
const loadingAll = ref(false)

const columnas = [
  { name: 'outcome',      label: 'RESULTADO DE APRENDIZAJE', field: 'outcome',      align: 'left'   },
  { name: 'competencia',  label: 'COMPETENCIA',              field: 'competencia',  align: 'left'   },
  { name: 'rated',        label: 'ESTADO',                   field: 'rated',        align: 'center' },
  { name: 'accion',       label: 'ACCIÓN',                   field: 'accion',       align: 'center' },
]

const evaluados  = computed(() => schedules.value.filter(s => s.rated).length)
const pendientes = computed(() => schedules.value.filter(s => !s.rated).length)

async function cargar() {
  if (!props.solicitudId) return
  loading.value = true
  try {
    const res = await get(`/complementary/requests/${props.solicitudId}/schedules`)
    schedules.value = res || []
  } catch {}
  loading.value = false
}

async function marcarEvaluado(scheduleId) {
  loadingId.value = scheduleId
  try {
    const res = await put(`/complementary/requests/${props.solicitudId}/schedules/${scheduleId}/rate`)
    if (res?.msg) notifySuccessRequest(res.msg)
    await cargar()
    emit('guardado')
  } catch {}
  loadingId.value = null
}

async function marcarTodo() {
  loadingAll.value = true
  try {
    const res = await put(`/complementary/requests/${props.solicitudId}/schedules/rate-all`)
    if (res?.msg) notifySuccessRequest(res.msg)
    await cargar()
    emit('guardado')
  } catch {}
  loadingAll.value = false
}

watch(() => props.modelValue, (val) => {
  if (val) cargar()
})
</script>
