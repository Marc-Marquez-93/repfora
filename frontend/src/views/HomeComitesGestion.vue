<template>
  <div class="gestion-comites">
    <BtnBack route="/home/comites" />
    <HeaderLayout title="Gestión de Comités" />

    <!-- Tabs de navegación -->
    <div class="row q-mx-md q-mt-md">
      <div class="col-12">
        <q-tabs
          v-model="tabActual"
          class="tabs-container"
          active-class="active-tab"
          indicator-color="white"
          active-bg-color="white"
          active-text-color="green-9"
          no-caps
          outside-arrows
          mobile-arrows
        >
          <q-tab name="pendientes" label="PENDIENTES" :class="{ 'tab-with-badge': pendientesCount > 0 }">
            <q-badge v-if="pendientesCount > 0" color="red" floating class="badge-count">{{ pendientesCount }}</q-badge>
          </q-tab>
          <q-tab name="agendados" label="AGENDADOS" />
          <q-tab name="completados" label="COMPLETADOS" />
        </q-tabs>
      </div>
    </div>

    <!-- Contenido de tabs -->
    <div class="row q-mx-md q-mt-md">
      <div class="col-12">
        <q-tab-panels v-model="tabActual" animated class="bg-transparent">
          <!-- TAB: PENDIENTES -->
          <q-tab-panel name="pendientes" class="q-pa-none">
            <div v-if="cargando" class="flex flex-center q-pa-xl">
              <q-spinner color="green-9" size="3em" />
            </div>
            <div v-else-if="comitesPendientes.length === 0" class="q-pa-xl text-center">
              <q-icon name="inbox" size="80px" color="grey-4" class="q-mb-md" />
              <div class="text-h6 text-grey-6">No hay comités pendientes</div>
              <div class="text-caption text-grey-5 q-mt-sm">Los nuevos comités aparecerán aquí</div>
            </div>
            <div v-else class="comites-container">
              <q-card
                v-for="(comite, index) in comitesPendientes"
                :key="comite._id"
                class="comite-card-horizontal q-mb-sm"
                :style="{ animationDelay: `${index * 40}ms` }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-col-gutter-sm">
                    <!-- Ficha y Estado -->
                    <div class="col-auto">
                      <div class="row items-center q-gutter-xs">
                        <div class="ficha-badge ficha-pendiente">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="bg-orange-6 text-white">
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7" style="font-size: 14px;">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-orange-1 text-orange-9"
                          dense
                          style="font-size: 14px;"
                        >
                          {{ learner.name }}
                          <q-tooltip>{{ learner.documentType }}: {{ learner.documentNumber }}</q-tooltip>
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="bg-grey-2" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-caption text-grey-7 q-mr-xs" style="font-size: 14px;">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
                          style="font-size: 14px;"
                        >
                          <span class="material-symbols-outlined q-mr-xs" style="font-size: 14px">person</span>
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="bg-grey-2" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Fecha -->
                    <div class="col-auto">
                      <span class="text-caption text-grey-6">{{ formatDateShort(comite.createdAt) }}</span>
                    </div>

                    <!-- Botones -->
                    <div class="col-auto">
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat
                          color="grey-7"
                          label="Detalles"
                          class="btn-press"
                          size="md"
                          @click="verDetalles(comite)"
                        />
                        <q-btn
                          flat
                          color="red"
                          label="Cancelar"
                          class="btn-press"
                          size="md"
                          @click="confirmarCancelar(comite)"
                        />
                        <q-btn
                          unelevated
                          color="green-9"
                          label="Agendar"
                          class="btn-press"
                          size="md"
                          @click="agendarReunion(comite)"
                        />
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-tab-panel>

          <!-- TAB: AGENDADOS -->
          <q-tab-panel name="agendados" class="q-pa-none">
            <div v-if="cargando" class="flex flex-center q-pa-xl">
              <q-spinner color="green-9" size="3em" />
            </div>
            <div v-else-if="comitesAgendados.length === 0" class="q-pa-xl text-center">
              <q-icon name="event_busy" size="80px" color="grey-4" class="q-mb-md" />
              <div class="text-h6 text-grey-6">No hay reuniones agendadas</div>
              <div class="text-caption text-grey-5 q-mt-sm">Los comités agendados aparecerán aquí</div>
            </div>
            <div v-else class="comites-container">
              <q-card
                v-for="(comite, index) in comitesAgendados"
                :key="comite._id"
                class="comite-card-horizontal q-mb-sm bg-blue-1"
                :style="{ animationDelay: `${index * 40}ms` }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-col-gutter-sm">
                    <!-- Ficha y Estado -->
                    <div class="col-auto">
                      <div class="row items-center q-gutter-xs">
                        <div class="ficha-badge ficha-agendado">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="bg-blue-8 text-white" dense>
                          <q-icon name="event" size="14px" class="q-mr-xs" />
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7" style="font-size: 14px;">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-blue-2 text-blue-9"
                          dense
                          style="font-size: 14px;"
                        >
                          {{ learner.name }}
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="bg-grey-2" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-caption text-grey-7 q-mr-xs" style="font-size: 14px;">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
                          style="font-size: 14px;"
                        >
                          <span class="material-symbols-outlined q-mr-xs" style="font-size: 14px">person</span>
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="bg-grey-2" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Fecha reunión -->
                    <div class="col-auto">
                      <div class="row items-center q-gutter-xs">
                        <span class="material-symbols-outlined text-grey-6" style="font-size: 16px">schedule</span>
                        <span class="text-caption text-grey-7">{{ formatDate(comite.meetingDate) }}</span>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Botones -->
                    <div class="col-auto">
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat
                          color="grey-7"
                          label="Detalles"
                          class="btn-press"
                          size="md"
                          @click="verDetalles(comite)"
                        />
                        <q-btn
                          flat
                          color="blue-9"
                          label="Modificar"
                          class="btn-press"
                          size="md"
                          @click="modificarAgendamiento(comite)"
                        />
                        <q-btn
                          unelevated
                          color="green-9"
                          label="Completar"
                          class="btn-press"
                          size="md"
                          @click="marcarCompletado(comite)"
                        />
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-tab-panel>

          <!-- TAB: COMPLETADOS -->
          <q-tab-panel name="completados" class="q-pa-none">
            <div v-if="cargando" class="flex flex-center q-pa-xl">
              <q-spinner color="green-9" size="3em" />
            </div>
            <div v-else-if="comitesCompletados.length === 0" class="q-pa-xl text-center">
              <q-icon name="check_circle" size="80px" color="green-4" class="q-mb-md" />
              <div class="text-h6 text-grey-6">No hay comités completados</div>
              <div class="text-caption text-grey-5 q-mt-sm">Los comités finalizados aparecerán aquí</div>
            </div>
            <div v-else class="comites-container">
              <q-card
                v-for="(comite, index) in comitesCompletados"
                :key="comite._id"
                class="comite-card-horizontal q-mb-sm bg-green-1"
                :style="{ animationDelay: `${index * 40}ms` }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-col-gutter-sm">
                    <!-- Ficha y Estado -->
                    <div class="col-auto">
                      <div class="row items-center q-gutter-xs">
                        <div class="ficha-badge ficha-completado">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="bg-green-9 text-white" dense>
                          <q-icon name="check" size="14px" class="q-mr-xs" />
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                        <q-chip v-if="comite.resolutionNumber" size="sm" class="bg-purple-1 text-purple-9" dense>
                          Res. {{ comite.resolutionNumber }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7" style="font-size: 14px;">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-green-2 text-green-9"
                          dense
                          style="font-size: 14px;"
                        >
                          {{ learner.name }}
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="bg-grey-2" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-caption text-grey-7 q-mr-xs" style="font-size: 14px;">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
                          style="font-size: 14px;"
                        >
                          <span class="material-symbols-outlined q-mr-xs" style="font-size: 14px">person</span>
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="bg-grey-2" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Gravedad -->
                    <div class="col-auto">
                      <q-chip size="sm" class="bg-red-1 text-red-9" dense>
                        {{ getGravedadLabel(comite.faultSeverity) }}
                      </q-chip>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto text-grey-4">|</div>

                    <!-- Botones -->
                    <div class="col-auto">
                      <q-btn
                        flat
                        color="grey-7"
                        label="Ver resolución"
                        class="btn-press"
                        size="md"
                        @click="verDetalles(comite)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>

    <!-- Dialog: Agendar Reunión -->
    <q-dialog v-model="dialogAgendar" persistent>
      <q-card class="dialog-card dialog-card-large">
        <q-card-section class="bg-green-9 dialog-header">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-weight-bold">
                AGENDAR REUNIÓN
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" class="btn-press" @click="cerrarDialogAgendar" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none dialog-body">
          <div v-if="comiteSeleccionado" class="q-mb-md">
            <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">
              Ficha: {{ comiteSeleccionado.ficha }}
            </div>
            <div class="text-caption text-grey-7">{{ comiteSeleccionado.nombrePrograma }}</div>
          </div>

          <q-stepper v-model="pasoAgendar" color="green-9" animated flat>
            <!-- PASO 1: Datos de la Reunión y Asistentes -->
            <q-step
              :name="1"
              title="Datos de la Reunión"
              icon="event"
              :done="pasoAgendar > 1"
            >
              <div class="row q-col-gutter-md q-mt-md">
                <!-- Fecha y Hora -->
                <div class="col-12 col-md-6">
                  <q-input
                    filled
                    v-model="agendamiento.fecha"
                    label="Fecha de reunión *"
                    type="date"
                    :min="fechaMinima"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">calendar_today</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-6">
                  <q-input
                    filled
                    v-model="agendamiento.hora"
                    label="Hora *"
                    type="time"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">schedule</span>
                    </template>
                  </q-input>
                </div>

                <!-- Lugar -->
                <div class="col-12">
                  <q-input
                    filled
                    v-model="agendamiento.lugar"
                    label="Lugar de reunión *"
                    placeholder="Ej: Sala de juntas 1, Edificio B"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">location_on</span>
                    </template>
                  </q-input>
                </div>

                <!-- Coordinador -->
                <div class="col-12 col-md-6">
                  <q-select
                    filled
                    v-model="agendamiento.coordinador"
                    :options="coordinadores"
                    option-label="name"
                    option-value="_id"
                    emit-value
                    map-options
                    label="Coordinador *"
                    :loading="cargando"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">person</span>
                    </template>
                  </q-select>
                </div>

                <!-- Novedades -->
                <div class="col-12 col-md-6">
                  <q-select
                    filled
                    v-model="agendamiento.novedades"
                    :options="usuariosNovedades"
                    option-label="name"
                    option-value="_id"
                    emit-value
                    map-options
                    label="Novedades *"
                    :loading="cargando"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">badge</span>
                    </template>
                  </q-select>
                </div>

                <!-- Instructor Invitado (máximo 1) -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">Instructor Invitado (opcional - máximo 1)</div>

                  <!-- Instructor agregado -->
                  <div v-if="agendamiento.instructoresInvitados.length > 0" class="q-mb-sm">
                    <q-chip
                      removable
                      @remove="eliminarInstructorInvitado(agendamiento.instructoresInvitados[0]._id)"
                      class="bg-green-1 text-green-9"
                    >
                      {{ agendamiento.instructoresInvitados[0].name }}
                    </q-chip>
                  </div>

                  <!-- Buscador -->
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-10">
                      <q-input
                        filled
                        v-model="busquedaInstructorInvitado"
                        label="Buscar instructor..."
                        @keyup.enter="buscarInstructorInvitado"
                        :loading="loadingInstructoresInvitados"
                        :disable="agendamiento.instructoresInvitados.length >= 1"
                        clearable
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">person_search</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-2">
                      <q-btn
                        class="bg-green-9 text-white full-height btn-press"
                        label="Buscar"
                        @click="buscarInstructorInvitado"
                        :loading="loadingInstructoresInvitados"
                        :disable="agendamiento.instructoresInvitados.length >= 1"
                      />
                    </div>
                  </div>

                  <!-- Resultados -->
                  <div v-if="instructoresInvitadosResultados.length > 0" class="q-mt-sm">
                    <q-card flat bordered class="bg-green-1">
                      <q-list separator>
                        <q-item
                          v-for="(instructor, idx) in instructoresInvitadosResultados"
                          :key="idx"
                          clickable
                          @click="agregarInstructorInvitado(instructor)"
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
                            <q-icon name="add_circle" color="green-9" size="28px" />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card>
                  </div>
                </div>

                <!-- Bienestar al Aprendiz -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">Bienestar al Aprendiz * (obligatorio)</div>

                  <!-- Bienestar seleccionado -->
                  <div v-if="agendamiento.bienestar" class="q-mb-sm">
                    <q-chip
                      removable
                      @remove="agendamiento.bienestar = null"
                      class="bg-blue-1 text-blue-9"
                    >
                      <span class="material-symbols-outlined q-mr-xs" style="font-size: 14px">person</span>
                      {{ agendamiento.bienestar.name }}
                    </q-chip>
                  </div>

                  <!-- Buscador -->
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-10">
                      <q-input
                        filled
                        v-model="busquedaBienestar"
                        label="Buscar instructor de bienestar..."
                        @keyup.enter="buscarBienestar"
                        :loading="loadingBienestar"
                        :disable="!!agendamiento.bienestar"
                        clearable
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">school</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-2">
                      <q-btn
                        class="bg-green-9 text-white full-height btn-press"
                        label="Buscar"
                        @click="buscarBienestar"
                        :loading="loadingBienestar"
                        :disable="!!agendamiento.bienestar"
                      />
                    </div>
                  </div>

                  <!-- Resultados -->
                  <div v-if="bienestarResultados.length > 0" class="q-mt-sm">
                    <q-card flat bordered class="bg-blue-1">
                      <q-list separator>
                        <q-item
                          v-for="(instructor, idx) in bienestarResultados"
                          :key="idx"
                          clickable
                          @click="seleccionarBienestar(instructor)"
                          class="q-pa-sm"
                        >
                          <q-item-section avatar>
                            <q-icon name="school" color="blue-9" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                            <q-item-label caption>{{ instructor.knowledge }}</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-icon name="add_circle" color="blue-9" size="28px" />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card>
                  </div>
                </div>
              </div>
            </q-step>

            <!-- PASO 2: Roles y Participantes Adicionales -->
            <q-step
              :name="2"
              title="Roles y Participantes"
              icon="groups"
            >
              <div class="row q-col-gutter-md q-mt-md">
                <!-- Vocero -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">Vocero *</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.vocero"
                        label="Nombre completo *"
                        placeholder="Ej: Juan Pérez"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">record_voice_over</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.voceroCorreo"
                        label="Correo electrónico *"
                        type="email"
                        placeholder="Ej: juan.perez@sena.edu.co"
                        :rules="[val => !val || val.includes('@') || 'El correo debe contener @']"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">email</span>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>

                <!-- Representante -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">Representante *</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.representante"
                        label="Nombre completo *"
                        placeholder="Ej: María González"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">supervisor_account</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.representanteCorreo"
                        label="Correo electrónico *"
                        type="email"
                        placeholder="Ej: maria.gonzalez@sena.edu.co"
                        :rules="[val => !val || val.includes('@') || 'El correo debe contener @']"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">email</span>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>

                <!-- Participantes Adicionales -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-green-9 q-mb-sm">Participantes Adicionales (opcional)</div>

                  <div v-if="agendamiento.participantesAdicionales.length === 0" class="q-mb-md text-grey-6 text-caption">
                    No hay participantes adicionales agregados
                  </div>

                  <div v-for="(participante, idx) in agendamiento.participantesAdicionales" :key="idx" class="q-mb-md">
                    <div class="bg-green-1 q-pa-md rounded-borders">
                      <div class="text-subtitle2 text-green-9 q-mb-sm">Participante {{ idx + 1 }}</div>
                      <div class="row q-col-gutter-sm">
                        <div class="col-12 col-md-5">
                          <q-input
                            filled
                            v-model="participante.nombre"
                            label="Nombre completo *"
                            placeholder="Nombre del participante"
                            dense
                          />
                        </div>
                        <div class="col-12 col-md-5">
                          <q-input
                            filled
                            v-model="participante.correo"
                            label="Correo electrónico"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            dense
                            :rules="[val => !val || val.includes('@') || 'El correo debe contener @']"
                          />
                        </div>
                        <div class="col-12 col-md-2 flex items-center justify-end">
                          <q-btn
                            round
                            color="red"
                            icon="delete"
                            size="sm"
                            @click="eliminarParticipanteAdicional(idx)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <q-btn
                    flat
                    color="green-9"
                    icon="add_circle"
                    label="Agregar participante adicional"
                    @click="agregarParticipanteAdicional"
                    class="q-mt-sm"
                  />
                </div>
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" class="btn-press" @click="cerrarDialogAgendar" />
          <q-btn
            v-if="pasoAgendar === 1"
            flat
            color="green-9"
            label="Siguiente"
            @click="validarPaso1"
            class="btn-press"
          />
          <template v-else>
            <q-btn
              flat
              color="grey-7"
              label="Atrás"
              @click="pasoAgendar = 1"
              class="btn-press q-mr-sm"
            />
            <q-btn
              unelevated
              color="green-9"
              label="Agendar"
              @click="guardarAgendamiento"
              :loading="guardando"
              class="btn-press"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Modificar Agendamiento -->
    <q-dialog v-model="dialogModificar" persistent>
      <q-card class="dialog-card dialog-card-large">
        <q-card-section class="bg-blue-9 dialog-header">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-weight-bold">
                MODIFICAR AGENDAMIENTO
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" class="btn-press" @click="cerrarDialogModificar" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none dialog-body">
          <div v-if="comiteSeleccionado" class="q-mb-md">
            <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">
              Ficha: {{ comiteSeleccionado.ficha }}
            </div>
            <div class="text-caption text-grey-7">{{ comiteSeleccionado.nombrePrograma }}</div>
          </div>

          <q-stepper v-model="pasoAgendar" color="blue-9" animated flat>
            <!-- PASO 1: Datos de la Reunión y Asistentes -->
            <q-step
              :name="1"
              title="Datos de la Reunión"
              icon="event"
              :done="pasoAgendar > 1"
            >
              <div class="row q-col-gutter-md q-mt-md">
                <!-- Fecha y Hora -->
                <div class="col-12 col-md-6">
                  <q-input
                    filled
                    v-model="agendamiento.fecha"
                    label="Fecha de reunión *"
                    type="date"
                    :min="fechaMinima"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">calendar_today</span>
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-6">
                  <q-input
                    filled
                    v-model="agendamiento.hora"
                    label="Hora *"
                    type="time"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">schedule</span>
                    </template>
                  </q-input>
                </div>

                <!-- Lugar -->
                <div class="col-12">
                  <q-input
                    filled
                    v-model="agendamiento.lugar"
                    label="Lugar de reunión *"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">location_on</span>
                    </template>
                  </q-input>
                </div>

                <!-- Coordinador -->
                <div class="col-12 col-md-6">
                  <q-select
                    filled
                    v-model="agendamiento.coordinador"
                    :options="coordinadores"
                    option-label="name"
                    option-value="_id"
                    emit-value
                    map-options
                    label="Coordinador"
                    :loading="cargando"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">person</span>
                    </template>
                  </q-select>
                </div>

                <!-- Novedades -->
                <div class="col-12 col-md-6">
                  <q-select
                    filled
                    v-model="agendamiento.novedades"
                    :options="usuariosNovedades"
                    option-label="name"
                    option-value="_id"
                    emit-value
                    map-options
                    label="Novedades"
                    :loading="cargando"
                  >
                    <template v-slot:prepend>
                      <span class="material-symbols-outlined">badge</span>
                    </template>
                  </q-select>
                </div>

                <!-- Instructor Invitado (máximo 1) -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">Instructor Invitado (opcional - máximo 1)</div>

                  <!-- Instructor agregado -->
                  <div v-if="agendamiento.instructoresInvitados.length > 0" class="q-mb-sm">
                    <q-chip
                      removable
                      @remove="eliminarInstructorInvitado(agendamiento.instructoresInvitados[0]._id)"
                      class="bg-blue-1 text-blue-9"
                    >
                      {{ agendamiento.instructoresInvitados[0].name }}
                    </q-chip>
                  </div>

                  <!-- Buscador -->
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-10">
                      <q-input
                        filled
                        v-model="busquedaInstructorInvitado"
                        label="Buscar instructor..."
                        @keyup.enter="buscarInstructorInvitado"
                        :loading="loadingInstructoresInvitados"
                        :disable="agendamiento.instructoresInvitados.length >= 1"
                        clearable
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">person_search</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-2">
                      <q-btn
                        class="bg-blue-9 text-white full-height btn-press"
                        label="Buscar"
                        @click="buscarInstructorInvitado"
                        :loading="loadingInstructoresInvitados"
                        :disable="agendamiento.instructoresInvitados.length >= 1"
                      />
                    </div>
                  </div>

                  <!-- Resultados -->
                  <div v-if="instructoresInvitadosResultados.length > 0" class="q-mt-sm">
                    <q-card flat bordered class="bg-blue-1">
                      <q-list separator>
                        <q-item
                          v-for="(instructor, idx) in instructoresInvitadosResultados"
                          :key="idx"
                          clickable
                          @click="agregarInstructorInvitado(instructor)"
                          class="q-pa-sm"
                        >
                          <q-item-section avatar>
                            <q-icon name="person" color="blue-9" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                            <q-item-label caption>{{ instructor.tpdocument || 'CC' }}: {{ instructor.numdocument }}</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-icon name="add_circle" color="blue-9" size="28px" />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card>
                  </div>
                </div>

                <!-- Bienestar al Aprendiz -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">Bienestar al Aprendiz *</div>

                  <!-- Bienestar seleccionado -->
                  <div v-if="agendamiento.bienestar" class="q-mb-sm">
                    <q-chip
                      removable
                      @remove="agendamiento.bienestar = null"
                      class="bg-blue-1 text-blue-9"
                    >
                      <span class="material-symbols-outlined q-mr-xs" style="font-size: 14px">person</span>
                      {{ agendamiento.bienestar.name }}
                    </q-chip>
                  </div>

                  <!-- Buscador -->
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-10">
                      <q-input
                        filled
                        v-model="busquedaBienestar"
                        label="Buscar instructor de bienestar..."
                        @keyup.enter="buscarBienestar"
                        :loading="loadingBienestar"
                        clearable
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">school</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-2">
                      <q-btn
                        class="bg-blue-9 text-white full-height btn-press"
                        label="Buscar"
                        @click="buscarBienestar"
                        :loading="loadingBienestar"
                      />
                    </div>
                  </div>

                  <!-- Resultados -->
                  <div v-if="bienestarResultados.length > 0" class="q-mt-sm">
                    <q-card flat bordered class="bg-blue-1">
                      <q-list separator>
                        <q-item
                          v-for="(instructor, idx) in bienestarResultados"
                          :key="idx"
                          clickable
                          @click="seleccionarBienestar(instructor)"
                          class="q-pa-sm"
                        >
                          <q-item-section avatar>
                            <q-icon name="school" color="blue-9" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                            <q-item-label caption>{{ instructor.knowledge }}</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-icon name="add_circle" color="blue-9" size="28px" />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card>
                  </div>
                </div>
              </div>
            </q-step>

            <!-- PASO 2: Roles y Participantes Adicionales -->
            <q-step
              :name="2"
              title="Roles y Participantes"
              icon="groups"
            >
              <div class="row q-col-gutter-md q-mt-md">
                <!-- Vocero -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">Vocero</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.vocero"
                        label="Nombre completo"
                        placeholder="Ej: Juan Pérez"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">record_voice_over</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.voceroCorreo"
                        label="Correo electrónico"
                        type="email"
                        placeholder="Ej: juan.perez@sena.edu.co"
                        :rules="[val => !val || val.includes('@') || 'El correo debe contener @']"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">email</span>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>

                <!-- Representante -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">Representante</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.representante"
                        label="Nombre completo"
                        placeholder="Ej: María González"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">supervisor_account</span>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-md-6">
                      <q-input
                        filled
                        v-model="agendamiento.representanteCorreo"
                        label="Correo electrónico"
                        type="email"
                        placeholder="Ej: maria.gonzalez@sena.edu.co"
                      >
                        <template v-slot:prepend>
                          <span class="material-symbols-outlined">email</span>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>

                <!-- Participantes Adicionales -->
                <div class="col-12">
                  <div class="text-subtitle2 text-weight-bold text-blue-9 q-mb-sm">Participantes Adicionales</div>

                  <div v-if="agendamiento.participantesAdicionales.length === 0" class="q-mb-md text-grey-6 text-caption">
                    No hay participantes adicionales agregados
                  </div>

                  <div v-for="(participante, idx) in agendamiento.participantesAdicionales" :key="idx" class="q-mb-md">
                    <div class="bg-blue-1 q-pa-md rounded-borders">
                      <div class="text-subtitle2 text-blue-9 q-mb-sm">Participante {{ idx + 1 }}</div>
                      <div class="row q-col-gutter-sm">
                        <div class="col-12 col-md-5">
                          <q-input
                            filled
                            v-model="participante.nombre"
                            label="Nombre completo"
                            placeholder="Nombre del participante"
                            dense
                          />
                        </div>
                        <div class="col-12 col-md-5">
                          <q-input
                            filled
                            v-model="participante.correo"
                            label="Correo electrónico"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            dense
                            :rules="[val => !val || val.includes('@') || 'El correo debe contener @']"
                          />
                        </div>
                        <div class="col-12 col-md-2 flex items-center justify-end">
                          <q-btn
                            round
                            color="red"
                            icon="delete"
                            size="sm"
                            @click="eliminarParticipanteAdicional(idx)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <q-btn
                    flat
                    color="blue-9"
                    icon="add_circle"
                    label="Agregar participante adicional"
                    @click="agregarParticipanteAdicional"
                    class="q-mt-sm"
                  />
                </div>
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" class="btn-press" @click="cerrarDialogModificar" />
          <q-btn
            v-if="pasoAgendar === 1"
            flat
            color="blue-9"
            label="Siguiente"
            @click="validarPaso1"
            class="btn-press"
          />
          <template v-else>
            <q-btn
              flat
              color="grey-7"
              label="Atrás"
              @click="pasoAgendar = 1"
              class="btn-press q-mr-sm"
            />
            <q-btn
              unelevated
              color="blue-9"
              label="Guardar cambios"
              @click="guardarModificacion"
              :loading="guardando"
              class="btn-press"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Ver Detalles -->
    <q-dialog v-model="dialogDetalles">
      <q-card class="dialog-card dialog-card-large">
        <q-card-section class="bg-green-9 dialog-header">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-weight-bold">
                DETALLES DEL COMITÉ
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" class="btn-press" v-close-popup />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md dialog-body" v-if="comiteSeleccionado">
          <!-- Información general -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Ficha:</div>
              <div class="text-subtitle2 text-weight-bold text-green-9">{{ comiteSeleccionado.ficha }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">ID Comité:</div>
              <div class="text-subtitle2">COM-{{ String(comiteSeleccionado._id).slice(-6).toUpperCase() }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Programa:</div>
              <div class="text-subtitle2">{{ comiteSeleccionado.nombrePrograma }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Estado:</div>
              <div class="text-subtitle2">{{ getEstadoLabel(comiteSeleccionado.status) }}</div>
            </div>
            <div v-if="comiteSeleccionado.meetingDate" class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Fecha reunión:</div>
              <div class="text-subtitle2">{{ formatDate(comiteSeleccionado.meetingDate) }}</div>
            </div>
            <div v-if="comiteSeleccionado.meetingTime" class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Hora:</div>
              <div class="text-subtitle2">{{ comiteSeleccionado.meetingTime }}</div>
            </div>
            <div v-if="comiteSeleccionado.meetingLocation" class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Lugar:</div>
              <div class="text-subtitle2">{{ comiteSeleccionado.meetingLocation }}</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Instructores -->
          <div class="text-h6 text-weight-bold text-green-9 q-mb-md">Instructores Involucrados</div>
          <q-list separator>
            <q-item v-for="(instructor, index) in getInstructoresOrganizados(comiteSeleccionado)" :key="'inst-'+index">
              <q-item-section avatar>
                <q-avatar :color="instructor.esCreador ? 'green-9' : 'blue-9'" text-color="white">
                  <span class="material-symbols-outlined" style="font-size: 20px">person</span>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ instructor.name }}</q-item-label>
                <q-item-label caption>{{ instructor.tpdocument || 'CC' }}: {{ instructor.numdocument }}</q-item-label>
                <q-item-label caption v-if="instructor.email">{{ instructor.email }}</q-item-label>
              </q-item-section>
              <q-item-section side v-if="instructor.esCreador">
                <q-chip size="sm" class="bg-green-10 text-white">
                  Solicitó
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator class="q-my-md" />

          <!-- Aprendices -->
          <div class="text-h6 text-weight-bold text-green-9 q-mb-md">Aprendices Involucrados</div>
          <q-list separator>
            <q-item v-for="(learner, index) in comiteSeleccionado.learners" :key="'learner-'+index">
              <q-item-section avatar>
                <q-avatar color="orange-9" text-color="white">
                  {{ learner.name?.charAt(0) || '?' }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ learner.name }}</q-item-label>
                <q-item-label caption>{{ learner.documentType }}: {{ learner.documentNumber }}</q-item-label>
                <q-item-label caption v-if="learner.email">{{ learner.email }}</q-item-label>
                <q-item-label caption class="q-mt-xs">
                  <span class="text-orange-9">{{ getNoveltyTypeLabel(learner.noveltyType) }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-chip
                  v-if="learner.decision && learner.decision !== 'PENDING'"
                  size="sm"
                  :class="getDecisionChipClass(learner.decision)"
                >
                  {{ getDecisionLabel(learner.decision) }}
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { get, put } from "../services/api.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";

const $q = useQuasar();

// Estados
const tabActual = ref("pendientes");
const cargando = ref(true);
const guardando = ref(false);
const todosComites = ref([]);
const comiteSeleccionado = ref(null);

// Dialogs
const dialogAgendar = ref(false);
const dialogModificar = ref(false);
const dialogDetalles = ref(false);

// Formulario de agendamiento extendido
const agendamiento = ref({
  fecha: "",
  hora: "",
  lugar: "",
  coordinador: null,
  instructoresInvitados: [],
  bienestar: null,
  novedades: null,
  vocero: "",
  voceroCorreo: "",
  representante: "",
  representanteCorreo: "",
  participantesAdicionales: [] // Ahora será un array de objetos { nombre, correo }
});

// Datos para selects y búsquedas
const coordinadores = ref([]);
const usuarios = ref([]);
const instructores = ref([]);
const instructoresBienestar = ref([]);
const usuariosNovedades = ref([]);

// Búsquedas
const busquedaInstructorInvitado = ref("");
const instructoresInvitadosResultados = ref([]);
const loadingInstructoresInvitados = ref(false);

const busquedaBienestar = ref("");
const bienestarResultados = ref([]);
const loadingBienestar = ref(false);

// Stepper
const pasoAgendar = ref(1);

// Fecha mínima para agendar (hoy)
const fechaMinima = computed(() => {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0];
});

// Computed: comités por estado
const comitesPendientes = computed(() => {
  return todosComites.value.filter(c => c.status === 'PENDING');
});

const comitesAgendados = computed(() => {
  return todosComites.value.filter(c => c.status === 'SCHEDULED');
});

const comitesCompletados = computed(() => {
  return todosComites.value.filter(c => c.status === 'COMPLETED');
});

const pendientesCount = computed(() => comitesPendientes.value.length);

// Función para obtener instructores organizados (primero el createdBy, luego los demás)
function getInstructoresOrganizados(comite) {
  const createdBy = comite.createdBy;
  const requestingInstructors = comite.requestingInstructors || [];
  const instructores = [];

  if (createdBy) {
    const isInRequesting = requestingInstructors.some(i => i._id === createdBy._id);

    if (isInRequesting) {
      instructores.push({
        _id: createdBy._id,
        name: createdBy.name,
        numdocument: createdBy.numdocument,
        tpdocument: createdBy.tpdocument,
        email: createdBy.email,
        esCreador: true
      });
      requestingInstructors.forEach(i => {
        if (i._id !== createdBy._id) {
          instructores.push({
            _id: i._id,
            name: i.name,
            numdocument: i.numdocument,
            tpdocument: i.tpdocument,
            email: i.email,
            esCreador: false
          });
        }
      });
    } else {
      instructores.push({
        _id: createdBy._id,
        name: createdBy.name,
        numdocument: createdBy.numdocument,
        tpdocument: createdBy.tpdocument,
        email: createdBy.email,
        esCreador: true
      });
      requestingInstructors.forEach(i => {
        instructores.push({
          _id: i._id,
          name: i.name,
          numdocument: i.numdocument,
          tpdocument: i.tpdocument,
          email: i.email,
          esCreador: false
        });
      });
    }
  } else {
    requestingInstructors.forEach(i => {
      instructores.push({
        _id: i._id,
        name: i.name,
        numdocument: i.numdocument,
        tpdocument: i.tpdocument,
        email: i.email,
        esCreador: false
      });
    });
  }

  return instructores;
}

// Funciones
async function cargarComites() {
  try {
    cargando.value = true;
    const res = await get("/comites");
    const data = Array.isArray(res) ? res : (res?.data || []);

    todosComites.value = data.map(c => ({
      ...c,
      ficha: c.fiche?.number || 'N/A',
      nombrePrograma: c.fiche?.program?.name || 'Sin nombre',
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.log("Error cargando comités:", error);
    $q.notify({ message: "Error al cargar comités", color: "red", position: "top" });
  } finally {
    cargando.value = false;
  }
}

function verDetalles(comite) {
  comiteSeleccionado.value = comite;
  dialogDetalles.value = true;
}

function agendarReunion(comite) {
  comiteSeleccionado.value = comite;
  // Cargar datos existentes si están disponibles
  const participantes = comite.meetingAdditionalParticipants || [];
  // Si los participantes son strings simples, convertirlos a objetos
  const participantesConCorreo = participantes.map(p =>
    typeof p === 'string' ? { nombre: p, correo: '' } : p
  );

  agendamiento.value = {
    fecha: comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : "",
    hora: comite.meetingTime || "",
    lugar: comite.meetingLocation || "",
    coordinador: comite.meetingCoordinador || null,
    instructoresInvitados: comite.meetingInvitedInstructors || [],
    bienestar: comite.meetingBienestar || null,
    novedades: comite.meetingNovedades || null,
    vocero: comite.meetingVocero || "",
    voceroCorreo: comite.meetingVoceroCorreo || "",
    representante: comite.meetingRepresentante || "",
    representanteCorreo: comite.meetingRepresentanteCorreo || "",
    participantesAdicionales: participantesConCorreo
  };
  pasoAgendar.value = 1;
  dialogAgendar.value = true;
}

function modificarAgendamiento(comite) {
  // Hacer petición para obtener los detalles completos del comité
  obtenerDetallesComiteParaEditar(comite, dialogModificar);
}

async function obtenerDetallesComiteParaEditar(comite, dialogRef) {
  try {
    const res = await get(`/comites/${comite._id}`);
    const comiteCompleto = res || comite; // Usar el resultado o fallback al original

    comiteSeleccionado.value = comiteCompleto;
    const participantes = comiteCompleto.meetingAdditionalParticipants || [];
    const participantesConCorreo = participantes.map(p =>
      typeof p === 'string' ? { nombre: p, correo: '' } : p
    );

    agendamiento.value = {
      fecha: comiteCompleto.meetingDate ? new Date(comiteCompleto.meetingDate).toISOString().split('T')[0] : "",
      hora: comiteCompleto.meetingTime || "",
      lugar: comiteCompleto.meetingLocation || "",
      coordinador: comiteCompleto.meetingCoordinador || null,
      instructoresInvitados: comiteCompleto.meetingInvitedInstructors || [],
      bienestar: comiteCompleto.meetingBienestar || null,
      novedades: comiteCompleto.meetingNovedades || null,
      vocero: comiteCompleto.meetingVocero || "",
      voceroCorreo: comiteCompleto.meetingVoceroCorreo || "",
      representante: comiteCompleto.meetingRepresentante || "",
      representanteCorreo: comiteCompleto.meetingRepresentanteCorreo || "",
      participantesAdicionales: participantesConCorreo
    };
    pasoAgendar.value = 1;
    dialogRef.value = true;
  } catch (error) {
    console.log("Error obteniendo detalles del comité:", error);
    // Si falla, usar el comité original como fallback
    comiteSeleccionado.value = comite;
    const participantes = comite.meetingAdditionalParticipants || [];
    const participantesConCorreo = participantes.map(p =>
      typeof p === 'string' ? { nombre: p, correo: '' } : p
    );

    agendamiento.value = {
      fecha: comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : "",
      hora: comite.meetingTime || "",
      lugar: comite.meetingLocation || "",
      coordinador: comite.meetingCoordinador || null,
      instructoresInvitados: comite.meetingInvitedInstructors || [],
      bienestar: comite.meetingBienestar || null,
      novedades: comite.meetingNovedades || null,
      vocero: comite.meetingVocero || "",
      voceroCorreo: comite.meetingVoceroCorreo || "",
      representante: comite.meetingRepresentante || "",
      representanteCorreo: comite.meetingRepresentanteCorreo || "",
      participantesAdicionales: participantesConCorreo
    };
    pasoAgendar.value = 1;
    dialogRef.value = true;
  }
}

function cerrarDialogAgendar() {
  dialogAgendar.value = false;
  comiteSeleccionado.value = null;
  pasoAgendar.value = 1;
  agendamiento.value = {
    fecha: "",
    hora: "",
    lugar: "",
    coordinador: null,
    instructoresInvitados: [],
    bienestar: null,
    novedades: null,
    vocero: "",
    voceroCorreo: "",
    representante: "",
    representanteCorreo: "",
    participantesAdicionales: []
  };
  busquedaInstructorInvitado.value = "";
  instructoresInvitadosResultados.value = [];
  busquedaBienestar.value = "";
  bienestarResultados.value = [];
}

function cerrarDialogModificar() {
  dialogModificar.value = false;
  comiteSeleccionado.value = null;
  pasoAgendar.value = 1;
  agendamiento.value = {
    fecha: "",
    hora: "",
    lugar: "",
    coordinador: null,
    instructoresInvitados: [],
    bienestar: null,
    novedades: null,
    vocero: "",
    voceroCorreo: "",
    representante: "",
    representanteCorreo: "",
    participantesAdicionales: []
  };
  busquedaInstructorInvitado.value = "";
  instructoresInvitadosResultados.value = [];
  busquedaBienestar.value = "";
  bienestarResultados.value = [];
}

async function guardarAgendamiento() {
  // Validar campos del paso 2 antes de guardar
  if (!validarPaso2()) {
    return;
  }

  // Validar que el comité seleccionado exista
  if (!comiteSeleccionado.value) {
    $q.notify({ message: "No hay comité seleccionado", color: "red", position: "top" });
    return;
  }

  try {
    guardando.value = true;
    await put(`/comites/${comiteSeleccionado.value._id}`, {
      meetingDate: agendamiento.value.fecha,
      meetingTime: agendamiento.value.hora,
      meetingLocation: agendamiento.value.lugar,
      meetingCoordinador: agendamiento.value.coordinador,
      meetingInvitedInstructors: agendamiento.value.instructoresInvitados.map(i => i._id || i),
      meetingBienestar: agendamiento.value.bienestar?._id || agendamiento.value.bienestar,
      meetingNovedades: agendamiento.value.novedades._id || agendamiento.value.novedades,
      meetingVocero: agendamiento.value.vocero,
      meetingVoceroCorreo: agendamiento.value.voceroCorreo,
      meetingRepresentante: agendamiento.value.representante,
      meetingRepresentanteCorreo: agendamiento.value.representanteCorreo,
      meetingAdditionalParticipants: agendamiento.value.participantesAdicionales,
      status: 'SCHEDULED'
    });

    $q.notify({ message: "Reunión agendada correctamente", color: "green-9", position: "top" });
    dialogAgendar.value = false;
    pasoAgendar.value = 1;
    await cargarComites();
  } catch (error) {
    console.log("Error agendando:", error);
    $q.notify({ message: "Error al agendar reunión", color: "red", position: "top" });
  } finally {
    guardando.value = false;
  }
}

async function guardarModificacion() {
  // Validar campos del paso 2 antes de guardar
  if (!validarPaso2()) {
    return;
  }

  // Validar que el comité seleccionado exista
  if (!comiteSeleccionado.value) {
    $q.notify({ message: "No hay comité seleccionado", color: "red", position: "top" });
    return;
  }

  try {
    guardando.value = true;
    await put(`/comites/${comiteSeleccionado.value._id}`, {
      meetingDate: agendamiento.value.fecha,
      meetingTime: agendamiento.value.hora,
      meetingLocation: agendamiento.value.lugar,
      meetingCoordinador: agendamiento.value.coordinador?._id || agendamiento.value.coordinador,
      meetingInvitedInstructors: agendamiento.value.instructoresInvitados.map(i => i._id || i),
      meetingBienestar: agendamiento.value.bienestar?._id || agendamiento.value.bienestar,
      meetingNovedades: agendamiento.value.novedades?._id || agendamiento.value.novedades,
      meetingVocero: agendamiento.value.vocero,
      meetingVoceroCorreo: agendamiento.value.voceroCorreo,
      meetingRepresentante: agendamiento.value.representante,
      meetingRepresentanteCorreo: agendamiento.value.representanteCorreo,
      meetingAdditionalParticipants: agendamiento.value.participantesAdicionales
    });

    $q.notify({ message: "Agendamiento modificado correctamente", color: "green-9", position: "top" });
    dialogModificar.value = false;
    pasoAgendar.value = 1;
    await cargarComites();
  } catch (error) {
    console.log("Error modificando:", error);
    $q.notify({ message: "Error al modificar agendamiento", color: "red", position: "top" });
  } finally {
    guardando.value = false;
  }
}

function confirmarCancelar(comite) {
  $q.dialog({
    title: "Cancelar Comité",
    message: `¿Estás seguro de cancelar el comité de la ficha ${comite.ficha}?`,
    ok: { label: "Sí, cancelar", class: "bg-green-9 text-white" },
    cancel: { label: "No", flat: true, class: "text-red" },
  }).onOk(async () => {
    try {
      await put(`/comites/${comite._id}/cancel`);
      $q.notify({ message: "Comité cancelado correctamente", color: "green-9", position: "top" });
      await cargarComites();
    } catch (error) {
      console.log("Error cancelando:", error);
      $q.notify({ message: "Error al cancelar comité", color: "red", position: "top" });
    }
  });
}

function marcarCompletado(comite) {
  $q.dialog({
    title: "Marcar como Completado",
    message: `¿Estás seguro de marcar como completado el comité de la ficha ${comite.ficha}?`,
    ok: { label: "Sí, completar", class: "bg-green-9 text-white" },
    cancel: { label: "No", flat: true, class: "text-red" },
  }).onOk(async () => {
    try {
      await put(`/comites/${comite._id}`, { status: 'COMPLETED' });
      $q.notify({ message: "Comité marcado como completado", color: "green-9", position: "top" });
      await cargarComites();
    } catch (error) {
      console.log("Error completando:", error);
      $q.notify({ message: "Error al marcar como completado", color: "red", position: "top" });
    }
  });
}

// Funciones de utilidad
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short'
  });
}

function getEstadoLabel(status) {
  const labels = {
    PENDING: "PENDIENTE",
    SCHEDULED: "AGENDADO",
    COMPLETED: "COMPLETADO",
    CANCELLED: "CANCELADO"
  };
  return labels[status] || status;
}

function getNoveltyTypeLabel(type) {
  const labels = {
    ACADEMIC: "ACADÉMICA",
    DISCIPLINARY: "DISCIPLINARIA",
    BOTH: "AMBAS"
  };
  return labels[type] || type;
}

function getGravedadLabel(severity) {
  const labels = {
    LIGHT: "LEVE",
    SERIOUS: "GRAVE",
    VERY_SERIOUS: "MUY GRAVE",
    PENDING: "PENDIENTE"
  };
  return labels[severity] || severity;
}

function getDecisionLabel(decision) {
  const labels = {
    PLAN_DE_MEJORAMIENTO: "Plan de Mejoramiento",
    LLAMADO_DE_ATENCION: "Llamado de Atención",
    CONDICIONAMIENTO_DE_MATRICULA: "Condicionamiento",
    CANCELACION_DE_MATRICULA: "Cancelación",
    OTRA: "Otra",
    PENDING: "Pendiente"
  };
  return labels[decision] || decision;
}

function getDecisionChipClass(decision) {
  const classes = {
    PLAN_DE_MEJORAMIENTO: "bg-yellow-1 text-yellow-9",
    LLAMADO_DE_ATENCION: "bg-orange-1 text-orange-9",
    CONDICIONAMIENTO_DE_MATRICULA: "bg-red-1 text-red-9",
    CANCELACION_DE_MATRICULA: "bg-red text-white",
    OTRA: "bg-grey-2 text-grey-8",
    PENDING: "bg-grey-4 text-white"
  };
  return classes[decision] || "bg-grey-2";
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIONES PARA CARGAR DATOS DE SELECTS Y BÚSQUEDAS
// ══════════════════════════════════════════════════════════════════════════════

async function cargarDatosIniciales() {
  try {
    // Cargar coordinadores
    const resCoordinadores = await get("/users/onlycoordinator");
    coordinadores.value = Array.isArray(resCoordinadores) ? resCoordinadores : (resCoordinadores?.data || []);

    // Cargar todos los usuarios (para filtrar novedades)
    const resUsuarios = await get("/users");
    const allUsers = Array.isArray(resUsuarios) ? resUsuarios : (resUsuarios?.data || []);
    usuariosNovedades.value = allUsers.filter(u => u.role === 'NOVEDADES');

    // Cargar todos los instructores (para filtrar por knowledge)
    const resInstructores = await get("/instructors");
    const allInstructors = Array.isArray(resInstructores) ? resInstructores : (resInstructores?.data || []);
    instructores.value = allInstructors;
    instructoresBienestar.value = allInstructors.filter(i => i.knowledge === 'INSTITUCIONAL DE PEDAGOGÍA');
  } catch (error) {
    console.log("Error cargando datos iniciales:", error);
  }
}

// Búsqueda de instructores invitados
async function buscarInstructorInvitado() {
  const query = busquedaInstructorInvitado.value?.trim();
  if (!query) {
    instructoresInvitadosResultados.value = [];
    return;
  }

  try {
    loadingInstructoresInvitados.value = true;
    const allInstructors = instructores.value.filter(i => i.status === 0);
    const queryLower = query.toLowerCase();
    const creadorId = comiteSeleccionado.value?.createdBy?._id;

    instructoresInvitadosResultados.value = allInstructors.filter(i =>
      (i.name?.toLowerCase().includes(queryLower) ||
      i.numdocument?.includes(queryLower)) &&
      !agendamiento.value.instructoresInvitados.some(agregado => agregado._id === i._id) &&
      i._id !== creadorId // Excluir al instructor que creó el comité
    );

    // Mostrar aviso si no se encontraron resultados
    if (instructoresInvitadosResultados.value.length === 0) {
      $q.notify({
        message: "No se encontraron instructores con ese criterio de búsqueda",
        color: "orange",
        position: "top",
        timeout: 3000
      });
    }
  } catch (error) {
    console.log("Error buscando instructores:", error);
    instructoresInvitadosResultados.value = [];
  } finally {
    loadingInstructoresInvitados.value = false;
  }
}

function agregarInstructorInvitado(instructor) {
  // Validar que solo haya 1 instructor invitado
  if (agendamiento.value.instructoresInvitados.length >= 1) {
    $q.notify({
      message: "Solo puedes agregar 1 instructor invitado",
      color: "orange",
      position: "top"
    });
    return;
  }

  agendamiento.value.instructoresInvitados.push(instructor);
  busquedaInstructorInvitado.value = "";
  instructoresInvitadosResultados.value = [];
}

function eliminarInstructorInvitado(id) {
  agendamiento.value.instructoresInvitados = agendamiento.value.instructoresInvitados.filter(i => i._id !== id);
}

// Validar campos del paso 1 antes de avanzar
function validarPaso1() {
  // Campos obligatorios del paso 1
  const camposObligatorios = {
    fecha: "Fecha de reunión",
    hora: "Hora",
    lugar: "Lugar de reunión",
    coordinador: "Coordinador",
    novedades: "Novedades",
    bienestar: "Bienestar al Aprendiz"
  };

  const camposVacios = [];

  if (!agendamiento.value.fecha) camposVacios.push(camposObligatorios.fecha);
  if (!agendamiento.value.hora) camposVacios.push(camposObligatorios.hora);
  if (!agendamiento.value.lugar) camposVacios.push(camposObligatorios.lugar);
  if (!agendamiento.value.coordinador) camposVacios.push(camposObligatorios.coordinador);
  if (!agendamiento.value.novedades) camposVacios.push(camposObligatorios.novedades);
  if (!agendamiento.value.bienestar) camposVacios.push(camposObligatorios.bienestar);

  if (camposVacios.length > 0) {
    $q.notify({
      message: `Por favor completa los campos obligatorios: ${camposVacios.join(", ")}`,
      color: "orange",
      position: "top",
      timeout: 3000
    });
    return;
  }

  // Si todos los campos están completos, avanzar al paso 2
  pasoAgendar.value = 2;
}

// Validar campos del paso 2 antes de guardar
function validarPaso2() {
  // Campos obligatorios del paso 2
  const camposObligatorios = {
    vocero: "Nombre del Vocero",
    voceroCorreo: "Correo del Vocero",
    representante: "Nombre del Representante",
    representanteCorreo: "Correo del Representante"
  };

  const camposVacios = [];

  if (!agendamiento.value.vocero) camposVacios.push(camposObligatorios.vocero);
  if (!agendamiento.value.voceroCorreo) camposVacios.push(camposObligatorios.voceroCorreo);
  if (!agendamiento.value.representante) camposVacios.push(camposObligatorios.representante);
  if (!agendamiento.value.representanteCorreo) camposVacios.push(camposObligatorios.representanteCorreo);

  if (camposVacios.length > 0) {
    $q.notify({
      message: `Por favor completa los campos obligatorios: ${camposVacios.join(", ")}`,
      color: "orange",
      position: "top",
      timeout: 3000
    });
    return false;
  }

  // Validar correos tengan @
  if (!agendamiento.value.voceroCorreo.includes('@')) {
    $q.notify({
      message: "El correo del vocero debe contener @",
      color: "orange",
      position: "top"
    });
    return false;
  }

  if (!agendamiento.value.representanteCorreo.includes('@')) {
    $q.notify({
      message: "El correo del representante debe contener @",
      color: "orange",
      position: "top"
    });
    return false;
  }

  return true;
}

// Búsqueda de bienestar
async function buscarBienestar() {
  const query = busquedaBienestar.value?.trim();
  if (!query) {
    bienestarResultados.value = [];
    return;
  }

  try {
    loadingBienestar.value = true;
    const queryLower = query.toLowerCase();

    bienestarResultados.value = instructoresBienestar.value.filter(i =>
      (i.name?.toLowerCase().includes(queryLower) ||
      i.numdocument?.includes(queryLower)) &&
      agendamiento.value.bienestar?._id !== i._id
    );

    // Mostrar aviso si no se encontraron resultados
    if (bienestarResultados.value.length === 0) {
      $q.notify({
        message: "No se encontraron instructores de bienestar con ese criterio de búsqueda",
        color: "orange",
        position: "top",
        timeout: 3000
      });
    }
  } catch (error) {
    console.log("Error buscando bienestar:", error);
    bienestarResultados.value = [];
  } finally {
    loadingBienestar.value = false;
  }
}

function seleccionarBienestar(instructor) {
  agendamiento.value.bienestar = instructor;
  busquedaBienestar.value = "";
  bienestarResultados.value = [];
}

// Agregar participante adicional
function agregarParticipanteAdicional() {
  agendamiento.value.participantesAdicionales.push({ nombre: "", correo: "" });
}

function eliminarParticipanteAdicional(index) {
  agendamiento.value.participantesAdicionales.splice(index, 1);
}

onMounted(() => {
  cargarComites();
  cargarDatosIniciales();
});
</script>

<style scoped>
/* Definir variables CSS locales para este componente */
.gestion-comites {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
.gestion-comites {
  opacity: 0;
  animation: fadeIn 300ms var(--ease-out) forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

/* ========================================
   Tabs - Verde más vivo
   ======================================== */
.tabs-container {
  background: linear-gradient(135deg, #2e7d32, #43a047) !important;
  border-radius: 12px;
  overflow: hidden;
}

.tabs-container :deep(.q-tab) {
  color: rgba(255, 255, 255, 0.85) !important;
  font-weight: 500;
  transition: all 200ms var(--ease-out);
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

/* ========================================
   Contenedor de comités
   ======================================== */
.comites-container {
  padding: 4px;
}

/* ========================================
   Cards de comités - Más compactas
   ======================================== */
.comite-card {
  border-radius: 12px;
  overflow: hidden;
  opacity: 0;
  animation: fadeSlideUp 350ms var(--ease-out) forwards;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 200ms var(--ease-out),
              transform 200ms var(--ease-out);
}

.comite-card-horizontal {
  border-radius: 8px;
  opacity: 0;
  animation: fadeSlideIn 300ms var(--ease-out) forwards;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: box-shadow 150ms var(--ease-out);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (hover: hover) and (pointer: fine) {
  .comite-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  .comite-card-horizontal:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.card-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-body {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-actions {
  background-color: #fafafa;
}

/* ========================================
   Ficha Badge
   ======================================== */
.ficha-badge {
  background: linear-gradient(135deg, #2e7d32, #43a047);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 16px;
}

.ficha-pendiente {
  background: linear-gradient(135deg, #ff9800, #f57c00);
}

.ficha-agendado {
  background: linear-gradient(135deg, #1565c0, #1976d2);
}

.ficha-completado {
  background: linear-gradient(135deg, #2e7d32, #43a047);
}

/* ========================================
   Botones con feedback táctil
   ======================================== */
.btn-press {
  position: relative;
  transition: transform 160ms var(--ease-out);
}

.btn-press:active {
  transform: scale(0.97);
}

@media (hover: none) and (pointer: coarse) {
  .btn-press:active {
    transform: none;
  }
}

/* ========================================
   Dialog
   ======================================== */
.dialog-card {
  width: 500px !important;
  max-width: 90vw !important;
  border-radius: 16px;
  opacity: 0;
  animation: scaleIn 300ms var(--ease-out) forwards;
}

.dialog-card-large {
  width: 700px !important;
  max-width: 90vw !important;
  border-radius: 16px;
  opacity: 0;
  animation: scaleIn 300ms var(--ease-out) forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dialog-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

.dialog-body {
  max-height: calc(90vh - 200px);
  overflow-y: auto;
}

/* ========================================
   Tab panels
   ======================================== */
:deep(.q-tab-panels) {
  background: transparent !important;
}

:deep(.q-tab-panel) {
  padding: 0 !important;
}

/* ========================================
   Accessibility
   ======================================== */
@media (prefers-reduced-motion: reduce) {
  .comite-card,
  .comite-card-horizontal,
  .gestion-comites,
  .dialog-card,
  .dialog-card-large {
    animation: fadeIn 200ms ease;
  }

  @keyframes fadeIn {
    to { opacity: 1; }
  }

  .btn-press:active {
    transform: none;
  }
}
</style>
