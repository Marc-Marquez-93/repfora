<template>
  <div class="gestion-aprendices">
    <HeaderLayout title="Gestión de Aprendices Sancionados" />
    <BtnBack route="/home/comites" />

    <q-page class="q-pa-md q-pa-lg-xl page-container">
      <div class="row items-center justify-between q-mb-lg">
        <div class="text-h4 text-weight-bold text-green-9">Gestión de Aprendices</div>
        <q-input outlined dense v-model="filtro" placeholder="Buscar por nombre o cédula..." class="bg-white" style="width: 300px; border-radius: 8px;">
          <template v-slot:append>
            <q-icon name="search" color="green-9" />
          </template>
        </q-input>
      </div>

      <q-card class="no-shadow border-radius-12 bg-transparent">
        <q-tabs
          v-model="tabActiva"
          dense
          class="tabs-container q-mb-md"
          active-color="green-9"
          indicator-color="white"
          align="justify"
          narrow-indicator
          active-class="active-tab"
        >
          <q-tab name="condicionados" class="tab-with-badge">
            <div class="row items-center q-gutter-sm">
              <q-icon name="warning" size="sm" />
              <span>Condicionados</span>
              <q-badge color="orange" rounded class="q-ml-sm">{{ aprendicesCondicionados.length }}</q-badge>
            </div>
          </q-tab>
          <q-tab name="cancelados" class="tab-with-badge">
            <div class="row items-center q-gutter-sm">
              <q-icon name="block" size="sm" />
              <span>Cancelados</span>
              <q-badge color="red" rounded class="q-ml-sm">{{ aprendicesCancelados.length }}</q-badge>
            </div>
          </q-tab>
        </q-tabs>

        <q-tab-panels v-model="tabActiva" animated class="bg-transparent">
          <q-tab-panel name="condicionados" class="q-pa-none">
            <q-table
              flat bordered
              :rows="aprendicesCondicionados"
              :columns="columnas"
              row-key="_id"
              :filter="filtro"
              :loading="cargando"
              class="table-premium"
              no-data-label="No hay aprendices condicionados"
            >
              <template v-slot:body-cell-resolucion="props">
                <q-td :props="props">
                  <div v-if="props.row.resolucionNumero && props.row.resolucionFecha">
                    <q-chip size="sm" color="green-1" text-color="green-9" icon="description">
                      {{ props.row.resolucionNumero }} ({{ props.row.resolucionFecha }})
                    </q-chip>
                  </div>
                  <div v-else>
                    <q-btn flat dense color="orange-9" icon="warning" label="Completar datos" size="sm" @click="abrirModalEditar(props.row)" />
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-acciones="props">
                <q-td :props="props">
                  <q-btn flat round color="blue-8" icon="edit" size="sm" @click="abrirModalEditar(props.row)">
                    <q-tooltip>Editar Resolución</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="red-8" icon="delete" size="sm" @click="eliminarSancion(props.row, 'CONDICIONAMIENTO')">
                    <q-tooltip>Remover Sanción</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <q-tab-panel name="cancelados" class="q-pa-none">
            <q-table
              flat bordered
              :rows="aprendicesCancelados"
              :columns="columnas"
              row-key="_id"
              :filter="filtro"
              :loading="cargando"
              class="table-premium"
              no-data-label="No hay aprendices con matrícula cancelada"
            >
              <template v-slot:body-cell-resolucion="props">
                <q-td :props="props">
                  <div v-if="props.row.resolucionNumero && props.row.resolucionFecha">
                    <q-chip size="sm" color="red-1" text-color="red-9" icon="description">
                      {{ props.row.resolucionNumero }} ({{ props.row.resolucionFecha }})
                    </q-chip>
                  </div>
                  <div v-else>
                    <q-btn flat dense color="orange-9" icon="warning" label="Completar datos" size="sm" @click="abrirModalEditar(props.row)" />
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-acciones="props">
                <q-td :props="props">
                  <q-btn flat round color="blue-8" icon="edit" size="sm" @click="abrirModalEditar(props.row)">
                    <q-tooltip>Editar Resolución</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="red-8" icon="delete" size="sm" @click="eliminarSancion(props.row, 'CANCELACION')">
                    <q-tooltip>Remover Sanción</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </q-page>

    <!-- Modal Editar Resolución -->
    <q-dialog v-model="modalEditar" persistent>
      <q-card class="dialog-card" style="width: 400px; border-radius: 16px;">
        <q-card-section class="bg-green-9 text-white row items-center">
          <div class="text-subtitle1 text-weight-bold">Datos de Resolución</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div v-if="aprendizEditando" class="q-mb-md">
            <div class="text-subtitle2 text-green-9 text-weight-bold">{{ aprendizEditando.name }}</div>
            <div class="text-caption text-grey-7">{{ aprendizEditando.documentType }}: {{ aprendizEditando.documentNumber }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ aprendizEditando.ficha }}</div>
          </div>
          <q-input filled v-model="resolucionNumeroTemp" label="Número de Resolución *" class="q-mb-md" />
          <q-input filled v-model="resolucionFechaTemp" type="date" label="Fecha de Resolución *" class="q-mb-md" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Guardar" color="green-9" @click="guardarResolucion" :loading="guardando" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { get, put } from "../services/api.js";
import { useQuasar } from "quasar";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import BtnBack from "../layouts/btnBackLayout.vue";

const $q = useQuasar();
const filtro = ref("");
const tabActiva = ref("condicionados");
const cargando = ref(false);
const guardando = ref(false);
const todosLosComites = ref([]);

const modalEditar = ref(false);
const aprendizEditando = ref(null);
const resolucionNumeroTemp = ref("");
const resolucionFechaTemp = ref("");

const columnas = [
  { name: 'documento', align: 'left', label: 'Documento', field: row => `${row.documentType || 'CC'} ${row.documentNumber}`, sortable: true },
  { name: 'nombre', align: 'left', label: 'Nombre Completo', field: 'name', sortable: true },
  { name: 'ficha', align: 'left', label: 'Ficha', field: 'ficha', sortable: true },
  { name: 'resolucion', align: 'left', label: 'Resolución', field: 'resolucion', sortable: true },
  { name: 'acciones', align: 'center', label: 'Acciones', field: 'acciones' }
];

const aprendicesCondicionados = computed(() => {
  return extraerAprendices('CONDICIONAMIENTO');
});

const aprendicesCancelados = computed(() => {
  return extraerAprendices('CANCELACION');
});

function extraerAprendices(tipoDecision) {
  const lista = [];
  for (const comite of todosLosComites.value) {
    if (comite.status === 'COMPLETED' && comite.learners) {
      for (const ev of comite.learners) {
        if (ev.decisiones && ev.decisiones.includes(tipoDecision)) {
          lista.push({
            ...ev,
            comiteId: comite._id,
            ficha: comite.fiche?.number || 'N/A'
          });
        }
      }
    }
  }
  return lista;
}

async function cargarDatos() {
  try {
    cargando.value = true;
    const res = await get("/comites");
    todosLosComites.value = Array.isArray(res) ? res : (res?.data || []);
  } catch (error) {
    console.error("Error cargando comités:", error);
    $q.notify({ message: "Error al cargar los datos", color: "red", position: "top" });
  } finally {
    cargando.value = false;
  }
}

function abrirModalEditar(aprendiz) {
  aprendizEditando.value = aprendiz;
  resolucionNumeroTemp.value = aprendiz.resolucionNumero || "";
  resolucionFechaTemp.value = aprendiz.resolucionFecha || "";
  modalEditar.value = true;
}

async function guardarResolucion() {
  if (!resolucionNumeroTemp.value || !resolucionFechaTemp.value) {
    $q.notify({ message: "Por favor llena ambos campos", color: "red", position: "top" });
    return;
  }

  try {
    guardando.value = true;
    const comite = todosLosComites.value.find(c => c._id === aprendizEditando.value.comiteId);
    if (!comite) return;

    const newEvaluations = [...comite.learners];
    const evIndex = newEvaluations.findIndex(e => e._id === aprendizEditando.value._id);
    
    if (evIndex !== -1) {
      newEvaluations[evIndex].resolucionNumero = resolucionNumeroTemp.value;
      newEvaluations[evIndex].resolucionFecha = resolucionFechaTemp.value;
      newEvaluations[evIndex].resolucionDespues = false;

      await put(`/comites/${comite._id}`, { learners: newEvaluations });
      
      $q.notify({ message: "Resolución actualizada correctamente", color: "green-9", position: "top" });
      modalEditar.value = false;
      await cargarDatos();
    }
  } catch (error) {
    console.error("Error actualizando resolución:", error);
    $q.notify({ message: "Error al actualizar", color: "red", position: "top" });
  } finally {
    guardando.value = false;
  }
}

function eliminarSancion(aprendiz, tipoSancion) {
  $q.dialog({
    title: 'Remover Sanción',
    message: `¿Estás seguro que deseas remover la sanción de ${tipoSancion.toLowerCase()} para ${aprendiz.name}?`,
    ok: { label: 'Sí, remover', color: 'red-9', unelevated: true },
    cancel: { label: 'Cancelar', color: 'grey-7', flat: true }
  }).onOk(async () => {
    try {
      cargando.value = true;
      const comite = todosLosComites.value.find(c => c._id === aprendiz.comiteId);
      if (!comite) return;

      const newEvaluations = [...comite.learners];
      const evIndex = newEvaluations.findIndex(e => e._id === aprendiz._id);
      
      if (evIndex !== -1) {
        // Remove the specific decision
        newEvaluations[evIndex].decisiones = newEvaluations[evIndex].decisiones.filter(d => d !== tipoSancion);
        // Clear resolution data
        newEvaluations[evIndex].resolucionNumero = '';
        newEvaluations[evIndex].resolucionFecha = '';
        newEvaluations[evIndex].resolucionDespues = false;

        await put(`/comites/${comite._id}`, { learners: newEvaluations });
        $q.notify({ message: "Sanción removida correctamente", color: "green-9", position: "top" });
        await cargarDatos();
      }
    } catch (error) {
      console.error("Error al remover sanción:", error);
      $q.notify({ message: "Error al remover la sanción", color: "red", position: "top" });
    } finally {
      cargando.value = false;
    }
  });
}

onMounted(() => {
  cargarDatos();
});
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}

.tabs-container {
  background: linear-gradient(135deg, #2e7d32, #43a047) !important;
  border-radius: 12px;
  overflow: hidden;
}

.tabs-container :deep(.q-tab) {
  color: rgba(255, 255, 255, 0.85) !important;
  font-weight: 500;
  transition: all 200ms ease;
}

.tabs-container :deep(.q-tab:hover) {
  color: white !important;
  background-color: rgba(255, 255, 255, 0.1);
}

.tabs-container :deep(.active-tab) {
  background-color: white !important;
  color: #2e7d32 !important;
  font-weight: 700;
}

.tab-with-badge {
  position: relative;
}

.badge-count {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  min-height: 16px;
  padding: 0 6px;
}

.table-premium {
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  background-color: white;
}

.table-premium :deep(th) {
  background-color: #f5f7fa;
  color: #2e7d32;
  font-weight: bold;
  font-size: 14px;
}
</style>
