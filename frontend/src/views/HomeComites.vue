<template>
  <div>
    <!-- ========== VISTA NOVEDADES: Dashboard con tarjetas ========== -->
    <div v-if="isNovedades" class="comites-dashboard">
      <BtnBack route="/home" />
      <HeaderLayout title="Panel de Comités" />

      <div class="dashboard-cards-container">
        <div class="dashboard-card" @click="router.push('/home/comites/gestion')">
          <div class="dashboard-card-icon">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="dashboard-card-content">
            <h3>Gestión de Comités</h3>
            <p>Administra y gestiona los comités evaluadores</p>
          </div>
          <div class="dashboard-card-arrow">
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <div class="dashboard-card" @click="router.push('/home/comites/aprendices')">
          <div class="dashboard-card-icon">
            <span class="material-symbols-outlined">school</span>
          </div>
          <div class="dashboard-card-content">
            <h3>Gestión de Aprendices</h3>
            <p>Consulta y administra la información de aprendices</p>
          </div>
          <div class="dashboard-card-arrow">
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== VISTA INSTRUCTOR: Contenido original ========== -->
    <div v-else>
    <!-- 1. Botón volver -->
    <BtnBack route="/home/instructor" />

    <!-- 2. Título de sección -->
    <HeaderLayout title="Gestión de Comités" />

    <!-- 3. Barra superior: botón Crear -->
    <div class="row justify-center q-mb-md">
      <div class="col-sm-2 col-md-1 col-12 justify-center flex justify-sm-start">
        <q-btn class="bg-green-9 text-white" @click="abrirDialogCrear">
          <span class="material-symbols-outlined q-mr-sm" style="font-size: 20px">
            add_circle
          </span>
          Crear
        </q-btn>
      </div>
    </div>

    <!-- 4. Tabla de Comités -->
    <div class="row q-mt-md">
      <div class="col-12 q-mb-lg">
        <q-table
          flat
          bordered
          no-data-label="Sin registros aún"
          :rows="comitesRows"
          :columns="comitesColumns"
          row-key="_id"
          class="q-mx-md my-sticky-header-table"
          rows-per-page-label="Numero de documentos"
          :rows-per-page-options="[0]"
          :pagination="{ rowsPerPage: 0 }"
        >
          <!-- Columna Ficha -->
          <template v-slot:body-cell-ficha="props">
            <q-td :props="props">
              <div>
                <span class="text-weight-bold text-green-9">{{ props.row.ficha }}</span>
                <span class="q-ml-xs text-grey-7">- {{ props.row.nombrePrograma }}</span>
              </div>
            </q-td>
          </template>

          <!-- Columna Fecha Creación -->
          <template v-slot:body-cell-fechaCreacion="props">
            <q-td :props="props">
              <div v-if="props.row.createdAt">
                {{ formatDate(props.row.createdAt) }}
              </div>
              <div v-else class="text-grey-5">N/A</div>
            </q-td>
          </template>

          <!-- Columna Fecha Agendamiento -->
          <template v-slot:body-cell-fechaAgendamiento="props">
            <q-td :props="props">
              <div>
                <span v-if="props.row.meetingDate">{{ formatDate(props.row.meetingDate) }}</span>
                <span v-else class="text-grey-5">Pendiente</span>
              </div>
            </q-td>
          </template>

          <!-- Columna ID Comité -->
          <template v-slot:body-cell-idComite="props">
            <q-td :props="props">
              <div class="text-caption text-grey-7">
                COM-{{ String(props.row._id).slice(-6).toUpperCase() }}
              </div>
            </q-td>
          </template>

          <!-- Columna Estado -->
          <template v-slot:body-cell-estado="props">
            <q-td :props="props">
              <div>
                <q-badge v-if="props.row.status === 'COMPLETED'" class="bg-green-10">
                  COMPLETADO
                </q-badge>
                <q-badge v-else-if="props.row.status === 'SCHEDULED'" class="bg-green-10">
                  PROGRAMADO
                </q-badge>
                <q-badge v-else-if="props.row.status === 'PENDING'" class="bg-grey-5">
                  PENDIENTE
                </q-badge>
                <q-badge v-else class="bg-red">
                  CANCELADO
                </q-badge>
              </div>
            </q-td>
          </template>

          <!-- Columna Acciones -->
          <template v-slot:body-cell-acciones="props">
            <q-td :props="props">
              <div class="row q-gutter-xs justify-end">
                <!-- Ver Datos -->
                <q-btn
                  round
                  size="xs"
                  color="green-10"
                  icon="visibility"
                  @click="verDatos(props.row)"
                >
                  <q-tooltip>Ver datos del comité</q-tooltip>
                </q-btn>

                <!-- Cancelar (solo pendientes) -->
                <q-btn
                  v-if="props.row.status === 'PENDING'"
                  round
                  size="xs"
                  color="red"
                  icon="cancel"
                  @click="cancelarComite(props.row)"
                >
                  <q-tooltip>Cancelar comité</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- 5. Dialog: Wizard Crear Comité -->
    <q-dialog v-model="prompt" persistent>
      <q-card style="width: 1100px; max-width: 98vw; height: 90vh;">
        <q-card-section class="bg-green-9 q-px-lg">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
                CREAR COMITÉ
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" @click="cerrarDialog" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none" style="height: calc(90vh - 100px); overflow-y: auto;">
          <q-stepper v-model="step" ref="stepper" color="green-9" animated flat>
            <!-- PASO 1: Ficha e Instructores -->
            <q-step
              :name="1"
              title="Ficha e Instructores"
              icon="badge"
              :done="step > 1"
              class="q-py-md"
            >
              <!-- Sección Ficha -->
              <div class="q-mb-xl">
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">badge</span>
                  Ficha del Programa
                </div>

                <!-- Ficha seleccionada -->
                <div v-if="wizardData.ficha" class="q-mb-md">
                  <q-card flat bordered class="bg-green-1">
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="check_circle" color="green-9" size="32px" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold text-green-9">{{ wizardData.ficha }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round color="red" icon="delete" @click="eliminarFicha" />
                      </q-item-section>
                    </q-item>
                  </q-card>
                </div>

                <!-- Búsqueda de ficha -->
                <div v-else>
                  <div class="row q-col-gutter-sm q-mb-sm">
                    <div class="col-12 col-md-10">
                      <q-input
                        filled
                        v-model="busquedaFicha"
                        label="Número de ficha..."
                        @keyup.enter="buscarFichaBtn"
                        :loading="loadingFichas"
                        clearable
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">search</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-2">
                      <q-btn
                        class="bg-green-9 text-white full-height"
                        label="Buscar"
                        @click="buscarFichaBtn"
                        :loading="loadingFichas"
                      />
                    </div>
                  </div>
                </div>

                <!-- Resultados de fichas -->
                <div v-if="fichasResultados.length > 0" class="q-mt-sm">
                  <q-card flat bordered>
                    <q-card-section class="bg-grey-3 q-pa-sm">
                      <div class="text-caption text-grey-7">Selecciona una ficha:</div>
                    </q-card-section>
                    <q-list separator>
                      <q-item
                        v-for="ficha in fichasResultados"
                        :key="ficha._id"
                        clickable
                        @click="seleccionarFicha(ficha)"
                        class="q-pa-md"
                      >
                        <q-item-section avatar>
                          <q-icon name="badge" color="green-9" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-bold text-green-9">{{ ficha.number }}</q-item-label>
                          <q-item-label caption>{{ ficha.program?.name || 'Sin nombre' }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="add_circle" color="green-9" size="28px" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>

                <!-- Sin resultados -->
                <q-banner v-else-if="busquedaFichaRealizada && !loadingFichas" class="bg-orange-1 text-orange-9 q-mt-sm">
                  <template v-slot:avatar>
                    <q-icon name="info" />
                  </template>
                  No se encontraron fichas con ese número
                </q-banner>
              </div>

              <!-- Sección Instructores -->
              <div>
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">groups</span>
                  Instructores Involucrados
                  <q-badge :label="wizardData.instructores.length" color="green-9" class="q-ml-md" />
                </div>

                <!-- Instructores agregados -->
                <div v-if="wizardData.instructores.length > 0" class="q-mb-md">
                  <q-card flat bordered class="bg-green-1">
                    <q-card-section class="bg-green-2 q-pa-sm">
                      <div class="text-caption text-green-9">Instructores agregados:</div>
                    </q-card-section>
                    <q-list separator>
                      <q-item
                        v-for="instructor in wizardData.instructores"
                        :key="instructor._id"
                        class="q-pa-sm"
                      >
                        <q-item-section avatar>
                          <q-icon name="person" color="green-9" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                          <q-item-label caption>{{ instructor.tpdocument || 'CC' }}: {{ instructor.numdocument }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-btn flat round color="red" icon="close" @click="eliminarInstructor(instructor._id)" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>

                <!-- Búsqueda de instructores -->
                <div class="row q-col-gutter-sm q-mb-sm">
                  <div class="col-12 col-md-10">
                    <q-input
                      filled
                      v-model="busquedaInstructor"
                      label="Nombre o cédula del instructor..."
                      @keyup.enter="buscarInstructorBtn"
                      :loading="loadingInstructores"
                      clearable
                    >
                      <template v-slot:prepend>
                        <span class="material-symbols-outlined">person_search</span>
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-2">
                    <q-btn
                      class="bg-green-9 text-white full-height"
                      label="Buscar"
                      @click="buscarInstructorBtn"
                      :loading="loadingInstructores"
                    />
                  </div>
                </div>

                <!-- Resultados de instructores -->
                <div v-if="instructoresResultados.length > 0" class="q-mt-sm">
                  <div class="row items-center q-mb-sm">
                    <div class="col text-caption text-grey-7">
                      Resultados encontrados (haz clic para agregar)
                    </div>
                    <div class="col-auto">
                      <q-btn
                        flat
                        dense
                        round
                        icon="close"
                        color="red"
                        @click="cerrarResultadosInstructores"
                      >
                        <q-tooltip>Cerrar resultados</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                  <q-card flat bordered>
                    <q-list separator>
                      <q-item
                        v-for="instructor in instructoresResultados"
                        :key="instructor._id"
                        clickable
                        @click="agregarInstructor(instructor)"
                        class="q-pa-md"
                      >
                        <q-item-section avatar>
                          <q-icon name="person" color="green-9" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                          <q-item-label caption>{{ instructor.tpdocument || 'CC' }}: {{ instructor.numdocument }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="add_circle" color="green-9" size="28px" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>

                <!-- Sin resultados -->
                <q-banner v-else-if="busquedaInstructorRealizada && !loadingInstructores" class="bg-orange-1 text-orange-9 q-mt-sm">
                  <template v-slot:avatar>
                    <q-icon name="info" />
                  </template>
                  No se encontraron instructores con esa búsqueda
                </q-banner>
              </div>

              <!-- Botones de navegación Paso 1 -->
              <div class="row q-mt-xl justify-end">
                <q-btn
                  flat
                  @click="validarPaso1"
                  class="bg-green-9 text-white"
                  label="Siguiente"
                  size="md"
                />
              </div>
            </q-step>

            <!-- PASO 2: Datos del Aprendiz -->
            <q-step
              :name="2"
              title="Datos del Aprendiz"
              icon="person_add"
              :done="step > 2"
              class="q-py-md"
            >
              <!-- Resumen de aprendices -->
              <div class="q-mb-xl">
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">group</span>
                  Aprendices del Comité
                  <q-badge :label="wizardData.aprendices.length" color="green-9" class="q-ml-md" />
                </div>

                <!-- Aprendices agregados (estilo fichas) -->
                <div v-if="wizardData.aprendices.length > 0">
                  <q-card flat bordered class="bg-green-1">
                    <q-card-section class="bg-green-2 q-pa-sm">
                      <div class="text-caption text-green-9">Aprendices agregados al comité:</div>
                    </q-card-section>
                    <q-list separator>
                      <q-item
                        v-for="aprendiz in wizardData.aprendices"
                        :key="aprendiz.id"
                        class="q-pa-md"
                      >
                        <q-item-section avatar>
                          <q-icon name="person" color="green-9" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-bold">{{ aprendiz.fullname }}</q-item-label>
                          <q-item-label caption>{{ aprendiz.documentType }}: {{ aprendiz.documentNumber }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-btn flat round color="red" icon="close" @click="eliminarAprendiz(aprendiz.id)" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>

                <!-- Banner cuando no hay aprendices -->
                <q-banner v-else class="bg-orange-1 text-orange-9">
                  <template v-slot:avatar>
                    <q-icon name="info" />
                  </template>
                  No has agregado aprendices aún. Debes agregar al menos uno para continuar.
                </q-banner>
              </div>

              <!-- Formulario de aprendiz -->
              <div>
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">person_add</span>
                  Agregar Nuevo Aprendiz
                </div>

                <q-card flat bordered class="q-mb-md">
                  <q-card-section>
                    <div class="row q-col-gutter-md">
                      <div class="col-12 col-md-4">
                        <q-select
                          ref="documentTypeRef"
                          filled
                          v-model="nuevoAprendiz.documentType"
                          :options="documentTypeOptions"
                          label="Tipo de Documento *"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">badge</span>
                          </template>
                        </q-select>
                      </div>

                      <div class="col-12 col-md-4">
                        <q-input
                          ref="documentNumberRef"
                          filled
                          v-model="nuevoAprendiz.documentNumber"
                          label="Número de Documento *"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">pin</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12 col-md-4">
                        <q-input
                          ref="phoneRef"
                          filled
                          v-model="nuevoAprendiz.phone"
                          label="Teléfono *"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">phone</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <q-input
                          ref="fullnameRef"
                          filled
                          v-model="nuevoAprendiz.fullname"
                          label="Nombre Completo *"
                          placeholder="Nombres y Apellidos"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">person</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <q-input
                          ref="emailRef"
                          filled
                          type="email"
                          v-model="nuevoAprendiz.email"
                          label="Correo Electrónico *"
                          lazy-rules
                          :rules="[
                            (val) => (val && val.trim().length > 0) || 'El campo es requerido',
                            (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Formato de correo inválido'
                          ]"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">email</span>
                          </template>
                        </q-input>
                      </div>
                    </div>
                  </q-card-section>
                  <q-card-actions align="right">
                    <q-btn
                      color="green-9"
                      label="Agregar Aprendiz"
                      @click="agregarAprendiz"
                      :loading="loadingAprendiz"
                    >
                      <template v-slot:prepend>
                        <span class="material-symbols-outlined">add_circle</span>
                      </template>
                    </q-btn>
                  </q-card-actions>
                </q-card>
              </div>

              <!-- Botones de navegación Paso 2 -->
              <div class="row q-mt-xl justify-between">
                <q-btn flat label="Atrás" @click="step = 1" size="md" />
                <q-btn
                  flat
                  @click="irPaso3"
                  class="bg-green-9 text-white"
                  label="Siguiente"
                  size="md"
                  :disable="wizardData.aprendices.length === 0"
                />
              </div>
            </q-step>

            <!-- PASO 3: Detalles por Aprendiz -->
            <q-step
              :name="3"
              title="Detalles del Comité"
              icon="description"
              class="q-py-md"
            >
              <!-- Contador -->
              <div class="q-mb-xl">
                <q-banner class="bg-blue-1 text-blue-9">
                  <template v-slot:avatar>
                    <q-icon name="fact_check" color="blue-9" size="24px" />
                  </template>
                  <div class="text-weight-bold">
                    {{ aprendicesCompletados }} de {{ wizardData.aprendices.length }} aprendiz(es) completado(s)
                  </div>
                </q-banner>
              </div>

              <!-- Selector de aprendiz -->
              <div class="q-mb-xl">
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">list_alt</span>
                  Selecciona un aprendiz para completar información
                </div>

                <q-card flat bordered>
                  <q-list separator>
                    <q-item
                      v-for="aprendiz in wizardData.aprendices"
                      :key="aprendiz.id"
                      clickable
                      @click="aprendizActual = aprendiz"
                      :class="{ 'bg-blue-1': aprendizActual?.id === aprendiz.id }"
                      class="q-pa-md"
                    >
                      <q-item-section avatar>
                        <q-icon :name="aprendizActual?.id === aprendiz.id ? 'check_circle' : 'radio_button_unchecked'"
                               :color="aprendizActual?.id === aprendiz.id ? 'green-9' : 'grey-6'" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold">{{ aprendiz.fullname }}</q-item-label>
                        <q-item-label caption>{{ aprendiz.documentType }}: {{ aprendiz.documentNumber }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge v-if="aprendiz.noveltyType && aprendiz.description && aprendiz.manual && aprendiz.competencesText && aprendiz.outcomesText"
                                label="Completado" color="green-9" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card>
              </div>

              <!-- Detalles del aprendiz actual -->
              <div v-if="aprendizActual">
                <div class="text-h6 text-weight-bold text-green-9 q-mb-md flex items-center">
                  <span class="material-symbols-outlined q-mr-sm" style="font-size: 24px">edit_note</span>
                  Detalles de {{ aprendizActual.fullname }}
                  <q-chip :label="`Aprendiz ${indexOfAprendizActual + 1} de ${wizardData.aprendices.length}`"
                         color="green-9" text-color="white" class="q-ml-md" />
                </div>

                <q-card flat bordered>
                  <q-card-section class="bg-green-1">
                    <div class="row items-center">
                      <div class="col-10">
                        <div class="text-subtitle2 text-weight-bold text-green-9">
                          {{ aprendizActual.fullname }}
                        </div>
                        <div class="text-caption text-grey-7">
                          {{ aprendizActual.documentType }}: {{ aprendizActual.documentNumber }}
                        </div>
                      </div>
                    </div>
                  </q-card-section>

                  <q-card-section>
                    <div class="row q-col-gutter-md">
                      <div class="col-12">
                        <q-select
                          filled
                          v-model="aprendizActual.noveltyType"
                          :options="noveltyTypeOptions"
                          option-label="label"
                          option-value="value"
                          emit-value
                          map-options
                          label="Tipo de Novedad *"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">warning</span>
                          </template>
                        </q-select>
                      </div>

                      <div class="col-12">
                        <q-input
                          filled
                          type="textarea"
                          v-model="aprendizActual.description"
                          label="Descripción de los Hechos *"
                          rows="4"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">edit_note</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <q-input
                          filled
                          type="textarea"
                          v-model="aprendizActual.manual"
                          label="Reglamento Vulnerado *"
                          rows="3"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">gavel</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <q-input
                          filled
                          type="textarea"
                          v-model="aprendizActual.competencesText"
                          label="Competencias Afectadas *"
                          rows="2"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">school</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <q-input
                          filled
                          type="textarea"
                          v-model="aprendizActual.outcomesText"
                          label="Resultados de Aprendizaje Afectados *"
                          rows="2"
                          lazy-rules
                          :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
                        >
                          <template v-slot:prepend>
                            <span class="material-symbols-outlined">emoji_objects</span>
                          </template>
                        </q-input>
                      </div>

                      <div class="col-12">
                        <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">
                          Evidencias (Opcional)
                        </div>
                        <q-card
                          flat
                          bordered
                          class="cursor-pointer"
                          @click="!aprendizActual.evidenceFile && triggerFileInput(aprendizActual.id)"
                          :class="{ 'bg-green-1': aprendizActual.evidenceFile }"
                        >
                          <q-card-section class="text-center q-py-lg">
                            <div v-if="!aprendizActual.evidenceFile">
                              <q-icon
                                name="cloud_upload"
                                size="64px"
                                color="green-9"
                                class="q-mb-md"
                              />
                              <div class="text-subtitle2 text-grey-7">
                                Haz clic para seleccionar archivo
                              </div>
                              <div class="text-caption text-grey-5 q-mt-sm">
                                PDF o Imagen (máximo 1 archivo)
                              </div>
                            </div>
                            <div v-else>
                              <q-icon
                                name="check_circle"
                                size="48px"
                                color="green-9"
                                class="q-mb-md"
                              />
                              <div class="text-subtitle2 text-green-9">
                                Archivo cargado
                              </div>
                              <div class="text-caption text-grey-7 q-mt-sm">
                                {{ aprendizActual.evidenceFile.name }}
                              </div>
                              <q-btn
                                flat
                                color="red"
                                label="Eliminar archivo"
                                class="q-mt-md"
                                @click.stop="aprendizActual.evidenceFile = null"
                              >
                                <template v-slot:prepend>
                                  <span class="material-symbols-outlined">delete</span>
                                </template>
                              </q-btn>
                            </div>
                          </q-card-section>
                        </q-card>
                        <input
                          type="file"
                          :id="'fileInput-' + aprendizActual.id"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          @change="onFileSelected($event, aprendizActual)"
                        />
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Botones de navegación Paso 3 -->
              <div class="row q-mt-xl justify-between">
                <q-btn flat label="Atrás" @click="step = 2" size="md" />
                <div>
                  <q-btn
                    v-if="indexOfAprendizActual < wizardData.aprendices.length - 1"
                    flat
                    @click="siguienteAprendiz"
                    class="bg-green-9 text-white"
                    label="Siguiente Aprendiz"
                    size="md"
                  />
                  <q-btn
                    v-else
                    flat
                    @click="guardarComite"
                    class="bg-green-9 text-white"
                    label="Finalizar y Crear Comité"
                    size="md"
                    :disable="aprendicesCompletados < wizardData.aprendices.length"
                    :loading="guardandoComite"
                  />
                </div>
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>

        <!-- Footer -->
        <q-card-section class="bg-grey-2 q-py-sm">
          <div class="text-center text-caption text-grey-7">
            REPFORA - SENA © 2024 Todos los derechos reservados
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Dialog: Ver Datos -->
    <q-dialog v-model="dialogVerDatos">
      <q-card style="min-width: 600px; max-width: 90vw;">
        <q-card-section class="bg-green-9 q-px-lg">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-weight-bold">
                DATOS DEL COMITÉ
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" v-close-popup />
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-pa-md">
          <div v-if="comiteSeleccionado">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <div class="text-weight-bold text-green-9">Ficha:</div>
                <div>{{ comiteSeleccionado.ficha || 'N/A' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-weight-bold text-green-9">ID Comité:</div>
                <div>COM-{{ String(comiteSeleccionado._id).slice(-6).toUpperCase() }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-weight-bold text-green-9">Fecha de Reunión:</div>
                <div v-if="comiteSeleccionado.meetingDate">{{ formatDate(comiteSeleccionado.meetingDate) }}</div>
                <div v-else class="text-grey-5">Pendiente</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-weight-bold text-green-9">Estado:</div>
                <div>{{ getStatusLabel(comiteSeleccionado.status) }}</div>
              </div>
              <div class="col-12">
                <div class="text-weight-bold text-green-9 q-mb-sm">Aprendices:</div>
                <q-list separator>
                  <q-item v-for="(learner, index) in comiteSeleccionado.learners" :key="index">
                    <q-item-section avatar>
                      <q-icon name="person" color="green-9" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ learner.name }}</q-item-label>
                      <q-item-label caption>{{ learner.documentType }}: {{ learner.documentNumber }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-chip :label="getNoveltyTypeLabel(learner.noveltyType)" size="sm" :color="learner.noveltyType === 'ACADEMIC' ? 'orange' : learner.noveltyType === 'DISCIPLINARY' ? 'red' : 'purple'" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    </div>
    <!-- Fin de la vista instructor -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";
import { get, post, put } from "../services/api.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import { storeUser } from "../store/users.js";

const router = useRouter();
const $q = useQuasar();
const userStore = storeUser();

// Determinar si el usuario es NOVEDADES
const isNovedades = computed(() => userStore.getRole() === 'NOVEDADES');

// Estados
const prompt = ref(false);
const dialogVerDatos = ref(false);
const step = ref(1);
const comiteSeleccionado = ref(null);
const aprendizActual = ref(null);
const loadingFichas = ref(false);
const loadingInstructores = ref(false);
const guardandoComite = ref(false);
const loadingAprendiz = ref(false);
const busquedaFichaRealizada = ref(false);
const busquedaInstructorRealizada = ref(false);

// Búsquedas
const busquedaFicha = ref("");
const busquedaInstructor = ref("");
const fichasResultados = ref([]);
const instructoresResultados = ref([]);

// Datos del wizard
const wizardData = ref({
  fichaId: "",
  ficha: "",
  fichaObj: null,
  instructores: [],
  aprendices: [],
});

// Formulario para nuevo aprendiz
const nuevoAprendiz = ref({
  documentType: "",
  documentNumber: "",
  fullname: "",
  phone: "",
  email: "",
});

// Refs para los inputs del formulario de aprendiz
const documentTypeRef = ref(null);
const documentNumberRef = ref(null);
const phoneRef = ref(null);
const fullnameRef = ref(null);
const emailRef = ref(null);

// Opciones
const documentTypeOptions = ref(["CC", "CE", "TI", "PPT"]);
const noveltyTypeOptions = ref([
  { label: "ACADÉMICA", value: "ACADEMIC" },
  { label: "DISCIPLINARIA", value: "DISCIPLINARY" },
  { label: "AMBAS", value: "BOTH" }
]);
const manualOptions = ref([
  "Artículo 45 - Falta Académica Leve",
  "Artículo 50 - Falta Disciplinaria Grave",
  "Artículo 55 - Falta Muy Grave",
  "Artículo 60 - Incumplimiento de Horarios",
]);

// Columnas de la tabla
const comitesColumns = ref([
  { name: "ficha", label: "FICHA", field: "ficha", align: "left", sortable: true },
  { name: "fechaCreacion", label: "FECHA CREACIÓN", field: "createdAt", align: "left", sortable: true },
  { name: "fechaAgendamiento", label: "FECHA REUNIÓN", field: "meetingDate", align: "left", sortable: true },
  { name: "idComite", label: "ID COMITÉ", field: "_id", align: "center" },
  { name: "estado", label: "ESTADO", field: "status", align: "center", sortable: true },
  { name: "acciones", label: "ACCIONES", field: "acciones", align: "right" },
]);

// Datos de comités
const comitesRows = ref([]);

// Computados
const aprendicesCompletados = computed(() => {
  return wizardData.value.aprendices.filter(
    (a) => a.noveltyType && a.description && a.manual && a.competencesText && a.outcomesText
  ).length;
});

const indexOfAprendizActual = computed(() => {
  return wizardData.value.aprendices.findIndex(a => a?.id === aprendizActual.value?.id);
});

// Funciones
function abrirDialogCrear() {
  step.value = 1;
  limpiarWizard();
  prompt.value = true;
}

function cerrarDialog() {
  $q.dialog({
    title: "Cerrar",
    message: "¿Estás seguro de cerrar? Perderás los datos ingresados.",
    ok: { label: "Sí, cerrar", class: "bg-green-9 text-white" },
    cancel: { label: "No", flat: true },
  }).onOk(() => {
    prompt.value = false;
  });
}

function eliminarFicha() {
  wizardData.value.fichaId = "";
  wizardData.value.ficha = "";
  wizardData.value.fichaObj = null;
}

// Búsqueda de fichas
async function buscarFichaBtn() {
  if (!busquedaFicha.value || busquedaFicha.value.trim().length === 0) {
    $q.notify({ message: "Ingrese un número de ficha", color: "orange", position: "top" });
    return;
  }

  try {
    loadingFichas.value = true;
    busquedaFichaRealizada.value = false;
    fichasResultados.value = [];

    const res = await get("/comites/search/fiches", { number: busquedaFicha.value.trim() });
    fichasResultados.value = Array.isArray(res) ? res : (res?.data || []);
  } catch (error) {
    console.log("Error buscando fichas:", error);
    fichasResultados.value = [];
  } finally {
    loadingFichas.value = false;
    busquedaFichaRealizada.value = true;
  }
}

function seleccionarFicha(ficha) {
  wizardData.value.fichaId = ficha._id;
  wizardData.value.fichaObj = ficha;
  wizardData.value.ficha = `${ficha.number} - ${ficha.program?.name || 'Sin nombre'}`;
  fichasResultados.value = [];
  busquedaFicha.value = "";
  busquedaFichaRealizada.value = false;

  $q.notify({
    message: "Ficha seleccionada correctamente",
    color: "green-9",
    position: "top",
  });
}

// Búsqueda de instructores
async function buscarInstructorBtn() {
  if (!busquedaInstructor.value || busquedaInstructor.value.trim().length === 0) {
    $q.notify({ message: "Ingrese nombre o cédula del instructor", color: "orange", position: "top" });
    return;
  }

  try {
    loadingInstructores.value = true;
    busquedaInstructorRealizada.value = false;
    instructoresResultados.value = [];

    const res = await get("/comites/search/instructors", { search: busquedaInstructor.value.trim() });
    const resultados = Array.isArray(res) ? res : (res?.data || []);
    // Filtrar solo instructores activos (status: 0)
    instructoresResultados.value = resultados.filter(i => i.status === 0);
  } catch (error) {
    console.log("Error buscando instructores:", error);
    instructoresResultados.value = [];
  } finally {
    loadingInstructores.value = false;
    busquedaInstructorRealizada.value = true;
  }
}

function agregarInstructor(instructor) {
  if (wizardData.value.instructores.some(i => i._id === instructor._id)) {
    $q.notify({
      message: "El instructor ya está agregado",
      color: "orange",
      position: "top",
    });
    return;
  }

  wizardData.value.instructores.push(instructor);
  instructoresResultados.value = [];
  busquedaInstructor.value = "";
  busquedaInstructorRealizada.value = false;

  $q.notify({
    message: "Instructor agregado correctamente",
    color: "green-9",
    position: "top",
  });
}

function eliminarInstructor(id) {
  wizardData.value.instructores = wizardData.value.instructores.filter(i => i._id !== id);
}

function cerrarResultadosInstructores() {
  instructoresResultados.value = [];
  busquedaInstructor.value = "";
  busquedaInstructorRealizada.value = false;
}

function validarPaso1() {
  if (!wizardData.value.ficha) {
    $q.notify({ message: "Por favor selecciona una ficha", color: "red", position: "top" });
    return;
  }
  if (wizardData.value.instructores.length === 0) {
    $q.notify({ message: "Por favor agrega al menos un instructor", color: "red", position: "top" });
    return;
  }
  step.value = 2;
}

function agregarAprendiz() {
  const required = ["documentType", "documentNumber", "fullname", "phone", "email"];
  for (const field of required) {
    if (!nuevoAprendiz.value[field] || !nuevoAprendiz.value[field].trim()) {
      $q.notify({ message: "Por favor completa todos los campos del aprendiz", color: "red", position: "top" });
      return;
    }
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(nuevoAprendiz.value.email)) {
    $q.notify({ message: "Formato de correo electrónico inválido", color: "red", position: "top" });
    return;
  }

  loadingAprendiz.value = true;
  const id = Date.now();
  wizardData.value.aprendices.push({
    id,
    ...nuevoAprendiz.value,
    noveltyType: "",
    description: "",
    manual: "",
    competencesText: "",
    outcomesText: "",
    evidenceFile: null,
  });

  nuevoAprendiz.value = {
    documentType: "",
    documentNumber: "",
    fullname: "",
    phone: "",
    email: "",
  };

  // Limpiar validaciones de los inputs
  documentTypeRef.value?.resetValidation();
  documentNumberRef.value?.resetValidation();
  phoneRef.value?.resetValidation();
  fullnameRef.value?.resetValidation();
  emailRef.value?.resetValidation();

  loadingAprendiz.value = false;

  $q.notify({ message: "Aprendiz agregado correctamente", color: "green-9", position: "top" });
}

function eliminarAprendiz(id) {
  wizardData.value.aprendices = wizardData.value.aprendices.filter(a => a.id !== id);
  if (aprendizActual.value && aprendizActual.value.id === id) {
    aprendizActual.value = wizardData.value.aprendices[0] || null;
  }
}

function irPaso3() {
  aprendizActual.value = wizardData.value.aprendices[0];
  step.value = 3;
}

function siguienteAprendiz() {
  const currentIndex = indexOfAprendizActual.value;
  if (currentIndex < wizardData.value.aprendices.length - 1) {
    aprendizActual.value = wizardData.value.aprendices[currentIndex + 1];
  }
}

function triggerFileInput(aprendizId) {
  const input = document.getElementById(`fileInput-${aprendizId}`);
  if (input) input.click();
}

function onFileSelected(event, aprendiz) {
  const file = event.target.files[0];
  if (file) {
    aprendiz.evidenceFile = file;
  }
}

async function guardarComite() {
  const incompletos = wizardData.value.aprendices.filter(
    (a) => !a.noveltyType || !a.description || !a.manual || !a.competencesText || !a.outcomesText
  );

  if (incompletos.length > 0) {
    $q.notify({ message: "Por favor completa la información de todos los aprendices (incluyendo competencias y resultados de aprendizaje)", color: "red", position: "top" });
    return;
  }

  try {
    guardandoComite.value = true;

    const payload = {
      fiche: wizardData.value.fichaId,
      requestingInstructors: wizardData.value.instructores.map(i => i._id),
      learners: wizardData.value.aprendices.map(a => ({
        name: a.fullname,
        documentType: a.documentType,
        documentNumber: a.documentNumber,
        phone: a.phone,
        email: a.email,
        noveltyType: a.noveltyType,
        description: a.description,
        manual: a.manual,
        competences: a.competencesText ? a.competencesText.split(',').map(s => s.trim()).filter(s => s) : [],
        outcomes: a.outcomesText ? a.outcomesText.split(',').map(s => s.trim()).filter(s => s) : [],
      })),
    };

    await post("/comites", payload);

    $q.notify({ message: "Comité creado correctamente", color: "green-9", position: "top" });

    await cargarComites();
    prompt.value = false;
  } catch (error) {
    console.log("Error creando comité:", error);
    $q.notify({ message: "Error al crear comité", color: "red", position: "top" });
  } finally {
    guardandoComite.value = false;
  }
}

function limpiarWizard() {
  wizardData.value = {
    fichaId: "",
    ficha: "",
    fichaObj: null,
    instructores: [],
    aprendices: [],
  };
  nuevoAprendiz.value = {
    documentType: "",
    documentNumber: "",
    fullname: "",
    phone: "",
    email: "",
  };
  aprendizActual.value = null;
  fichasResultados.value = [];
  instructoresResultados.value = [];
  busquedaFicha.value = "";
  busquedaInstructor.value = "";
  busquedaFichaRealizada.value = false;
  busquedaInstructorRealizada.value = false;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getNoveltyTypeLabel(value) {
  const option = noveltyTypeOptions.value.find(o => o.value === value);
  return option ? option.label : value;
}

function getStatusLabel(status) {
  const statusMap = {
    PENDING: "PENDIENTE",
    SCHEDULED: "PROGRAMADO",
    COMPLETED: "COMPLETADO",
    CANCELLED: "CANCELADO"
  };
  return statusMap[status] || status;
}

async function cargarComites() {
  try {
    const res = await get("/comites");
    const data = Array.isArray(res) ? res : (res?.data || []);
    comitesRows.value = data.map(c => ({
      ...c,
      ficha: c.fiche?.number || 'N/A',
      nombrePrograma: c.fiche?.program?.name || 'Sin nombre',
    }));
  } catch (error) {
    console.log("Error cargando comités:", error);
  }
}

function verDatos(row) {
  comiteSeleccionado.value = row;
  dialogVerDatos.value = true;
}

async function cancelarComite(row) {
  $q.dialog({
    title: "Cancelar Comité",
    message: "¿Estás seguro de cancelar este comité?",
    ok: { label: "Sí, cancelar", class: "bg-green-9 text-white" },
    cancel: { label: "No", flat: true, class: "text-red" },
  }).onOk(async () => {
    try {
      await put(`/comites/${row._id}/cancel`);
      $q.notify({ message: "Comité cancelado correctamente", color: "green-9", position: "top" });
      await cargarComites();
    } catch (error) {
      console.log("Error cancelando comité:", error);
      $q.notify({ message: "Error al cancelar comité", color: "red", position: "top" });
    }
  });
}

onMounted(() => {
  cargarComites();
});
</script>

<style scoped>
.hidden {
  display: none;
}

/* ========== Dashboard NOVEDADES ========== */
.comites-dashboard {
  padding: 16px;
}

.dashboard-cards-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28px;
  margin-top: 32px;
  padding: 0 16px;
}

.dashboard-card {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 420px;
  padding: 28px 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(34, 139, 34, 0.08);
  position: relative;
  overflow: hidden;
}

.dashboard-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #2e7d32, #66bb6a);
  border-radius: 20px 0 0 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(46, 125, 50, 0.15), 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(46, 125, 50, 0.2);
}

.dashboard-card:hover::before {
  opacity: 1;
}

.dashboard-card:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 125, 50, 0.12);
}

.dashboard-card-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #2e7d32, #43a047);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.dashboard-card:hover .dashboard-card-icon {
  transform: scale(1.08);
}

.dashboard-card-icon .material-symbols-outlined {
  font-size: 28px;
  color: #ffffff;
}

.dashboard-card-content {
  flex: 1;
  min-width: 0;
}

.dashboard-card-content h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1b5e20;
  letter-spacing: -0.01em;
}

.dashboard-card-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

.dashboard-card-arrow {
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
}

.dashboard-card:hover .dashboard-card-arrow {
  opacity: 1;
  transform: translateX(0);
}

.dashboard-card-arrow .material-symbols-outlined {
  font-size: 22px;
  color: #2e7d32;
}

/* Responsive */
@media (max-width: 600px) {
  .dashboard-cards-container {
    gap: 16px;
    padding: 0 8px;
  }

  .dashboard-card {
    padding: 20px 20px;
    border-radius: 16px;
  }

  .dashboard-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .dashboard-card-icon .material-symbols-outlined {
    font-size: 24px;
  }
}
</style>
