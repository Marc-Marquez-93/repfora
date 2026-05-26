<template>
  <div>
    <BtnBack route="/home/instructor" />

    <HeaderLayout
      :title="
        tab == 'catalogo'
          ? 'Catálogo'
          : tab == 'solicitud'
            ? 'Registro de solicitud'
            : 'Historial de registros'
      "
    />

    <q-tabs
      v-model="tab"
      class="q-mx-lg text-weight-bolder row"
      dense
      align="justify"
      active-color="lime-2"
      active-bg-color="green-9"
      indicator-color="black"
    >
      <q-tab
        class="text-green-9 bg-white col-4"
        name="catalogo"
        icon="menu_book"
        :label="$q.screen.lt.sm ? '' : 'Catálogo'"
      />
      <q-tab
        class="text-green-9 bg-white col-4"
        name="solicitud"
        icon="edit_note"
        :label="$q.screen.lt.sm ? '' : 'Registro de solicitud'"
      />
      <q-tab
        class="text-green-9 bg-white col-4"
        name="historial"
        icon="history"
        :label="$q.screen.lt.sm ? '' : 'Historial de registros'"
      />
    </q-tabs>

    <q-tab-panels v-model="tab" keep-alive>
      <!-- Tab Catálogo -->
      <q-tab-panel class="q-px-lg" name="catalogo">
        <TabCatalogo :mostrar-confirmar="true" @confirm="confirmarCurso" />
      </q-tab-panel>

      <!-- Tab Registro de solicitud -->
      <q-tab-panel class="q-px-lg" name="solicitud">
        <div class="row q-mt-md">
          <div class="col-12">
            <FormRegistroSolicitud
              v-model="formData"
              :loading="loadingSolicitud"
              :environments="[]"
              :coordinadores="coordinadores"
              @submit="enviarSolicitud"
              @limpiar-curso="onLimpiarCurso"
            />
          </div>
        </div>
      </q-tab-panel>

      <!-- Tab Historial de registros -->
      <q-tab-panel class="q-px-lg" name="historial">
        <TabListadoSolicitudes ref="tabHistorialRef" modo="instructor" />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup>
// ═══ IMPORTS ══════════════════════════════════════════════════════════════════
import { ref, onMounted, nextTick } from "vue";
import { get, post } from "../services/api.js";
import { storeUser } from "../store/users.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import FormRegistroSolicitud from "../components/Complementarys/FormRegistroSolicitud.vue";
import TabCatalogo from "../components/Complementarys/TabCatalogo.vue";
import TabListadoSolicitudes from "../components/Complementarys/TabListadoSolicitudes.vue";
import { notifySuccessRequest } from "../common/notify.js";

// ═══ STORE & ESTADO GLOBAL ════════════════════════════════════════════════════
const useStore = storeUser();
const tab = ref("catalogo");
const tabHistorialRef = ref(null);
const coordinadores     = ref([]);
const loadingCoord      = ref(false);

// ══════════════════════════════════════════════════════════════════════════════
// TAB: CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════

async function confirmarCurso(course) {
  // Precarga los datos del curso en el formData antes de navegar al tab
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

// ─── formData inicializado con fecha/hora actual y datos del instructor ────────
function crearFormDataInicial() {
  const now = new Date();
  const i = useStore.instructorData || {};
  return {
    fechaRegistro:           now.toISOString().slice(0, 10),
    horaRegistro:            now.toTimeString().slice(0, 5),
    catalogCourse:           "",
    prfCodigo:               "",
    prfVersion:              "",
    prfDuracionMaxima:       null,
    prfDenominacion:         "",
    tipoPrograma:            "",
    numAprendices:           null,
    tipoPoblacion:           "",
    proyectoAsociado:        "",
    coordinator:             "",
    nombreInstructor:        i.name          || "",
    cedulaInstructor:        i.numdocument   || "",
    telefonoInstructor:      i.phone         || "",
    correoInstructor:        i.email         || "",
    correoPersonalInstructor: i.emailpersonal || "",
    municipio:               "",
    vereda:                  "",
    direccion:               "",
    nombreEmpresa:           "",
    nitEmpresa:              "",
    contactoEmpresa:         "",
    telefonoEmpresa:         "",
    fechaInicio:             "",
    fechaFin:                "",
    fechaInscripcion:        "",
    fechaMatriculaInicio:    "",
    fechaMatriculaFin:       "",
    competencies:            "",
    outcomes:                "",
    learningActivity:        "",
    requisitosIngreso:       "",
    recursosNecesarios:      "",
    environment:             "",
    formationDocument:       null,
    codigoSolicitud:         "",
    fichaCaracterizacion:    "",
    sesiones:                [],
  };
}

const formData = ref(crearFormDataInicial());

// ─── Cuando el componente solicita limpiar el curso ───────────────────────────
function onLimpiarCurso() {
  formData.value.catalogCourse     = "";
  formData.value.prfCodigo         = "";
  formData.value.prfVersion        = "";
  formData.value.prfDuracionMaxima = null;
  formData.value.prfDenominacion   = "";
  formData.value.requisitosIngreso = "";
  formData.value.sesiones          = [];
}

// ─── Envío ────────────────────────────────────────────────────────────────────
async function enviarSolicitud(payload) {
  loadingSolicitud.value = true;
  try {
    const res = await post("/complementary/requests/register", payload);
    if (res?.msg) notifySuccessRequest(res.msg);
    tabHistorialRef.value?.resetCache();
  } catch (err) {
    console.log("=== [solicitud] error:", err?.response?.data);
  } finally {
    loadingSolicitud.value = false;
  }
}

// ═══ INIT ═════════════════════════════════════════════════════════════════════
onMounted(async () => {
  try {
    await get("/complementary/catalog", { status: 0 });
  } catch {}
  loadingCoord.value = true;
  try {
    const res = await get("/complementary/coordinator");
    const raw = res?.data ?? res;
    coordinadores.value = Array.isArray(raw) ? raw : [];
  } catch {}
  loadingCoord.value = false;
});
</script>
