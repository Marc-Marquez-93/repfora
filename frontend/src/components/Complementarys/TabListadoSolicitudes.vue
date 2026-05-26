<template>
  <div>
    <!-- Filtros radio -->
    <div class="row justify-center q-mb-md">
      <div class="col-12 flex items-center">
        <q-radio
          :model-value="tabActivo"
          color="green-7"
          checked-icon="task_alt"
          unchecked-icon="panorama_fish_eye"
          val="enProceso"
          label="En proceso"
          @click="toggleFiltro('enProceso')"
        />
        <q-radio
          :model-value="tabActivo"
          color="green-7"
          checked-icon="task_alt"
          unchecked-icon="panorama_fish_eye"
          val="aprobadas"
          label="Aprobadas"
          @click="toggleFiltro('aprobadas')"
        />
        <q-radio
          :model-value="tabActivo"
          color="green-7"
          checked-icon="task_alt"
          unchecked-icon="panorama_fish_eye"
          val="rechazadas"
          label="Rechazadas"
          @click="toggleFiltro('rechazadas')"
        />
        <q-radio
          :model-value="tabActivo"
          color="green-7"
          checked-icon="task_alt"
          unchecked-icon="panorama_fish_eye"
          val="canceladas"
          label="Canceladas"
          @click="toggleFiltro('canceladas')"
        />
        <q-btn
          v-if="tabActivo || searchText"
          flat
          dense
          icon="filter_alt_off"
          color="green-9"
          size="sm"
          label="Limpiar"
          class="q-ml-sm"
          @click="tabActivo = null; searchText = ''; hasSearched = false; solicitudes = []"
        />
      </div>
    </div>

    <!-- Buscador -->
    <div class="row justify-center q-mb-md">
      <q-input
        v-model="searchText"
        label="Buscar por nombre del curso"
        outlined
        dense
        clearable
        color="green-9"
        class="full-width"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Estado vacío inicial -->
    <div v-if="!hasSearched" class="text-center q-pa-xl">
      <q-icon name="manage_search" size="64px" color="grey-4" />
      <div class="text-grey-5 q-mt-md" style="font-size: 20px; font-weight: 600">
        Sin registros aún
      </div>
      <div class="text-grey-4 q-mt-xs" style="font-size: 14px">
        Selecciona un filtro o busca por nombre de curso
      </div>
    </div>

    <!-- Tabla -->
    <div
      v-else
      class="row justify-center flex q-mb-md"
      style="position: relative"
    >
      <q-table
        class="full-width my-sticky-header-table"
        :style="solicitudesFiltradas.length > 0 ? 'height: 62vh' : ''"
        flat
        bordered
        :rows="solicitudesFiltradas"
        :columns="columnas"
        rows-per-page-label="Registros por página"
        :pagination="{ rowsPerPage: 30 }"
      >
        <template v-slot:no-data>
          <div class="full-width text-center q-pa-xl">
            <q-icon name="inbox" size="64px" color="grey-4" />
            <div class="text-grey-5 q-mt-md" style="font-size: 20px; font-weight: 600">
              Sin solicitudes {{ TAB_LABEL[tabActivo]?.toLowerCase() }} aún
            </div>
          </div>
        </template>

        <!-- Badge estado principal -->
        <template v-slot:body-cell-estado="props">
          <q-td :props="props">
            <q-badge
              :color="
                props.value === 'Aprobada'
                  ? 'green-9'
                  : props.value === 'Rechazada'
                    ? 'red-8'
                    : props.value === 'Cancelada'
                      ? 'grey-6'
                      : 'orange-8'
              "
              style="padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.3px"
            >
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <!-- Badge sub-estado (tab aprobadas) -->
        <template v-slot:body-cell-subEstado="props">
          <q-td :props="props">
            <q-badge
              :color="subEstadoColor(props.value)"
              style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600"
            >
              {{ STATE_BACKEND_MAP[props.value] || props.value }}
            </q-badge>
          </q-td>
        </template>

        <!-- Columna opciones -->
        <template v-slot:body-cell-opciones="props">
          <q-td :props="props">

            <!-- VER (siempre) -->
            <q-btn
              round icon="visibility" size="sm" color="blue-10" class="q-mx-xs"
              :loading="loadingDetalle === props.row._id"
              @click="abrirDetalle(props.row)"
            >
              <q-tooltip class="bg-blue-grey-1 text-green-9">Ver detalle completo</q-tooltip>
            </q-btn>

            <!-- ADMIN: tab enProceso -->
            <template v-if="modo === 'admin' && tabActivo === 'enProceso'">
              <q-btn
                round icon="check_circle" size="sm" color="green-10" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PENDIENTE' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="aprobarSolicitud(props.row._id)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Aprobar solicitud</q-tooltip>
              </q-btn>
              <q-btn
                round icon="cancel" size="sm" color="red-10" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PENDIENTE' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="abrirDialogRechazo(props.row._id)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Rechazar solicitud</q-tooltip>
              </q-btn>
            </template>

            <!-- ADMIN: tab aprobadas -->
            <template v-if="modo === 'admin' && tabActivo === 'aprobadas'">
              <!-- APROBADA → Asignar Ficha -->
              <q-btn
                v-if="props.row._stateRaw === 'APROBADA'"
                round icon="folder_special" size="sm" color="blue-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirAsignarFicha(props.row._id)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Asignar número de ficha y fechas</q-tooltip>
              </q-btn>

              <!-- FICHA_ASIGNADA o INSCRIPCION → Programar -->
              <q-btn
                v-if="['FICHA_ASIGNADA','INSCRIPCION'].includes(props.row._stateRaw)"
                round icon="calendar_month" size="sm" color="teal-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirProgramar(props.row)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Programar sesiones del curso</q-tooltip>
              </q-btn>

              <!-- PROGRAMADA → Re-programar -->
              <q-btn
                v-if="props.row._stateRaw === 'PROGRAMADA'"
                round icon="edit_calendar" size="sm" color="orange-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirReprogramar(props.row)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Modificar programación existente</q-tooltip>
              </q-btn>

              <!-- Cancelar (todos excepto CERRADA) -->
              <q-btn
                v-if="props.row._stateRaw !== 'CERRADA'"
                round icon="do_not_disturb_on" size="sm" color="red-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirCancelar(props.row._id)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar esta solicitud</q-tooltip>
              </q-btn>
            </template>

            <!-- INSTRUCTOR: tab rechazadas → Editar + Reenviar -->
            <template v-if="modo === 'instructor' && tabActivo === 'rechazadas'">
              <q-btn
                round icon="edit_note" size="sm" color="orange-9" class="q-mx-xs"
                :loading="loadingDetalle === props.row._id"
                @click="abrirEditar(props.row)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Editar y corregir la solicitud</q-tooltip>
              </q-btn>
              <q-btn
                round icon="forward_to_inbox" size="sm" color="green-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirReenviar(props.row._id)"
              >
                <q-tooltip class="bg-blue-grey-1 text-green-9">Reenviar para nueva revisión</q-tooltip>
              </q-btn>
            </template>

          </q-td>
        </template>
      </q-table>

      <q-inner-loading :showing="loadingTabla">
        <q-spinner-gears size="50px" color="green-9" />
      </q-inner-loading>
    </div>

    <!-- Dialog VER / EDITAR -->
    <DialogVerEditarSolicitud
      v-if="solicitudSeleccionada"
      v-model="dialogVerEditar"
      :solicitud="solicitudSeleccionada"
      :modo-edicion="modoEdicion"
      @guardado="onGuardarEdicion"
    />

    <!-- Dialog RECHAZAR -->
    <q-dialog v-model="dialogRechazo" persistent>
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="bg-red-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="cancel" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold text-center" style="font-size: 16px">RECHAZAR SOLICITUD</div>
              <div class="text-red-2 text-center" style="font-size: 12px">El instructor recibirá un correo con el motivo</div>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-md">
          <q-input
            v-model="motivoRechazo"
            type="textarea"
            outlined
            autogrow
            color="red-8"
            label="Motivo de rechazo *"
            placeholder="Indique el motivo por el cual se rechaza la solicitud..."
          />
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="grey-7" v-close-popup />
          <q-btn
            label="RECHAZAR"
            color="red-7"
            unelevated
            :disable="!motivoRechazo.trim()"
            @click="confirmarRechazo"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog CANCELAR -->
    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="bg-grey-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="do_not_disturb_on" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold text-center" style="font-size: 16px">CANCELAR SOLICITUD</div>
              <div class="text-grey-4 text-center" style="font-size: 12px">Esta acción no se puede deshacer</div>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-md">
          <q-input
            v-model="motivoCancelacion"
            type="textarea"
            outlined
            autogrow
            color="grey-8"
            label="Motivo de cancelación *"
            placeholder="Indique el motivo por el cual se cancela la solicitud..."
          />
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="VOLVER" flat color="grey-7" v-close-popup />
          <q-btn
            label="CANCELAR SOLICITUD"
            color="red-7"
            unelevated
            :disable="!motivoCancelacion.trim()"
            @click="confirmarCancelar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog REENVIAR -->
    <q-dialog v-model="dialogReenviar" persistent>
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section class="bg-green-9 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="forward_to_inbox" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold text-center" style="font-size: 16px">REENVIAR SOLICITUD</div>
              <div class="text-green-2 text-center" style="font-size: 12px">Vuelve al estado "En proceso"</div>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="text-center q-pa-md">
          <q-icon name="forward_to_inbox" size="56px" color="green-8" />
          <div class="q-mt-md text-body1 text-weight-medium">¿Reenviar esta solicitud para revisión?</div>
          <div class="text-grey-6 q-mt-sm text-caption">
            La solicitud pasará de <strong>Rechazada</strong> → <strong>En proceso</strong> y el coordinador podrá revisarla nuevamente.
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="grey-7" v-close-popup />
          <q-btn label="REENVIAR" icon="forward_to_inbox" color="green-9" unelevated @click="confirmarReenviar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ASIGNAR FICHA -->
    <DialogAsignarFicha
      v-if="idParaFicha"
      v-model="dialogAsignarFicha"
      :solicitud-id="idParaFicha"
      @guardado="onAsignarFicha"
    />

    <!-- Dialog PROGRAMAR / RE-PROGRAMAR -->
    <DialogProgramar
      v-if="solicitudParaProgramar"
      v-model="dialogProgramar"
      :modo="modoProgramar"
      :solicitud-id="solicitudParaProgramar._id"
      :schedule-id="scheduleIdProgramar"
      :instructor-id="solicitudParaProgramar._detalle?.instructor?._id || ''"
      :duracion-max="solicitudParaProgramar.horas || 0"
      @guardado="onProgramar"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get, put } from '../../services/api.js'
import { notifySuccessRequest } from '../../common/notify.js'
import DialogVerEditarSolicitud from './DialogVerEditarSolicitud.vue'
import DialogAsignarFicha from './DialogAsignarFicha.vue'
import DialogProgramar from './DialogProgramar.vue'

const props = defineProps({
  modo: { type: String, required: true }, // 'instructor' | 'admin'
})

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const TAB_LABEL = {
  enProceso:  'En proceso',
  aprobadas:  'Aprobadas',
  rechazadas: 'Rechazadas',
  canceladas: 'Canceladas',
}

const STATE_BACKEND_MAP = {
  PENDIENTE:      'En proceso',
  APROBADA:       'Aprobada',
  FICHA_ASIGNADA: 'Ficha asignada',
  INSCRIPCION:    'Inscripción',
  PROGRAMADA:     'Programada',
  CERRADA:        'Cerrada',
  RECHAZADA:      'Rechazada',
  CANCELADA:      'Cancelada',
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTADO REACTIVO
// ══════════════════════════════════════════════════════════════════════════════

const solicitudes               = ref([])
const todasSolicitudesInstructor = ref([])
const solicitudSeleccionada     = ref(null)
const tabActivo                 = ref(null)
const searchText                = ref('')
const hasSearched               = ref(false)
const cargadoInstructor         = ref(false)
const loadingTabla              = ref(false)
const loadingDetalle            = ref(null)
const loadingAccion             = ref(null)

// Dialog VER/EDITAR
const dialogVerEditar = ref(false)
const modoEdicion     = ref(false)

// Dialog RECHAZAR
const dialogRechazo  = ref(false)
const motivoRechazo  = ref('')
const idParaRechazar = ref(null)

// Dialog CANCELAR
const dialogCancelar    = ref(false)
const motivoCancelacion = ref('')
const idParaCancelar    = ref(null)

// Dialog REENVIAR
const dialogReenviar = ref(false)
const idParaReenviar = ref(null)

// Dialog ASIGNAR FICHA
const dialogAsignarFicha = ref(false)
const idParaFicha        = ref(null)

// Dialog PROGRAMAR / RE-PROGRAMAR
const dialogProgramar      = ref(false)
const modoProgramar        = ref('programar')
const solicitudParaProgramar = ref(null)
const scheduleIdProgramar  = ref('')

// ══════════════════════════════════════════════════════════════════════════════
// COLUMNAS
// ══════════════════════════════════════════════════════════════════════════════

const columnas = computed(() => {
  const base = [
    { name: 'fecha',      label: 'FECHA',             field: 'fecha',      align: 'center', sortable: true },
    { name: 'nombreCurso',label: 'NOMBRE DEL CURSO',  field: 'nombreCurso',align: 'center', sortable: true },
    { name: 'horas',      label: 'HORAS',             field: 'horas',      align: 'center', sortable: true },
    { name: 'estado',     label: 'ESTADO',            field: 'estado',     align: 'center', sortable: true },
    { name: 'opciones',   label: 'OPCIONES',          align: 'center' },
  ]
  if (props.modo === 'admin') {
    base.unshift({ name: 'instructor', label: 'INSTRUCTOR', field: 'instructor', align: 'center', sortable: true })
  }
  if (tabActivo.value === 'aprobadas') {
    const opIdx = base.findIndex(c => c.name === 'opciones')
    base.splice(opIdx, 0, {
      name: 'subEstado', label: 'SUB-ESTADO', field: '_stateRaw', align: 'center', sortable: true,
    })
  }
  return base
})

// ══════════════════════════════════════════════════════════════════════════════
// COMPUTEDS
// ══════════════════════════════════════════════════════════════════════════════

const solicitudesFiltradas = computed(() => {
  let list = solicitudes.value
  const q = searchText.value?.toLowerCase()
  if (q) list = list.filter(s => s.nombreCurso?.toLowerCase().includes(q))
  return list
})

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function mapRow(r) {
  return {
    _id:       r._id,
    _stateRaw: r.state,
    fecha:     r.createdAt?.slice(0, 10) || '—',
    instructor: r.instructor?.name || '—',
    nombreCurso: r.catalogCourse?.prfDenominacion || '—',
    horas:     r.catalogCourse?.prfDuracionMaxima ?? '—',
    estado:    STATE_BACKEND_MAP[r.state] || r.state || '—',
    _detalle:  r,
  }
}

function subEstadoColor(raw) {
  const MAP = {
    APROBADA:       'blue-8',
    FICHA_ASIGNADA: 'purple-8',
    INSCRIPCION:    'teal-8',
    PROGRAMADA:     'green-9',
    CERRADA:        'grey-7',
  }
  return MAP[raw] || 'grey-5'
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH
// ══════════════════════════════════════════════════════════════════════════════

async function fetchSolicitudes() {
  if (!tabActivo.value) return
  loadingTabla.value = true
  try {
    if (props.modo === 'instructor') {
      if (!cargadoInstructor.value) {
        const res = await get('/complementary/instructor/requests')
        todasSolicitudesInstructor.value = (res || []).map(mapRow)
        cargadoInstructor.value = true
      }
      const FILTROS = {
        enProceso:  r => r._stateRaw === 'PENDIENTE',
        aprobadas:  r => !['PENDIENTE', 'RECHAZADA', 'CANCELADA'].includes(r._stateRaw),
        rechazadas: r => r._stateRaw === 'RECHAZADA',
        canceladas: r => r._stateRaw === 'CANCELADA',
      }
      solicitudes.value = todasSolicitudesInstructor.value.filter(FILTROS[tabActivo.value] || (() => true))
    } else {
      const PARAMS = {
        enProceso:  { state: 'PENDIENTE' },
        aprobadas:  {},
        rechazadas: { state: 'RECHAZADA' },
        canceladas: { state: 'CANCELADA' },
      }
      const res = await get('/complementary/requests', PARAMS[tabActivo.value] || {})
      let list = (res || []).map(mapRow)
      if (tabActivo.value === 'aprobadas') {
        list = list.filter(r => !['PENDIENTE', 'RECHAZADA', 'CANCELADA'].includes(r._stateRaw))
      }
      solicitudes.value = list
    }
  } catch {}
  loadingTabla.value = false
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCIONES DE FILTRO
// ══════════════════════════════════════════════════════════════════════════════

function toggleFiltro(val) {
  if (tabActivo.value === val) {
    tabActivo.value = null
    hasSearched.value = false
    solicitudes.value = []
  } else {
    tabActivo.value = val
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// VER / EDITAR
// ══════════════════════════════════════════════════════════════════════════════

async function abrirDetalle(row) {
  loadingDetalle.value = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    solicitudSeleccionada.value = { ...row, _detalle: res }
  } catch {
    solicitudSeleccionada.value = { ...row, _detalle: row._detalle || {} }
  }
  loadingDetalle.value = null
  modoEdicion.value = false
  dialogVerEditar.value = true
}

async function abrirEditar(row) {
  loadingDetalle.value = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    solicitudSeleccionada.value = { ...row, _detalle: res }
  } catch {
    solicitudSeleccionada.value = { ...row, _detalle: row._detalle || {} }
  }
  loadingDetalle.value = null
  modoEdicion.value = true
  dialogVerEditar.value = true
}

async function onGuardarEdicion({ id, data }) {
  loadingAccion.value = id
  dialogVerEditar.value = false
  try {
    const payload = { ...data }
    if (typeof payload.competencies === 'string') {
      payload.competencies = payload.competencies.split(/\n+/).map(s => s.trim()).filter(Boolean)
    }
    if (typeof payload.outcomes === 'string') {
      payload.outcomes = payload.outcomes.split(/\n+/).map(s => s.trim()).filter(Boolean)
    }
    const res = await put(`/complementary/requests/${id}`, payload)
    if (res?.msg) notifySuccessRequest(res.msg)
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// APROBAR
// ══════════════════════════════════════════════════════════════════════════════

async function aprobarSolicitud(id) {
  loadingAccion.value = id
  try {
    const res = await put(`/complementary/approvals/${id}/approve`)
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// RECHAZAR
// ══════════════════════════════════════════════════════════════════════════════

function abrirDialogRechazo(id) {
  idParaRechazar.value = id
  motivoRechazo.value  = ''
  dialogRechazo.value  = true
}

async function confirmarRechazo() {
  if (!motivoRechazo.value.trim()) return
  const id = idParaRechazar.value
  loadingAccion.value = id
  dialogRechazo.value = false
  try {
    const res = await put(`/complementary/approvals/${id}/reject`, { observations: motivoRechazo.value.trim() })
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
  idParaRechazar.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// CANCELAR
// ══════════════════════════════════════════════════════════════════════════════

function abrirCancelar(id) {
  idParaCancelar.value    = id
  motivoCancelacion.value = ''
  dialogCancelar.value    = true
}

async function confirmarCancelar() {
  if (!motivoCancelacion.value.trim()) return
  const id = idParaCancelar.value
  loadingAccion.value  = id
  dialogCancelar.value = false
  try {
    const res = await put(`/complementary/requests/${id}/state`, {
      newState:     'CANCELADA',
      observations: motivoCancelacion.value.trim(),
    })
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value  = null
  idParaCancelar.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// REENVIAR
// ══════════════════════════════════════════════════════════════════════════════

function abrirReenviar(id) {
  idParaReenviar.value = id
  dialogReenviar.value = true
}

async function confirmarReenviar() {
  const id = idParaReenviar.value
  loadingAccion.value  = id
  dialogReenviar.value = false
  try {
    const res = await put(`/complementary/requests/${id}/resubmit`)
    if (res?.msg) notifySuccessRequest(res.msg)
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value  = null
  idParaReenviar.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// ASIGNAR FICHA
// ══════════════════════════════════════════════════════════════════════════════

function abrirAsignarFicha(id) {
  idParaFicha.value        = id
  dialogAsignarFicha.value = true
}

async function onAsignarFicha({ id, data }) {
  loadingAccion.value = id
  try {
    const res = await put(`/complementary/requests/${id}/assign-ficha`, data)
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAMAR / RE-PROGRAMAR
// ══════════════════════════════════════════════════════════════════════════════

function abrirProgramar(row) {
  solicitudParaProgramar.value = row
  modoProgramar.value          = 'programar'
  scheduleIdProgramar.value    = ''
  dialogProgramar.value        = true
}

async function abrirReprogramar(row) {
  solicitudParaProgramar.value = row
  modoProgramar.value          = 'reprogramar'
  scheduleIdProgramar.value    = ''
  loadingAccion.value          = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    scheduleIdProgramar.value = res?.schedule?._id || res?.schedule || ''
    solicitudParaProgramar.value = { ...row, _detalle: res }
  } catch {}
  loadingAccion.value   = null
  dialogProgramar.value = true
}

async function onProgramar({ modo, solicitudId, scheduleId, data }) {
  const loadId = solicitudId || scheduleId
  loadingAccion.value   = loadId
  dialogProgramar.value = false
  try {
    let res
    if (modo === 'programar') {
      res = await put(`/complementary/requests/${solicitudId}/schedule`, data)
    } else {
      res = await put(`/complementary/schedule/${scheduleId}/reschedule`, data)
    }
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// WATCHERS
// ══════════════════════════════════════════════════════════════════════════════

watch(tabActivo, (val) => {
  if (val) {
    hasSearched.value = true
    fetchSolicitudes()
  }
})

watch(searchText, (val) => {
  if (val && val.trim()) {
    hasSearched.value = true
    if (!cargadoInstructor.value || props.modo === 'admin') fetchSolicitudes()
  } else if (!tabActivo.value) {
    hasSearched.value = false
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// EXPONER para reset externo
// ══════════════════════════════════════════════════════════════════════════════

defineExpose({
  resetCache: () => {
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    if (tabActivo.value) fetchSolicitudes()
  },
})
</script>
