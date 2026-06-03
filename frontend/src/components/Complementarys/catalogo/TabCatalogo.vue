<template>
  <div>
    <q-banner v-if="catalogUpdateAlert" class="bg-orange-1 text-orange-9 q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="warning" color="orange" />
      </template>
      El catálogo puede estar desactualizado. Última carga: {{ formatDate(lastUploadDate) }}
    </q-banner>

    <div class="row q-col-gutter-md q-mt-sm">

      <!-- Panel izquierdo: última actualización + filtros -->
      <div class="col-12 col-md-3">
        <div class="q-mb-sm">
          <div class="ultima-actualizacion full-width">
            <q-icon name="update" color="green-9" size="16px" class="q-mr-xs" />
            <span class="ultima-label">ÚLTIMA ACTUALIZACIÓN</span>
            <div class="ultima-fecha">
              {{ lastUploadDate ? formatDate(lastUploadDate) : 'Sin registros' }}
            </div>
          </div>
        </div>

        <CourseFilters
          v-model="activeFilters"
          :config="FILTER_CONFIG"
          :courses="allCourses"
          :counts="filterCounts"
        />
      </div>

      <!-- Panel derecho: buscador, chips, listado y paginación -->
      <div class="col-12 col-md-9">

        <div class="row q-gutter-sm q-mb-md">
          <q-input
            v-model="search"
            label="Buscar por nombre o código del curso"
            outlined dense clearable class="col"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-select
            v-model="sortOrder"
            :options="SORT_OPTIONS"
            outlined dense emit-value map-options
            color="green-9" class="sort-select" label="Ordenar"
          >
            <q-tooltip v-if="!hasSearched" anchor="top middle" self="bottom middle">
              Realiza una búsqueda primero
            </q-tooltip>
          </q-select>
        </div>

        <!-- Chips de filtros activos -->
        <div v-if="tieneChipsFiltros" class="row q-gutter-sm q-mb-md">
          <q-chip
            v-for="(value, field) in activeFilterChips" :key="field"
            :label="getFilterLabel(field, value)"
            removable @remove="removeFilter(field)"
            color="green-9" text-color="white" size="sm"
          />
        </div>

        <!-- Estado vacío inicial -->
        <div v-if="!hasSearched && !loading" class="text-center q-pa-xl">
          <q-icon name="manage_search" size="64px" color="grey-4" />
          <div class="text-grey-5 q-mt-md" style="font-size: 20px; font-weight: 600">Sin registros aún</div>
          <div class="text-grey-4 q-mt-xs" style="font-size: 14px">Usa el buscador o aplica un filtro para ver los cursos</div>
        </div>

        <!-- Sin resultados -->
        <div v-else-if="hasSearched && cursosFiltrados.length === 0 && !loading" class="text-center q-pa-xl">
          <q-icon name="search_off" size="64px" color="grey-4" />
          <div class="text-grey-6 q-mt-md" style="font-size: 16px">No se encontraron cursos con los criterios aplicados</div>
        </div>

        <!-- Contador de resultados -->
        <div v-if="hasSearched && !loading" class="text-grey-7 q-mb-md" style="font-size: 14px">
          {{ cursosFiltrados.length }}
          {{ cursosFiltrados.length === 1 ? 'curso encontrado' : 'cursos encontrados' }}
        </div>

        <!-- Listado -->
        <div style="position: relative; min-height: 100px">
          <div class="column q-gutter-sm">
            <div v-for="course in cursosPagina" :key="course._id" class="col-12">
              <ItemCard
                :title="course.prfDenominacion"
                :badges="[{ label: course.modalidad, bgClass: course.modalidad === 'Presencial' ? 'bg-green-1 text-green-9' : 'bg-blue-1 text-blue-9' }]"
                :meta="[
                  { icon: 'school',    text: course.tipoFormacion },
                  { icon: 'schedule',  text: course.prfDuracionMaxima + ' horas' },
                  { icon: 'park',      text: course.redConocimiento },
                ]"
                :loading="loadingCurso === course._id"
                @select="openDialog(course)"
              />
            </div>
          </div>
          <q-inner-loading :showing="loading">
            <q-spinner-gears size="50px" color="green-9" />
          </q-inner-loading>
        </div>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="q-mt-lg flex justify-center">
          <q-pagination
            v-model="page" :max="totalPages" :max-pages="5"
            direction-links flat color="green-9" active-color="green-9"
          />
        </div>
      </div>
    </div>

    <!-- Dialog detalle del curso -->
    <DialogCursoDetalle
      v-if="selectedCourse"
      v-model="dialogOpen"
      :course="selectedCourse"
      :show-confirm="mostrarConfirmar"
      @confirm="confirmarCurso"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { get } from "../../../services/api.js";
import ItemCard from "../shared/ItemCard.vue";
import CourseFilters from "../shared/CourseFilters.vue";
import DialogCursoDetalle from "../shared/DialogCursoDetalle.vue";

const props = defineProps({
  mostrarConfirmar: { type: Boolean, default: true },
});

const emit = defineEmits(["confirm"]);

const PAGE_SIZE = 11;

const FILTER_CONFIG = [
  { field: "modalidad",           label: "Modalidad",            type: "checkbox" },
  { field: "lineaTecnologica",    label: "Línea Tecnológica",    type: "checkbox" },
  { field: "redConocimiento",     label: "Red de Conocimiento",  type: "checkbox" },
  { field: "apuestasPrioritarias",label: "Apuestas Prioritarias",type: "checkbox" },
  { field: "prfDuracionMaxima",   label: "Duración",             type: "hours-range", min: 0, max: 2200 },
];

const SORT_OPTIONS = [
  { label: "Horas: menor a mayor", value: "horas_asc"   },
  { label: "Horas: mayor a menor", value: "horas_desc"  },
  { label: "Nombre: A → Z",        value: "nombre_asc"  },
  { label: "Nombre: Z → A",        value: "nombre_desc" },
];

const allCourses         = ref([]);
const courses            = ref([]);
const loading            = ref(false);
const catalogUpdateAlert = ref(false);
const lastUploadDate     = ref(null);
const dialogOpen         = ref(false);
const selectedCourse     = ref(null);
const activeFilters      = ref({});
const search             = ref("");
const sortOrder          = ref(null);
const page               = ref(1);
const hasSearched        = ref(false);
const loadingCurso       = ref(null);

/* Carga el catálogo completo para tener los datos de los conteos de filtros */
async function iniciarCatalogo() {
  loading.value = true;
  try {
    const res = await get("/complementary/catalog", { status: 0 });
    allCourses.value        = res.data;
    catalogUpdateAlert.value = res.catalogUpdateAlert;
    lastUploadDate.value    = res.lastUploadDate;
  } catch {}
  loading.value = false;
}

/* Busca cursos por nombre o código en el backend */
async function fetchCat(searchText = "") {
  loading.value = true;
  const params = { status: 0 };
  if (searchText) {
    const isNumeric = /^\d+$/.test(searchText.trim());
    if (isNumeric) params.prfCodigo      = searchText.trim();
    else           params.prfDenominacion = searchText.trim();
  }
  try {
    const res = await get("/complementary/catalog", params);
    courses.value = res.data;
  } catch {}
  loading.value = false;
}

function matchCheckbox(course, field) {
  const val = activeFilters.value[field];
  if (!val || val.length === 0) return true;
  return val.includes(course[field]);
}

function matchHoursRange(course, field) {
  const cfg = FILTER_CONFIG.find((f) => f.field === field);
  const min = activeFilters.value[field + "Min"] ?? cfg?.min ?? 0;
  const max = activeFilters.value[field + "Max"] ?? cfg?.max ?? 2200;
  const h   = course[field];
  if (h == null) return true;
  return h >= min && h <= max;
}

function removeFilter(field) {
  const updated = { ...activeFilters.value };
  const cfg = FILTER_CONFIG.find((f) => f.field === field);
  if (cfg?.type === "checkbox")    updated[field] = [];
  else if (cfg?.type === "hours-range") {
    updated[field + "Min"] = cfg.min;
    updated[field + "Max"] = cfg.max;
  }
  activeFilters.value = updated;
}

function getFilterLabel(field, value) {
  const cfg   = FILTER_CONFIG.find((f) => f.field === field);
  const label = cfg?.label || field;
  return Array.isArray(value) ? `${label}: ${value.join(", ")}` : `${label}: ${value}`;
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-CO", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const tieneAlgunFiltro = computed(() => {
  const hayCheckbox = FILTER_CONFIG
    .filter((f) => f.type === "checkbox")
    .some((f) => (activeFilters.value[f.field] || []).length > 0);
  const cfgHoras = FILTER_CONFIG.find((f) => f.type === "hours-range");
  const hayHoras = cfgHoras && (
    (activeFilters.value[cfgHoras.field + "Min"] !== undefined && activeFilters.value[cfgHoras.field + "Min"] !== cfgHoras.min) ||
    (activeFilters.value[cfgHoras.field + "Max"] !== undefined && activeFilters.value[cfgHoras.field + "Max"] !== cfgHoras.max)
  );
  return hayCheckbox || hayHoras;
});

/* Aplica filtros de checkbox y rango de horas sobre los cursos cargados */
const cursosFiltrados = computed(() => {
  const base = courses.value.length > 0
    ? courses.value
    : tieneAlgunFiltro.value ? allCourses.value : [];
  const q = search.value?.toLowerCase();
  return base.filter((course) => {
    const coincideBusqueda = !q ||
      course.prfDenominacion?.toLowerCase().includes(q) ||
      String(course.prfCodigo).includes(q);
    return (
      coincideBusqueda &&
      matchCheckbox(course, "modalidad") &&
      matchCheckbox(course, "lineaTecnologica") &&
      matchCheckbox(course, "redConocimiento") &&
      matchCheckbox(course, "apuestasPrioritarias") &&
      matchHoursRange(course, "prfDuracionMaxima")
    );
  });
});

/* Conteos por valor de campo para mostrar al lado del checkbox */
const filterCounts = computed(() => {
  const counts = {};
  FILTER_CONFIG.forEach((f) => {
    if (f.type !== "checkbox") return;
    counts[f.field] = {};
    allCourses.value.forEach((c) => {
      const val = c[f.field];
      if (val) counts[f.field][val] = (counts[f.field][val] || 0) + 1;
    });
  });
  return counts;
});

const activeFilterChips = computed(() => {
  const chips = {};
  FILTER_CONFIG.forEach(({ field }) => {
    const val = activeFilters.value[field];
    if (Array.isArray(val) && val.length > 0) chips[field] = val;
  });
  return chips;
});

const tieneChipsFiltros = computed(() => Object.keys(activeFilterChips.value).length > 0);

const cursosOrdenados = computed(() => {
  const list = [...cursosFiltrados.value];
  if (sortOrder.value === "horas_asc")   return list.sort((a, b) => a.prfDuracionMaxima - b.prfDuracionMaxima);
  if (sortOrder.value === "horas_desc")  return list.sort((a, b) => b.prfDuracionMaxima - a.prfDuracionMaxima);
  if (sortOrder.value === "nombre_asc")  return list.sort((a, b) => a.prfDenominacion.localeCompare(b.prfDenominacion));
  if (sortOrder.value === "nombre_desc") return list.sort((a, b) => b.prfDenominacion.localeCompare(a.prfDenominacion));
  return list;
});

const cursosPagina = computed(() =>
  cursosOrdenados.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
);

const totalPages = computed(() => Math.ceil(cursosOrdenados.value.length / PAGE_SIZE));

async function openDialog(course) {
  loadingCurso.value = course._id;
  try {
    const res = await get(`/complementary/catalog/${course._id}`);
    selectedCourse.value = res || course; // get() ya devuelve r.data
  } catch {
    selectedCourse.value = course;
  }
  loadingCurso.value = null;
  dialogOpen.value   = true;
}

function confirmarCurso(course) {
  dialogOpen.value = false;
  emit("confirm", course);
}

let debounceTimer = null;

function triggerSearch() {
  const hasQuery = search.value || tieneAlgunFiltro.value;
  if (!hasQuery) {
    courses.value     = [];
    hasSearched.value = false;
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    hasSearched.value = true;
    await fetchCat(search.value);
    page.value = 1;
  }, 400);
}

watch(search, triggerSearch);
watch(
  activeFilters,
  () => {
    if (tieneAlgunFiltro.value) hasSearched.value = true;
    page.value = 1;
  },
  { deep: true },
);

onMounted(() => { iniciarCatalogo(); });
</script>

<style scoped>
.sort-select { min-width: 170px; }

.ultima-actualizacion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: #f1f8e9;
  border: 1px solid #a5d6a7;
  border-left: 4px solid #2e7d32;
  border-radius: 6px;
  padding: 8px 12px;
}
.ultima-label {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  letter-spacing: 0.6px;
}
.ultima-fecha {
  font-size: 12px;
  font-weight: 500;
  color: #388e3c;
  margin-top: 2px;
}
</style>
