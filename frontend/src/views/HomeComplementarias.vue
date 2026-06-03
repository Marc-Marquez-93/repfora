<template>
  <div>
    <BtnBack route="/home/instructor" />
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
      <q-tab class="text-green-9 bg-white col-4" name="catalogo"  icon="menu_book"  :label="$q.screen.lt.sm ? '' : 'Catálogo'" />
      <q-tab class="text-green-9 bg-white col-4" name="solicitud" icon="edit_note"  :label="$q.screen.lt.sm ? '' : 'Registro de solicitud'" />
      <q-tab class="text-green-9 bg-white col-4" name="historial" icon="history"    :label="$q.screen.lt.sm ? '' : 'Historial de registros'" />
    </q-tabs>

    <q-tab-panels v-model="tab" keep-alive>

      <!-- ═══ TAB: CATÁLOGO ═══ -->
      <q-tab-panel class="q-px-lg" name="catalogo">
        <TabCatalogo :mostrar-confirmar="true" @confirm="confirmarCurso" />
      </q-tab-panel>

      <!-- ═══ TAB: REGISTRO DE SOLICITUD ═══ -->
      <q-tab-panel class="q-px-lg" name="solicitud">
        <div class="row q-mt-md">
          <div class="col-12">
            <FormRegistroSolicitud
              v-model="formData"
              :loading="loadingSolicitud"
              :environments="[]"
              :coordinadores="[]"
              :supervisores="supervisores"
              :campesenas="campesenas"
              :hide-fechas="true"
              @submit="enviarSolicitud"
              @limpiar-curso="onLimpiarCurso"
            />
          </div>
        </div>
      </q-tab-panel>

      <!-- ═══ TAB: HISTORIAL DE REGISTROS ═══ -->
      <q-tab-panel class="q-px-lg" name="historial">
        <TabListadoSolicitudes ref="tabHistorialRef" modo="instructor" />
      </q-tab-panel>

    </q-tab-panels>
  </div>
</template>

<script setup>
// ═══ IMPORTS ══════════════════════════════════════════════════════════════════
import { ref, computed, onMounted, nextTick } from "vue";
import { get, post } from "../services/api.js";
import { storeUser } from "../store/users.js";
import { useQuasar } from "quasar";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import FormRegistroSolicitud from "../components/Complementarys/solicitudes/FormRegistroSolicitud.vue";
import TabCatalogo from "../components/Complementarys/catalogo/TabCatalogo.vue";
import TabListadoSolicitudes from "../components/Complementarys/solicitudes/TabListadoSolicitudes.vue";

// ═══ ESTADO GLOBAL ════════════════════════════════════════════════════════════
const $q       = useQuasar();
const useStore = storeUser();
const tab             = ref("catalogo");
const tabHistorialRef = ref(null);
const supervisores    = ref([]);
const campesenas      = ref([]);

const tituloTab = computed(() => {
  if (tab.value === "catalogo")  return "Catálogo";
  if (tab.value === "solicitud") return "Registro de solicitud";
  return "Historial de registros";
});

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════

/* Precarga el formulario con los datos del curso seleccionado y navega al tab de registro */
async function confirmarCurso(course) {
  formData.value.catalogCourse     = course._id || "";
  formData.value.prfCodigo         = course.prfCodigo || "";
  formData.value.prfVersion        = course.prfVersion || "";
  formData.value.prfDuracionMaxima = course.prfDuracionMaxima || null;
  formData.value.prfDenominacion   = course.prfDenominacion || "";
  formData.value.requisitosIngreso = course.prfDescripcionRequisito || "";
  formData.value.sesiones          = [];
  await nextTick();
  tab.value = "solicitud";
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: REGISTRO DE SOLICITUD
// ══════════════════════════════════════════════════════════════════════════════

const loadingSolicitud = ref(false);

/* Genera el estado inicial del formulario con fecha/hora actual y datos del instructor autenticado */
function crearFormDataInicial() {
  const now = new Date();
  const i   = useStore.instructorData || {};
  return {
    fechaRegistro:            now.toISOString().slice(0, 10),
    horaRegistro:             now.toTimeString().slice(0, 5),
    catalogCourse:            "",
    prfCodigo:                "",
    prfVersion:               "",
    prfDuracionMaxima:        null,
    prfDenominacion:          "",
    tipoPrograma:             "",
    numAprendices:            null,
    tipoPoblacion:            "",
    coordinator:              "",
    nombreInstructor:         i.name          || "",
    cedulaInstructor:         i.numdocument   || "",
    telefonoInstructor:       i.phone         || "",
    correoInstructor:         i.email         || "",
    correoPersonalInstructor: i.emailpersonal || "",
    municipio:                "",
    vereda:                   "",
    direccion:                "",
    nombreEmpresa:            "",
    nitEmpresa:               "",
    contactoEmpresa:          "",
    telefonoEmpresa:          "",
    fechaInicio:              "",
    fechaFin:                 "",
    fechaInscripcion:         "",
    fechaMatriculaInicio:     "",
    fechaMatriculaFin:        "",
    competencies:             "",
    outcomes:                 "",
    learningActivity:         "",
    requisitosIngreso:        "",
    recursosNecesarios:       "",
    environment:              "",
    formationDocument:        null,
    codigoSolicitud:          "",
    fichaCaracterizacion:     "",
    numeroSolicitud:          "",
    supervisor:               "",
    campesena:                "",
    ambienteNombre:           "",
    ambienteDireccion:        "",
    sesiones:                 [],
  };
}

const formData = ref(crearFormDataInicial());

function onLimpiarCurso() {
  formData.value.catalogCourse     = "";
  formData.value.prfCodigo         = "";
  formData.value.prfVersion        = "";
  formData.value.prfDuracionMaxima = null;
  formData.value.prfDenominacion   = "";
  formData.value.requisitosIngreso = "";
  formData.value.sesiones          = [];
}

async function enviarSolicitud(payload) {
  loadingSolicitud.value = true;
  try {
    const res = await post("/complementary/requests/register", payload);
    $q.dialog({
      title:   "Solicitud registrada",
      message: "Solicitud registrada con éxito.",
      html:   true,
      ok:     { label: "Ver historial",   color: "green-9", unelevated: true },
      cancel: { label: "Nueva solicitud", flat: true, color: "grey-7" },
    }).onOk(() => { tab.value = "historial"; });
    formData.value = crearFormDataInicial();
    tabHistorialRef.value?.resetCache();
  } catch {}
  finally {
    loadingSolicitud.value = false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: HISTORIAL — lógica delegada a TabListadoSolicitudes vía ref
// ══════════════════════════════════════════════════════════════════════════════

// ═══ INIT ═════════════════════════════════════════════════════════════════════
onMounted(async () => {
  try {
    /* Precalentamiento: carga el catálogo para que los conteos de filtros estén disponibles al entrar al tab */
    await get("/complementary/catalog", { status: 0 });
  } catch {}
  try {
    const res = await get("/complementary/coordinators")
    supervisores.value = Array.isArray(res) ? res : []
  } catch {}
  try {
    const res = await get("/complementary/campesenas")
    campesenas.value = Array.isArray(res) ? res : []
  } catch {}
});
</script>
