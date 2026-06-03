<template>
  <q-dialog v-model="model" persistent>
    <q-card class="dialog-card" style="width: 600px; max-width: 95vw; max-height: 90vh">
      <q-card-section class="bg-green-9 q-px-lg q-py-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-sm">
            <q-icon name="more_time" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold" style="font-size: 16px">
                {{ modo === 'instructor' ? 'SOLICITAR AMPLIACIÓN DE TIEMPO' : 'SOLICITUDES DE AMPLIACIÓN' }}
              </div>
              <div class="text-green-2" style="font-size: 12px">
                {{ modo === 'instructor' ? 'Solicita más tiempo al coordinador' : 'Revisa y resuelve las solicitudes pendientes' }}
              </div>
            </div>
          </div>
          <q-btn flat round icon="close" color="white" v-close-popup />
        </div>
      </q-card-section>

      <div class="q-pa-md" style="overflow-y: auto; max-height: 70vh">

        <!-- Lista de solicitudes previas -->
        <div class="q-mb-lg">
          <div class="text-weight-bold text-green-9 q-mb-sm">
            <q-icon name="history" class="q-mr-xs" />Solicitudes registradas
          </div>
          <div v-if="loadingLista" class="text-center q-pa-md">
            <q-spinner-dots color="green-9" size="32px" />
          </div>
          <div v-else-if="solicitudes.length === 0" class="text-grey-5 text-center q-pa-sm">
            No hay solicitudes de ampliación aún
          </div>
          <q-list v-else bordered separator>
            <q-item v-for="s in solicitudes" :key="s._id" class="q-py-sm">
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Nueva fecha fin: {{ s.newFechaFin?.slice(0, 10) || '—' }}
                </q-item-label>
                <q-item-label caption>{{ s.reason }}</q-item-label>
                <q-item-label caption v-if="s.comments" class="text-blue-grey-7">
                  Comentario: {{ s.comments }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="column items-end q-gutter-xs">
                  <q-badge
                    :color="estadoBadge(s.status)"
                    style="padding: 4px 10px; border-radius: 20px"
                  >
                    {{ s.status }}
                  </q-badge>
                  <!-- Botones para coordinador en solicitudes PENDIENTES -->
                  <div v-if="modo === 'coordinador' && s.status === 'PENDIENTE'" class="row q-gutter-xs">
                    <q-btn
                      label="Aprobar"
                      icon="check_circle"
                      size="xs"
                      color="green-8"
                      unelevated
                      :loading="loadingAccion === s._id + '_APROBADA'"
                      @click="abrirResolver(s, 'APROBADA')"
                    />
                    <q-btn
                      label="Rechazar"
                      icon="cancel"
                      size="xs"
                      color="red-8"
                      unelevated
                      :loading="loadingAccion === s._id + '_RECHAZADA'"
                      @click="abrirResolver(s, 'RECHAZADA')"
                    />
                  </div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Formulario nueva solicitud (solo instructor) -->
        <template v-if="modo === 'instructor'">
          <q-separator class="q-mb-md" />
          <div class="text-weight-bold text-green-9 q-mb-sm">
            <q-icon name="add_circle" class="q-mr-xs" />Nueva solicitud
          </div>
          <q-form ref="formRef" @submit.prevent="enviarSolicitud" novalidate>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.newFechaFin"
                  type="date"
                  label="Nueva fecha de finalización *"
                  outlined dense color="green-9"
                  :rules="[v => !!v || 'Campo requerido']"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.reason"
                  type="textarea"
                  label="Motivo de la solicitud *"
                  outlined dense autogrow color="green-9"
                  :rules="[v => !!v?.trim() || 'Campo requerido']"
                  placeholder="Explica por qué necesitas más tiempo..."
                />
              </div>
            </div>
            <div class="row justify-end q-mt-sm">
              <q-btn
                type="submit"
                label="ENVIAR SOLICITUD"
                icon="send"
                color="green-9"
                unelevated
                :loading="loadingEnviar"
              />
            </div>
          </q-form>
        </template>
      </div>

      <!-- Dialog inline para resolver (comentario del coordinador) -->
      <q-dialog v-model="dialogResolver" persistent>
        <q-card style="width: 400px; max-width: 90vw">
          <q-card-section :class="resolverStatus === 'APROBADA' ? 'bg-green-8' : 'bg-red-8'" class="q-px-lg q-py-sm">
            <div class="row items-center q-gutter-sm">
              <q-icon :name="resolverStatus === 'APROBADA' ? 'check_circle' : 'cancel'" color="white" size="24px" />
              <div class="text-white text-weight-bold">
                {{ resolverStatus === 'APROBADA' ? 'APROBAR AMPLIACIÓN' : 'RECHAZAR AMPLIACIÓN' }}
              </div>
            </div>
          </q-card-section>
          <q-card-section class="q-pa-md">
            <q-input
              v-model="resolverComentario"
              type="textarea"
              label="Comentario (opcional)"
              outlined autogrow dense color="green-9"
              placeholder="Agrega un comentario para el instructor..."
            />
          </q-card-section>
          <q-card-actions align="center" class="q-pb-lg">
            <q-btn label="CANCELAR" flat color="dark" v-close-popup />
            <q-btn
              :label="resolverStatus === 'APROBADA' ? 'APROBAR' : 'RECHAZAR'"
              :color="resolverStatus === 'APROBADA' ? 'green-8' : 'red-8'"
              unelevated
              :loading="!!loadingAccion"
              @click="confirmarResolver"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="CERRAR" color="dark" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get, post, put } from '../../../services/api.js'
import { notifySuccessRequest } from '../../../common/notify.js'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  solicitudId: { type: String,  required: true },
  modo:        { type: String,  default: 'instructor' }, // 'instructor' | 'coordinador'
})
const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const solicitudes    = ref([])
const loadingLista   = ref(false)
const loadingEnviar  = ref(false)
const loadingAccion  = ref(null)
const formRef        = ref(null)

const form = ref({ newFechaFin: '', reason: '' })

// Dialog resolver (coordinador)
const dialogResolver    = ref(false)
const resolverSolicitud = ref(null)
const resolverStatus    = ref('APROBADA')
const resolverComentario = ref('')

function estadoBadge(status) {
  return { PENDIENTE: 'orange-7', APROBADA: 'green-8', RECHAZADA: 'red-8' }[status] || 'grey-5'
}

async function cargarSolicitudes() {
  if (!props.solicitudId) return
  loadingLista.value = true
  try {
    const res = await get(`/complementary/requests/${props.solicitudId}/extension-requests`)
    solicitudes.value = res || []
  } catch {}
  loadingLista.value = false
}

async function enviarSolicitud() {
  const ok = await formRef.value?.validate()
  if (!ok) return
  loadingEnviar.value = true
  try {
    const res = await post(`/complementary/requests/${props.solicitudId}/extension-request`, {
      newFechaFin: form.value.newFechaFin,
      reason:      form.value.reason.trim(),
    })
    if (res?.msg) notifySuccessRequest(res.msg)
    form.value = { newFechaFin: '', reason: '' }
    await cargarSolicitudes()
  } catch {}
  loadingEnviar.value = false
}

function abrirResolver(solicitud, status) {
  resolverSolicitud.value  = solicitud
  resolverStatus.value     = status
  resolverComentario.value = ''
  dialogResolver.value     = true
}

async function confirmarResolver() {
  const s = resolverSolicitud.value
  if (!s) return
  const key = s._id + '_' + resolverStatus.value
  loadingAccion.value = key
  dialogResolver.value = false
  try {
    const res = await put(
      `/complementary/requests/${props.solicitudId}/extension-request/${s._id}/resolve`,
      { status: resolverStatus.value, comments: resolverComentario.value.trim() }
    )
    if (res?.msg) notifySuccessRequest(res.msg)
    await cargarSolicitudes()
  } catch {}
  loadingAccion.value = null
}

watch(() => props.modelValue, (val) => {
  if (val) cargarSolicitudes()
})
</script>
