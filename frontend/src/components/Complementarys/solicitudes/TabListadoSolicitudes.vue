<template>
  <div>
    <!-- Filtros radio -->
    <div class="row justify-center q-mb-md">
      <div class="col-12 flex items-center">
        <q-radio
          v-for="(label, val) in TAB_LABEL" :key="val"
          :model-value="tabActivo"
          color="green-7"
          checked-icon="task_alt"
          unchecked-icon="panorama_fish_eye"
          :val="val" :label="label"
          @click="toggleFiltro(val)"
        />
        <q-btn
          v-if="tabActivo || searchText"
          flat dense icon="filter_alt_off" color="green-9" size="sm" label="Limpiar"
          class="q-ml-sm"
          @click="tabActivo = null; searchText = ''; searchFicha = ''; hasSearched = false; solicitudes = []"
        />
      </div>
    </div>

    <!-- Buscadores -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6">
        <q-input
          v-model="searchText"
          label="Buscar por nombre del curso"
          outlined dense clearable color="green-9"
        >
          <template v-slot:prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="searchFicha"
          label="Buscar por ficha de caracterización"
          outlined dense clearable color="green-9"
        >
          <template v-slot:prepend><q-icon name="fact_check" /></template>
        </q-input>
      </div>
    </div>

    <!-- Ordenar (solo admin) -->
    <template v-if="modo === 'admin'">
      <div class="row q-mb-md">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="sortMode"
            :options="opcionesOrden"
            emit-value map-options
            outlined dense color="green-9" label="Ordenar por"
            @update:model-value="onSortChange"
          >
            <template v-slot:prepend><q-icon name="sort" /></template>
          </q-select>
        </div>
      </div>
    </template>

    <!-- Estado vacío inicial -->
    <div v-if="!hasSearched" class="text-center q-pa-xl">
      <q-icon name="manage_search" size="64px" color="grey-4" />
      <div class="text-grey-5 q-mt-md" style="font-size: 20px; font-weight: 600">Sin registros aún</div>
      <div class="text-grey-4 q-mt-xs" style="font-size: 14px">Selecciona un filtro o busca por nombre de curso</div>
    </div>

    <!-- Tabla -->
    <div v-else class="row justify-center flex q-mb-md" style="position: relative">
      <q-table
        class="full-width my-sticky-header-table"
        :style="solicitudesFiltradas.length > 0 ? 'height: 62vh' : ''"
        flat bordered
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

        <!-- Headers de dos líneas -->
        <template v-slot:header-cell-fichaCaracterizacion="props">
          <q-th :props="props" class="text-center">
            Ficha de<br>Caracterización
          </q-th>
        </template>
        <template v-slot:header-cell-fechaInicio="props">
          <q-th :props="props" style="text-align: center !important">
            Fecha de<br>Inicio
          </q-th>
        </template>

        <!-- Nombre del curso truncado con tooltip -->
        <template v-slot:body-cell-curso="props">
          <q-td :props="props" style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            {{ props.value }}
            <q-tooltip v-if="props.row._cursoCompleto?.length > 40" anchor="top middle" self="bottom middle">
              {{ props.row._cursoCompleto }}
            </q-tooltip>
          </q-td>
        </template>

        <!-- Badge: estado principal -->
        <template v-slot:body-cell-estado="props">
          <q-td :props="props">
            <q-badge
              :color="estadoColor(props.value)"
              style="padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.3px"
            >
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <!-- Columna opciones -->
        <template v-slot:body-cell-opciones="props">
          <q-td :props="props">

            <!-- VER (siempre visible) -->
            <q-btn round icon="visibility" size="sm" color="blue-10" class="q-mx-xs"
              :loading="loadingDetalle === props.row._id"
              @click="abrirDetalle(props.row)">
              <q-tooltip class="bg-blue-grey-1 text-green-9">Ver detalle completo</q-tooltip>
            </q-btn>

            <!-- ─── ADMIN: en proceso (PENDIENTE) ─── -->
            <template v-if="modo === 'admin' && tabActivo === 'enProceso'">
              <q-btn round icon="check_circle" size="sm" color="green-10" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PENDIENTE' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="aprobarSolicitud(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Aprobar solicitud</q-tooltip>
              </q-btn>
              <q-btn round icon="cancel" size="sm" color="red-10" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PENDIENTE' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="abrirDialogRechazo(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Rechazar solicitud</q-tooltip>
              </q-btn>
            </template>

            <!-- ─── ADMIN: aprobadas (APROBADA / FICHA_ASIGNADA / INSCRIPCION / PROGRAMADA) ─── -->
            <template v-if="modo === 'admin' && tabActivo === 'aprobadas'">

              <q-btn round icon="fact_check" size="sm" color="purple-8" class="q-mx-xs"
                :disable="!['APROBADA'].includes(props.row._stateRaw)"
                :loading="loadingAccion === props.row._id"
                @click="abrirAsignarFicha(props.row)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Asignar número de ficha y fechas</q-tooltip>
              </q-btn>
              <q-btn round icon="date_range" size="sm" color="teal-9" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'MATRICULADA'"
                :loading="loadingAccion === props.row._id"
                @click="abrirProgramar(props.row)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Programar sesiones del curso</q-tooltip>
              </q-btn>
              <q-btn round icon="how_to_reg" size="sm" color="blue-7" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'INSCRIPCION' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="avanzarMatriculada(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Avanzar a Matriculada</q-tooltip>
              </q-btn>
              <q-btn round icon="update" size="sm" color="orange-9" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PROGRAMADA'"
                :loading="loadingAccion === props.row._id"
                @click="abrirReprogramar(props.row)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Modificar programación existente</q-tooltip>
              </q-btn>
              <q-btn round icon="play_circle" size="sm" color="deep-purple-8" class="q-mx-xs"
                :disable="props.row._stateRaw !== 'PROGRAMADA' || loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="avanzarEjecucion(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Avanzar a Ejecución</q-tooltip>
              </q-btn>
              <q-btn round icon="block" size="sm" color="red-9" class="q-mx-xs"
                :disable="loadingAccion === props.row._id"
                :loading="loadingAccion === props.row._id"
                @click="abrirCancelar(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar esta solicitud</q-tooltip>
              </q-btn>
            </template>

            <!-- ─── ADMIN: rechazadas ─── -->
            <template v-if="modo === 'admin' && tabActivo === 'rechazadas'">
              <q-btn round icon="block" size="sm" color="red-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirCancelar(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Cancelar esta solicitud</q-tooltip>
              </q-btn>
            </template>

            <!-- ─── ADMIN: en ejecución ─── -->
            <template v-if="modo === 'admin' && tabActivo === 'ejecucion'">
              <q-btn round icon="grading" size="sm" color="teal-8" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirEvaluar(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Evaluar resultados de aprendizaje</q-tooltip>
              </q-btn>
              <q-btn round icon="event_note" size="sm" color="indigo-7" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirEventos(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Agregar eventos mensuales</q-tooltip>
              </q-btn>
              <q-btn round icon="more_time" size="sm" color="amber-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirAmpliacion(props.row._id, 'coordinador')">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Ver solicitudes de ampliación</q-tooltip>
              </q-btn>
              <q-btn round icon="lock" size="sm" color="blue-grey-8" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirCerrarFicha(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Cerrar ficha complementaria</q-tooltip>
              </q-btn>
            </template>

            <!-- ─── INSTRUCTOR: aprobadas/ejecución ─── -->
            <template v-if="modo === 'instructor' && tabActivo === 'aprobadas' && props.row._stateRaw === 'EJECUCION'">
              <q-btn round icon="event_note" size="sm" color="indigo-7" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirEventos(props.row._id)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Agregar eventos mensuales</q-tooltip>
              </q-btn>
              <q-btn round icon="more_time" size="sm" color="amber-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirAmpliacion(props.row._id, 'instructor')">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Solicitar ampliación de tiempo</q-tooltip>
              </q-btn>
            </template>

            <!-- ─── INSTRUCTOR: rechazadas ─── -->
            <template v-if="modo === 'instructor' && tabActivo === 'rechazadas'">
              <q-btn round icon="edit_note" size="sm" color="orange-9" class="q-mx-xs"
                :loading="loadingDetalle === props.row._id"
                @click="abrirEditar(props.row)">
                <q-tooltip class="bg-blue-grey-1 text-green-9">Editar y corregir la solicitud</q-tooltip>
              </q-btn>
              <q-btn round icon="forward_to_inbox" size="sm" color="green-9" class="q-mx-xs"
                :loading="loadingAccion === props.row._id"
                @click="abrirReenviar(props.row._id)">
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
          <q-input v-model="motivoRechazo" type="textarea" outlined autogrow color="red-8"
            label="Motivo de rechazo *" placeholder="Indique el motivo por el cual se rechaza la solicitud..." />
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="CANCELAR" flat color="dark" v-close-popup />
          <q-btn label="RECHAZAR" color="red-7" unelevated
            :disable="!motivoRechazo.trim()" @click="confirmarRechazo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog CANCELAR -->
    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="bg-grey-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="block" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold text-center" style="font-size: 16px">CANCELAR SOLICITUD</div>
              <div class="text-grey-4 text-center" style="font-size: 12px">Esta acción no se puede deshacer</div>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-md">
          <q-input v-model="motivoCancelacion" type="textarea" outlined autogrow color="grey-8"
            label="Motivo de cancelación *" placeholder="Indique el motivo por el cual se cancela la solicitud..." />
        </q-card-section>
        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="VOLVER" flat color="dark" v-close-popup />
          <q-btn label="CANCELAR SOLICITUD" color="red-7" unelevated
            :disable="!motivoCancelacion.trim()" @click="confirmarCancelar" />
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
          <q-btn label="CANCELAR" flat color="dark" :disable="loadingReenviar" @click="cerrarDialogReenviar" />
          <q-btn label="REENVIAR" icon="forward_to_inbox" color="green-9" unelevated
            :loading="loadingReenviar" :disable="loadingReenviar"
            @click="confirmarReenviar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ASIGNAR FICHA -->
    <DialogAsignarFicha
      v-if="idParaFicha"
      v-model="dialogAsignarFicha"
      :solicitud-id="idParaFicha"
      :solicitud-data="solicitudDataParaFicha"
      @guardado="onAsignarFicha"
    />

    <!-- Dialog CERRAR FICHA -->
    <q-dialog v-model="dialogCerrar" persistent>
      <q-card style="width: 480px; max-width: 90vw">
        <q-card-section class="bg-blue-grey-8 q-px-lg q-py-sm">
          <div class="row items-center justify-center q-gutter-sm">
            <q-icon name="lock" color="white" size="28px" />
            <div>
              <div class="text-white text-weight-bold text-center" style="font-size: 16px">CERRAR FICHA COMPLEMENTARIA</div>
              <div class="text-blue-grey-3 text-center" style="font-size: 12px">Todos los resultados de aprendizaje deben estar evaluados</div>
            </div>
          </div>
        </q-card-section>

        <q-card-section v-if="schedulesPendientes.length" class="q-pa-md">
          <div class="text-red-8 text-weight-bold q-mb-sm">
            <q-icon name="warning" /> Hay {{ schedulesPendientes.length }} sesión(es) sin evaluar:
          </div>
          <q-list bordered separator dense>
            <q-item v-for="s in schedulesPendientes" :key="s._id">
              <q-item-section>
                <q-item-label class="text-caption">{{ s.outcome || 'Sesión' }}</q-item-label>
                <q-item-label caption>{{ s.tstart }} – {{ s.tend }} · Días: {{ s.days?.join(', ') }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-section v-else class="text-center q-pa-md">
          <q-icon name="lock" size="56px" color="blue-grey-7" />
          <div class="q-mt-md text-body1 text-weight-medium">¿Cerrar esta ficha complementaria?</div>
          <div class="text-grey-6 q-mt-sm text-caption">El estado cambiará a <strong>CERRADA</strong> y no podrá reactivarse.</div>
        </q-card-section>

        <q-card-actions align="center" class="q-pb-lg">
          <q-btn label="VOLVER" flat color="dark" v-close-popup />
          <q-btn v-if="!schedulesPendientes.length"
            label="CERRAR FICHA" icon="lock" color="blue-grey-8" unelevated
            @click="confirmarCerrarFicha" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog PROGRAMAR / RE-PROGRAMAR -->
    <DialogProgramar
      v-if="solicitudParaProgramar"
      v-model="dialogProgramar"
      :modo="modoProgramar"
      :solicitud-id="solicitudParaProgramar._id"
      :schedule-id="scheduleIdProgramar"
      :instructor-id="solicitudParaProgramar._detalle?.instructor?._id || ''"
      :duracion-max="solicitudParaProgramar.horas || 0"
      :schedule-data="solicitudParaProgramar._detalle?.schedule || {}"
      :solicitud-data="solicitudParaProgramar._detalle || {}"
      @guardado="onProgramar"
    />

    <!-- Dialog EVALUAR RESULTADOS -->
    <DialogEvaluarResultados
      v-if="idParaAccion"
      v-model="dialogEvaluar"
      :solicitud-id="idParaAccion"
      @guardado="fetchSolicitudes"
    />

    <!-- Dialog AGREGAR EVENTOS -->
    <DialogAgregarEventos
      v-if="idParaAccion"
      v-model="dialogEventos"
      :solicitud-id="idParaAccion"
    />

    <!-- Dialog AMPLIACION -->
    <DialogAmpliacion
      v-if="idParaAccion"
      v-model="dialogAmpliacion"
      :solicitud-id="idParaAccion"
      :modo="modoAmpliacion"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { get, put } from '../../../services/api.js'
import { notifySuccessRequest, notifyErrorRequest } from '../../../common/notify.js'
import DialogVerEditarSolicitud from './DialogVerEditarSolicitud.vue'
import DialogAsignarFicha from './DialogAsignarFicha.vue'
import DialogProgramar from './DialogProgramar.vue'
import DialogEvaluarResultados from './DialogEvaluarResultados.vue'
import DialogAgregarEventos from './DialogAgregarEventos.vue'
import DialogAmpliacion from './DialogAmpliacion.vue'

const props = defineProps({
  modo: { type: String, required: true }, // 'instructor' | 'admin'
})

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const TAB_LABEL = {
  enProceso:  'En proceso',
  aprobadas:  'Aprobadas',
  ejecucion:  'En ejecución',
  rechazadas: 'Rechazadas',
  canceladas: 'Canceladas',
  cerradas:   'Cerradas',
}

const STATE_BACKEND_MAP = {
  PENDIENTE:      'En proceso',
  APROBADA:       'Aprobada',
  FICHA_ASIGNADA: 'Ficha asignada',
  INSCRIPCION:    'Inscripción',
  MATRICULADA:    'Matriculada',
  PROGRAMADA:     'Programada',
  CERRADA:        'Cerrada',
  RECHAZADA:      'Rechazada',
  CANCELADA:      'Cancelada',
  EJECUCION:      'En ejecución',
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTADO REACTIVO
// ══════════════════════════════════════════════════════════════════════════════

const solicitudes                = ref([])
const todasSolicitudesInstructor = ref([])
const solicitudSeleccionada      = ref(null)
const tabActivo                  = ref(null)
const searchText                 = ref('')
const searchFicha                = ref('')
const sortBy                     = ref('createdAt')
const sortOrder                  = ref('desc')
const sortMode                   = ref('recientes')

const opcionesOrden = [
  { label: 'Más recientes primero',          value: 'recientes'   },
  { label: 'Fecha inicio: próximas primero', value: 'inicio_asc'  },
  { label: 'Fecha inicio: lejanas primero',  value: 'inicio_desc' },
]

function onSortChange(val) {
  if (val === 'recientes')   { sortBy.value = 'createdAt';   sortOrder.value = 'desc' }
  if (val === 'inicio_asc')  { sortBy.value = 'fechaInicio'; sortOrder.value = 'asc'  }
  if (val === 'inicio_desc') { sortBy.value = 'fechaInicio'; sortOrder.value = 'desc' }
  if (props.modo === 'admin') fetchSolicitudes()
}
const hasSearched                = ref(false)
const cargadoInstructor          = ref(false)
const loadingTabla               = ref(false)
const loadingDetalle             = ref(null)
const loadingAccion              = ref(null)

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
const dialogReenviar  = ref(false)
const idParaReenviar  = ref(null)
const loadingReenviar = ref(false)

// Dialog ASIGNAR FICHA
const dialogAsignarFicha     = ref(false)
const idParaFicha            = ref(null)
const solicitudDataParaFicha = ref({})

// Dialog PROGRAMAR / RE-PROGRAMAR
const dialogProgramar        = ref(false)
const modoProgramar          = ref('programar')
const solicitudParaProgramar = ref(null)
const scheduleIdProgramar    = ref('')

// Dialog CERRAR FICHA
const dialogCerrar    = ref(false)
const idParaCerrar    = ref(null)
const schedulesPendientes = ref([])

// Dialogs EJECUCION
const dialogEvaluar    = ref(false)
const dialogEventos    = ref(false)
const dialogAmpliacion = ref(false)
const modoAmpliacion   = ref('coordinador')
const idParaAccion     = ref(null)

// ══════════════════════════════════════════════════════════════════════════════
// COLUMNAS
// ══════════════════════════════════════════════════════════════════════════════

const columnas = computed(() => {
  const base = [
    { name: 'numeroSolicitud',      label: 'N° SOLICITUD',            field: 'numeroSolicitud',      align: 'center', sortable: true },
    { name: 'fichaCaracterizacion', label: 'Ficha de Caracterización', field: 'fichaCaracterizacion', align: 'center' },
    { name: 'fechaInicio',          label: 'Fecha de Inicio',          field: 'fechaInicio',          align: 'center', sortable: true },
    { name: 'curso',                label: 'CURSO',                    field: 'curso',                align: 'left',   style: 'max-width: 220px' },
    { name: 'instructor',           label: 'INSTRUCTOR',               field: 'instructor',           align: 'center' },
    { name: 'ubicacion',            label: 'UBICACIÓN',                field: 'ubicacion',            align: 'center' },
    { name: 'estado',               label: 'ESTADO',                   field: 'estado',               align: 'center' },
    { name: 'opciones',             label: 'OPCIONES',                 field: 'opciones',             align: 'center' },
  ]
  return base
})

// ══════════════════════════════════════════════════════════════════════════════
// COMPUTEDS
// ══════════════════════════════════════════════════════════════════════════════

const solicitudesFiltradas = computed(() => {
  let list = solicitudes.value
  const q = searchText.value?.toLowerCase()
  const f = searchFicha.value?.toLowerCase()
  if (q) list = list.filter(s => s.curso?.toLowerCase().includes(q))
  if (f) list = list.filter(s => s.fichaCaracterizacion?.toLowerCase().includes(f))

  if (sortMode.value === 'inicio_asc') {
    list = [...list].sort((a, b) => {
      if (!a.fechaInicio || a.fechaInicio === '—') return 1
      if (!b.fechaInicio || b.fechaInicio === '—') return -1
      return a.fechaInicio.localeCompare(b.fechaInicio)
    })
  } else if (sortMode.value === 'inicio_desc') {
    list = [...list].sort((a, b) => {
      if (!a.fechaInicio || a.fechaInicio === '—') return 1
      if (!b.fechaInicio || b.fechaInicio === '—') return -1
      return b.fechaInicio.localeCompare(a.fechaInicio)
    })
  }

  return list
})

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function mapRow(r) {
  const cursoCompleto = r.catalogCourseName || r.catalogCourse?.prfDenominacion || '—'
  return {
    _id:                  r._id,
    _stateRaw:            r.state,
    numeroSolicitud:      r.numeroSolicitud              || '—',
    fichaCaracterizacion: r.fichaCaracterizacion         || '—',
    fechaInicio:          r.fechaInicio?.slice(0, 10)    || '—',
    curso:                cursoCompleto.length > 40 ? cursoCompleto.slice(0, 40) + '…' : cursoCompleto,
    _cursoCompleto:       cursoCompleto,
    instructor:           r.instructor?.name             || '—',
    ubicacion:            r.municipio || r.ambienteNombre || '—',
    estado:               STATE_BACKEND_MAP[r.state] || r.state || '—',
    _detalle:             r,
  }
}

function estadoColor(estado) {
  const MAP = {
    'En proceso':     'orange-8',
    'Aprobada':       'green-9',
    'Rechazada':      'red-8',
    'Ficha asignada': 'purple-8',
    'Inscripción':    'teal-8',
    'Matriculada':    'blue-7',
    'Programada':     'blue-8',
    'Cerrada':        'grey-7',
    'Cancelada':      'grey-6',
    'En ejecución':   'deep-purple-8',
  }
  return MAP[estado] || 'grey-5'
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
      /* Carga todas las solicitudes del instructor una sola vez y filtra localmente */
      if (!cargadoInstructor.value) {
        const res = await get('/complementary/instructor/requests')
        todasSolicitudesInstructor.value = (res || []).map(mapRow)
        cargadoInstructor.value = true
      }
      const FILTROS = {
        enProceso:  r => r._stateRaw === 'PENDIENTE',
        aprobadas:  r => ['APROBADA', 'FICHA_ASIGNADA', 'INSCRIPCION', 'MATRICULADA', 'PROGRAMADA'].includes(r._stateRaw),
        ejecucion:  r => r._stateRaw === 'EJECUCION',
        rechazadas: r => r._stateRaw === 'RECHAZADA',
        canceladas: r => r._stateRaw === 'CANCELADA',
        cerradas:   r => r._stateRaw === 'CERRADA',
      }
      solicitudes.value = todasSolicitudesInstructor.value.filter(FILTROS[tabActivo.value] || (() => true))
    } else {
      const PARAMS = {
        enProceso:  { state: 'PENDIENTE' },
        aprobadas:  {},
        rechazadas: { state: 'RECHAZADA' },
        canceladas: { state: 'CANCELADA' },
        ejecucion:  { state: 'EJECUCION' },
        cerradas:   { state: 'CERRADA' },
      }
      // Preserva el scheduleData local antes de re-poblar la lista desde la API
      const scheduleCache = {}
      for (const s of solicitudes.value) {
        if (s._scheduleId || s._scheduleData) {
          scheduleCache[s._id] = { _scheduleId: s._scheduleId, _scheduleData: s._scheduleData }
        }
      }

      const res  = await get('/complementary/requests', {
        ...(PARAMS[tabActivo.value] || {}),
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      })
      let list   = (res || []).map(r => {
        const row = mapRow(r)
        return scheduleCache[row._id] ? { ...row, ...scheduleCache[row._id] } : row
      })
      if (tabActivo.value === 'aprobadas') {
        // Incluye únicamente los estados del flujo de aprobación activa
        list = list.filter(r => ['APROBADA', 'FICHA_ASIGNADA', 'INSCRIPCION', 'MATRICULADA', 'PROGRAMADA'].includes(r._stateRaw))
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
    tabActivo.value   = null
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
    solicitudSeleccionada.value = {
      ...row,
      _detalle: { ...res, _scheduleData: row._scheduleData || null },
    }
  } catch {
    solicitudSeleccionada.value = { ...row, _detalle: row._detalle || {} }
  }
  loadingDetalle.value = null
  modoEdicion.value    = false
  dialogVerEditar.value = true
}

async function abrirEditar(row) {
  loadingDetalle.value = row._id
  try {
    const res = await get(`/complementary/requests/${row._id}`)
    solicitudSeleccionada.value = {
      ...row,
      _detalle: { ...res, _scheduleData: row._scheduleData || null },
    }
  } catch {
    solicitudSeleccionada.value = { ...row, _detalle: row._detalle || {} }
  }
  loadingDetalle.value  = null
  modoEdicion.value     = true
  dialogVerEditar.value = true
}

async function onGuardarEdicion({ id, data }) {
  loadingAccion.value   = id
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
    notifySuccessRequest(res?.msg || 'Solicitud guardada correctamente')
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'No se pudo guardar la solicitud')
  }
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
  loadingAccion.value  = null
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
  idParaReenviar.value  = id
  loadingReenviar.value = false
  dialogReenviar.value  = true
}

function cerrarDialogReenviar() {
  dialogReenviar.value  = false
  idParaReenviar.value  = null
  loadingReenviar.value = false
}

async function confirmarReenviar() {
  const id = idParaReenviar.value
  if (!id || loadingReenviar.value) return
  loadingReenviar.value = true
  try {
    const res = await put(`/complementary/requests/${id}/resubmit`)
    dialogReenviar.value = false
    notifySuccessRequest(res?.msg || 'Solicitud reenviada correctamente')
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    await fetchSolicitudes()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'No se pudo reenviar la solicitud')
  }
  loadingReenviar.value = false
  idParaReenviar.value  = null
}

// ══════════════════════════════════════════════════════════════════════════════
// ASIGNAR FICHA
// ══════════════════════════════════════════════════════════════════════════════

function abrirAsignarFicha(row) {
  idParaFicha.value            = row._id
  solicitudDataParaFicha.value = row._detalle || {}
  dialogAsignarFicha.value     = true
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
// AVANZAR A EJECUCIÓN
// ══════════════════════════════════════════════════════════════════════════════

async function avanzarEjecucion(id) {
  loadingAccion.value = id
  try {
    const res = await put(`/complementary/requests/${id}/state`, { newState: 'EJECUCION' })
    if (res?.msg) notifySuccessRequest((res?.msg || 'Estado actualizado') + ' — Correo enviado al instructor')
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// AVANZAR A MATRICULADA
// ══════════════════════════════════════════════════════════════════════════════

async function avanzarMatriculada(id) {
  loadingAccion.value = id
  try {
    const res = await put(`/complementary/requests/${id}/state`, { newState: 'MATRICULADA' })
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCIONES DE EJECUCION (abrir dialogs)
// ══════════════════════════════════════════════════════════════════════════════

function abrirEvaluar(id) {
  idParaAccion.value  = id
  dialogEvaluar.value = true
}

function abrirEventos(id) {
  idParaAccion.value  = id
  dialogEventos.value = true
}

function abrirAmpliacion(id, modo) {
  idParaAccion.value    = id
  modoAmpliacion.value  = modo
  dialogAmpliacion.value = true
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
    // El backend no retorna el schedule en este endpoint; se guarda en _scheduleId
    // cuando se programa por primera vez en la sesión actual (ver onProgramar)
    scheduleIdProgramar.value    = row._scheduleData?._id || row._scheduleId || res?.scheduleId || ''
    solicitudParaProgramar.value = {
      ...row,
      _detalle: { ...res, _scheduleData: row._scheduleData || null, schedule: row._scheduleData || null },
    }
  } catch {}
  loadingAccion.value = null
  if (!scheduleIdProgramar.value) {
    notifyErrorRequest('No se encontró el ID del schedule. Recarga la página o contacta al backend para que incluya el scheduleId en la solicitud.')
    return
  }
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
      if (res?.data?._id) {
        const idx = solicitudes.value.findIndex(s => s._id === solicitudId)
        if (idx !== -1) {
          solicitudes.value[idx]._scheduleId   = res.data._id
          solicitudes.value[idx]._scheduleData = res.data
        }
      }
    } else {
      res = await put(`/complementary/schedule/${scheduleId}/reschedule`, data)
      // Actualiza el scheduleData local con el nuevo schedule reprogramado
      if (res?.data) {
        const solicitudId_ = solicitudes.value.find(s => s._scheduleId === scheduleId)?._id
        if (solicitudId_) {
          const idx = solicitudes.value.findIndex(s => s._id === solicitudId_)
          if (idx !== -1) solicitudes.value[idx]._scheduleData = res.data
        }
      }
    }
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch {}
  loadingAccion.value = null
}

// ══════════════════════════════════════════════════════════════════════════════
// CERRAR FICHA
// ══════════════════════════════════════════════════════════════════════════════

function abrirCerrarFicha(id) {
  idParaCerrar.value       = id
  schedulesPendientes.value = []
  dialogCerrar.value       = true
}

async function confirmarCerrarFicha() {
  const id = idParaCerrar.value
  loadingAccion.value = id
  dialogCerrar.value  = false
  try {
    const res = await put(`/complementary/requests/${id}/close`)
    if (res?.msg) notifySuccessRequest(res.msg)
    await fetchSolicitudes()
  } catch (err) {
    const pending = err?.response?.data?.pending
    if (pending?.length) {
      schedulesPendientes.value = pending
      dialogCerrar.value        = true
    }
  }
  loadingAccion.value = null
  idParaCerrar.value  = null
}

// ══════════════════════════════════════════════════════════════════════════════
// WATCHERS
// ══════════════════════════════════════════════════════════════════════════════

watch(tabActivo, (val) => {
  if (val) { hasSearched.value = true; fetchSolicitudes() }
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
// EXPONER para reset externo (usado desde HomeComplementarias)
// ══════════════════════════════════════════════════════════════════════════════

defineExpose({
  resetCache: () => {
    cargadoInstructor.value = false
    todasSolicitudesInstructor.value = []
    if (tabActivo.value) fetchSolicitudes()
  },
})
</script>
