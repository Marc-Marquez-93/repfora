<template>
  <div>
    <BtnBack route="/home" />
    <HeaderLayout :title="tituloTab" />

    <q-tabs
      v-model="tab"
      class="q-mx-lg text-weight-bolder row"
      dense
      align="justify"
      active-color="lime-2"
      active-bg-color="green-9"
      indicator-color="black"
    >
      <q-tab class="text-green-9 bg-white col" name="solicitudes"    icon="assignment" :label="$q.screen.lt.sm ? '' : 'Solicitudes'" />
      <q-tab class="text-green-9 bg-white col" name="catalogo"       icon="menu_book"  :label="$q.screen.lt.sm ? '' : 'Catálogo'" />
      <q-tab class="text-green-9 bg-white col" name="actualizacion"  icon="update"     :label="$q.screen.lt.sm ? '' : 'Actualización'" />
      <q-tab class="text-green-9 bg-white col" name="parametros"     icon="tune"       :label="$q.screen.lt.sm ? '' : 'Parámetros'" />
      <q-tab class="text-green-9 bg-white col" name="juiciosreportes" icon="assessment" :label="$q.screen.lt.sm ? '' : 'Juicios y Reportes'" />
    </q-tabs>

    <q-tab-panels v-model="tab" keep-alive>

      <!-- ═══ TAB: SOLICITUDES ═══ -->
      <q-tab-panel class="q-px-lg" name="solicitudes">
        <TabListadoSolicitudes modo="admin" />
      </q-tab-panel>

      <!-- ═══ TAB: CATÁLOGO ═══ -->
      <q-tab-panel class="q-px-lg" name="catalogo">
        <TabCatalogo :mostrar-confirmar="false" />
      </q-tab-panel>

      <!-- ═══ TAB: ACTUALIZACIÓN ═══ -->
      <q-tab-panel class="q-pa-xl" name="actualizacion">
        <TabActualizacion
          ref="tabActualizacionRef"
          :loading="loadingUpload"
          :resultado="resultadoUpload"
          :progreso="progresoUpload"
          :estado-proceso="estadoProceso"
          @upload="subirCatalogo"
        />
      </q-tab-panel>

      <!-- ═══ TAB: PARÁMETROS ═══ -->
      <q-tab-panel class="q-pa-xl" name="parametros">
        <div class="row q-col-gutter-md">

          <!-- ── Tipos de Programa ── -->
          <div class="col-12 col-md-6">
            <div class="row items-center justify-between q-mb-sm">
              <div class="row items-center no-wrap">
                <q-icon name="category" color="blue-7" size="20px" class="q-mr-xs" />
                <span class="text-blue-7 text-weight-bold" style="font-size: 15px">Tipos de Programa</span>
              </div>
              <q-btn v-if="esPermitido" color="blue-7" unelevated icon="add" size="sm"
                label="Nuevo" @click="abrirDialogCrear('programa')" />
            </div>
            <q-table
              flat bordered
              :rows="parametrosPrograma"
              :columns="columnasParametros"
              :loading="loadingTabla"
              rows-per-page-label="Por página"
              :pagination="{ rowsPerPage: 7 }"
              no-data-label="Sin tipos de programa registrados"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="props.value === 0 ? 'green-8' : 'grey-6'"
                    style="padding: 4px 12px; border-radius: 20px">
                    {{ props.value === 0 ? 'Activo' : 'Inactivo' }}
                  </q-badge>
                </q-td>
              </template>
              <template v-slot:body-cell-acciones="props">
                <q-td :props="props">
                  <template v-if="esPermitido">
                    <q-btn round icon="edit" size="sm" color="orange-8" class="q-mx-xs"
                      @click="abrirDialogEditar(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
                    <q-btn v-if="props.row.status === 0" round icon="block" size="sm" color="red-7" class="q-mx-xs"
                      @click="abrirDialogDesactivar(props.row)"><q-tooltip>Desactivar</q-tooltip></q-btn>
                    <q-btn v-else round icon="check_circle" size="sm" color="green-7" class="q-mx-xs"
                      @click="abrirDialogActivar(props.row)"><q-tooltip>Activar</q-tooltip></q-btn>
                  </template>
                  <span v-else class="text-grey-5 text-caption">Sin permisos</span>
                </q-td>
              </template>
            </q-table>
          </div>

          <!-- ── Tipos de Población ── -->
          <div class="col-12 col-md-6">
            <div class="row items-center justify-between q-mb-sm">
              <div class="row items-center no-wrap">
                <q-icon name="diversity_3" color="deep-purple-6" size="20px" class="q-mr-xs" />
                <span class="text-deep-purple-6 text-weight-bold" style="font-size: 15px">Tipos de Población</span>
              </div>
              <q-btn v-if="esPermitido" color="deep-purple-6" unelevated icon="add" size="sm"
                label="Nuevo" @click="abrirDialogCrear('poblacion')" />
            </div>
            <q-table
              flat bordered
              :rows="parametrosPoblacion"
              :columns="columnasParametros"
              :loading="loadingTabla"
              rows-per-page-label="Por página"
              :pagination="{ rowsPerPage: 7 }"
              no-data-label="Sin tipos de población registrados"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="props.value === 0 ? 'green-8' : 'grey-6'"
                    style="padding: 4px 12px; border-radius: 20px">
                    {{ props.value === 0 ? 'Activo' : 'Inactivo' }}
                  </q-badge>
                </q-td>
              </template>
              <template v-slot:body-cell-acciones="props">
                <q-td :props="props">
                  <template v-if="esPermitido">
                    <q-btn round icon="edit" size="sm" color="orange-8" class="q-mx-xs"
                      @click="abrirDialogEditar(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
                    <q-btn v-if="props.row.status === 0" round icon="block" size="sm" color="red-7" class="q-mx-xs"
                      @click="abrirDialogDesactivar(props.row)"><q-tooltip>Desactivar</q-tooltip></q-btn>
                    <q-btn v-else round icon="check_circle" size="sm" color="green-7" class="q-mx-xs"
                      @click="abrirDialogActivar(props.row)"><q-tooltip>Activar</q-tooltip></q-btn>
                  </template>
                  <span v-else class="text-grey-5 text-caption">Sin permisos</span>
                </q-td>
              </template>
            </q-table>
          </div>

        </div>

        <!-- Dialog CREAR / EDITAR -->
        <q-dialog v-model="dialogForm" persistent>
          <q-card style="width: 420px; max-width: 90vw">
            <q-card-section class="bg-green-9 q-px-lg q-py-md">
              <div class="row items-center justify-center q-gutter-sm">
                <q-icon name="tune" color="white" size="28px" />
                <div class="text-white text-weight-bold text-center" style="font-size: 16px">
                  {{ modoForm === 'crear' ? 'NUEVO PARÁMETRO' : 'EDITAR PARÁMETRO' }}
                </div>
              </div>
            </q-card-section>
            <q-card-section class="q-pa-md q-gutter-sm">
              <q-input
                v-model="nombreForm"
                outlined color="green-9"
                label="Nombre *"
                autofocus :disable="loadingForm"
              >
                <template v-slot:prepend><q-icon name="label" /></template>
              </q-input>
              <q-select
                v-model="tipoForm"
                :options="opcionesTipo"
                emit-value map-options
                outlined color="green-9"
                label="Tipo *"
                :disable="loadingForm"
              >
                <template v-slot:prepend><q-icon name="category" /></template>
              </q-select>
            </q-card-section>
            <q-card-actions align="center" class="q-pb-lg">
              <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
              <q-btn
                :label="modoForm === 'crear' ? 'CREAR' : 'GUARDAR'"
                color="green-9" unelevated
                :loading="loadingForm"
                :disable="!nombreForm.trim() || !tipoForm || loadingForm"
                @click="confirmarForm"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Dialog DESACTIVAR -->
        <q-dialog v-model="dialogDesactivar" persistent>
          <q-card style="width: 380px; max-width: 90vw">
            <q-card-section class="bg-red-8 q-px-lg q-py-sm">
              <div class="row items-center justify-center q-gutter-sm">
                <q-icon name="block" color="white" size="28px" />
                <div class="text-white text-weight-bold text-center" style="font-size: 16px">DESACTIVAR PARÁMETRO</div>
              </div>
            </q-card-section>
            <q-card-section class="text-center q-pa-md">
              <q-icon name="block" size="48px" color="red-7" />
              <div class="q-mt-md text-body1 text-weight-medium">¿Desactivar "{{ parametroSeleccionado?.nombre }}"?</div>
              <div class="text-grey-6 q-mt-sm text-caption">Ya no aparecerá disponible en los formularios.</div>
            </q-card-section>
            <q-card-actions align="center" class="q-pb-lg">
              <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
              <q-btn label="DESACTIVAR" color="red-7" unelevated :loading="loadingForm" @click="confirmarDesactivar" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <!-- Dialog ACTIVAR -->
        <q-dialog v-model="dialogActivar" persistent>
          <q-card style="width: 380px; max-width: 90vw">
            <q-card-section class="bg-green-8 q-px-lg q-py-sm">
              <div class="row items-center justify-center q-gutter-sm">
                <q-icon name="check_circle" color="white" size="28px" />
                <div class="text-white text-weight-bold text-center" style="font-size: 16px">ACTIVAR PARÁMETRO</div>
              </div>
            </q-card-section>
            <q-card-section class="text-center q-pa-md">
              <q-icon name="check_circle" size="48px" color="green-7" />
              <div class="q-mt-md text-body1 text-weight-medium">¿Activar "{{ parametroSeleccionado?.nombre }}"?</div>
              <div class="text-grey-6 q-mt-sm text-caption">Volverá a estar disponible en los formularios.</div>
            </q-card-section>
            <q-card-actions align="center" class="q-pb-lg">
              <q-btn label="CANCELAR" flat color="dark" :disable="loadingForm" v-close-popup />
              <q-btn label="ACTIVAR" color="green-7" unelevated :loading="loadingForm" @click="confirmarActivar" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-tab-panel>

      <!-- ═══ TAB: JUICIOS Y REPORTES ═══ -->
      <q-tab-panel class="q-pa-xl" name="juiciosreportes">
        <div class="row justify-center items-stretch q-gutter-lg">
          <div v-for="(card, index) in cardsJuicios" :key="index"
            class="col-12 col-sm-5 col-md-3 flex"
          >
            <Card :title="card.title" :image="card.image" :route="card.route" :roles="card.roles" />
          </div>
        </div>
      </q-tab-panel>

    </q-tab-panels>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import { get, post, put } from "../services/api.js";
import { requestAxios } from "../common/axios.js";
import { storeUser } from "../store/users.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import Card from "../layouts/Card.vue";
import TabCatalogo from "../components/Complementarys/catalogo/TabCatalogo.vue";
import TabListadoSolicitudes from "../components/Complementarys/solicitudes/TabListadoSolicitudes.vue";
import TabActualizacion from "../components/Complementarys/shared/TabActualizacion.vue";
import { notifySuccessRequest, notifyErrorRequest, notifyWarningRequest } from "../common/notify.js";

const useStore = storeUser();
const tab                 = ref("solicitudes");
const tabActualizacionRef = ref(null);

const tituloTab = computed(() => {
  if (tab.value === "solicitudes")     return "Solicitudes";
  if (tab.value === "catalogo")        return "Catálogo";
  if (tab.value === "parametros")      return "Parámetros";
  if (tab.value === "juiciosreportes") return "Juicios y Reportes";
  return "Actualización";
});

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PARÁMETROS
// ══════════════════════════════════════════════════════════════════════════════

const esPermitido          = computed(() => ['COORDINADOR', 'PROGRAMADOR'].includes(useStore.getRole()))
const parametros           = ref([])
const loadingTabla         = ref(false)
const loadingForm          = ref(false)
const dialogForm           = ref(false)
const dialogDesactivar     = ref(false)
const dialogActivar        = ref(false)
const modoForm             = ref('crear')
const nombreForm           = ref('')
const tipoForm             = ref(null)
const parametroSeleccionado = ref(null)

const opcionesTipo = [
  { label: 'Tipo de Programa',  value: 'programa'  },
  { label: 'Tipo de Población', value: 'poblacion' },
]

const columnasParametros = [
  { name: 'nombre',    label: 'NOMBRE',   field: 'nombre',                                  align: 'left',   sortable: true },
  { name: 'status',    label: 'ESTADO',   field: 'status',                                  align: 'center' },
  { name: 'createdAt', label: 'CREADO',   field: row => row.createdAt?.slice(0, 10) || '—', align: 'center' },
  { name: 'acciones',  label: 'ACCIONES', field: 'acciones',                                align: 'center' },
]

const parametrosPrograma  = computed(() => parametros.value.filter(p => p.tipo === 'programa'))
const parametrosPoblacion = computed(() => parametros.value.filter(p => p.tipo === 'poblacion'))

async function cargarParametros() {
  loadingTabla.value = true
  try {
    const res = await get('/complementary/parametros')
    parametros.value = Array.isArray(res) ? res : []
  } catch {
    notifyErrorRequest('Error al cargar los parámetros')
  }
  loadingTabla.value = false
}

onMounted(cargarParametros)

function abrirDialogCrear(tipo) {
  modoForm.value  = 'crear'
  nombreForm.value = ''
  tipoForm.value   = tipo
  parametroSeleccionado.value = null
  dialogForm.value = true
}

function abrirDialogEditar(row) {
  modoForm.value   = 'editar'
  nombreForm.value = row.nombre
  tipoForm.value   = row.tipo
  parametroSeleccionado.value = row
  dialogForm.value = true
}

function abrirDialogDesactivar(row) {
  parametroSeleccionado.value = row
  dialogDesactivar.value = true
}

function abrirDialogActivar(row) {
  parametroSeleccionado.value = row
  dialogActivar.value = true
}

async function confirmarForm() {
  if (!nombreForm.value.trim() || !tipoForm.value) return
  loadingForm.value = true
  try {
    const body = { nombre: nombreForm.value.trim(), tipo: tipoForm.value, token: useStore.token }
    let res
    if (modoForm.value === 'crear') {
      res = await post('/complementary/parametros', body)
    } else {
      res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}`, body)
    }
    notifySuccessRequest(res?.msg || 'Operación realizada correctamente')
    dialogForm.value = false
    await cargarParametros()
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al guardar')
  }
  loadingForm.value = false
}

async function confirmarDesactivar() {
  if (!parametroSeleccionado.value) return
  loadingForm.value = true
  try {
    const res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}/deactivate`, { token: useStore.token })
    notifySuccessRequest(res?.msg || 'Parámetro desactivado')
    dialogDesactivar.value = false
    const item = parametros.value.find(p => p._id === parametroSeleccionado.value._id)
    if (item) item.status = 1
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al desactivar')
  }
  loadingForm.value = false
}

async function confirmarActivar() {
  if (!parametroSeleccionado.value) return
  loadingForm.value = true
  try {
    const res = await put(`/complementary/parametros/${parametroSeleccionado.value._id}/activate`, { token: useStore.token })
    notifySuccessRequest(res?.msg || 'Parámetro activado')
    dialogActivar.value = false
    const item = parametros.value.find(p => p._id === parametroSeleccionado.value._id)
    if (item) item.status = 0
  } catch (err) {
    notifyErrorRequest(err?.response?.data?.msg || 'Error al activar')
  }
  loadingForm.value = false
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: JUICIOS Y REPORTES
// ══════════════════════════════════════════════════════════════════════════════

const cardsJuicios = ref([
  { title: "Reporte Genérico 1", image: "/images/reports2.jpg",  route: "#", roles: ["COORDINADOR", "PROGRAMADOR"] },
  { title: "Reporte Genérico 2", image: "/images/judgment.png",  route: "#", roles: ["COORDINADOR", "PROGRAMADOR"] },
  { title: "Reporte Genérico 3", image: "/images/resultado.png", route: "#", roles: ["COORDINADOR", "PROGRAMADOR"] },
]);

// ══════════════════════════════════════════════════════════════════════════════
// TAB: ACTUALIZACIÓN
// ══════════════════════════════════════════════════════════════════════════════

const loadingUpload   = ref(false);
const resultadoUpload = ref(null);
const progresoUpload  = ref(0);
const estadoProceso   = ref(null);

let pollInterval = null;

function detenerPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  loadingUpload.value  = false;
  progresoUpload.value = 0;
  estadoProceso.value  = null;
}

onBeforeUnmount(detenerPolling);

async function subirCatalogo(file) {
  loadingUpload.value   = true;
  resultadoUpload.value = null;
  progresoUpload.value  = 0;
  estadoProceso.value   = null;

  let jobId = null;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await post("/complementary/catalog/upload", formData);
    jobId = res?.jobId;
  } catch {
    loadingUpload.value = false;
    return;
  }

  if (!jobId) {
    notifyErrorRequest("No se recibió un ID de proceso. Intente nuevamente.");
    loadingUpload.value = false;
    return;
  }

  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  pollInterval = setInterval(async () => {
    let res;
    try {
      res = await requestAxios.get(
        `/complementary/catalog/upload-status/${jobId}`,
        { validateStatus: (s) => s === 200 || s === 404 }
      );
    } catch {
      detenerPolling();
      return;
    }

    if (res.status === 404) {
      detenerPolling();
      notifyWarningRequest("El proceso expiró. Intente nuevamente.");
      return;
    }

    const state = res.data;
    progresoUpload.value = state.percent ?? 0;
    estadoProceso.value  = {
      created:        state.created        ?? 0,
      skippedVirtual: state.skippedVirtual ?? 0,
      errors:         state.errors         ?? 0,
      total:          state.total          ?? 0,
    };

    if (!state.done) return;

    detenerPolling();

    if (state.failed) {
      notifyErrorRequest(state.error || "El proceso terminó con un error inesperado.");
      return;
    }

    resultadoUpload.value = state;
    notifySuccessRequest(state.msg || "Catálogo actualizado exitosamente");
    await nextTick();
    tabActualizacionRef.value?.reset();
  }, 1000);
}
</script>
