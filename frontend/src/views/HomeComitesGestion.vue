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
                      <div class="row items-center">
                        <div class="ficha-badge">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="status-chip status-pending">
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                        <!-- Badge de solicitud de cancelación -->
                        <q-chip v-if="comite.cancellationRequested && comite.cancellationStatus === 'PENDING'"
                          size="sm"
                          class="status-chip status-cancel"
                          icon="pending_actions"
                        >
                          Solicita cancelación
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <q-icon name="school" size="16px" class="text-grey-5">
                          <q-tooltip>Aprendices</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="chip-neutral"
                          dense
                        >
                          {{ learner.name }}
                          <q-tooltip>{{ learner.documentType }}: {{ learner.documentNumber }}</q-tooltip>
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="chip-more" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <q-icon name="person" size="16px" class="text-grey-5">
                          <q-tooltip>Instructores</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'chip-creator' : 'chip-neutral'"
                          dense
                        >
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="chip-more" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Fecha -->
                    <div class="col-auto">
                      <span class="text-caption text-grey-5">{{ formatDateShort(comite.createdAt) }}</span>
                    </div>

                    <!-- Botones -->
                    <div class="col-auto">
                      <div class="row q-gutter-xs">
                        <!-- Botones normales (sin solicitud de cancelación) -->
                        <template v-if="!(comite.cancellationRequested && comite.cancellationStatus === 'PENDING')">
                          <q-btn
                            flat round
                            color="grey-6"
                            icon="info_outline"
                            class="btn-press action-icon-btn"
                            @click="verDetalles(comite)"
                          >
                            <q-tooltip>Detalles</q-tooltip>
                          </q-btn>
                          <q-btn
                            flat round
                            color="negative"
                            icon="cancel"
                            class="btn-press action-icon-btn"
                            @click="confirmarCancelar(comite)"
                          >
                            <q-tooltip>Cancelar comité</q-tooltip>
                          </q-btn>
                          <q-btn
                            unelevated round
                            color="green-9"
                            icon="event_available"
                            class="btn-press action-icon-btn"
                            @click="agendarReunion(comite)"
                          >
                            <q-tooltip>Agendar reunión</q-tooltip>
                          </q-btn>
                        </template>

                        <!-- Botones cuando hay solicitud de cancelación pendiente -->
                        <template v-else>
                          <q-btn
                            flat round
                            color="grey-6"
                            icon="info_outline"
                            class="btn-press action-icon-btn"
                            @click="verDetalles(comite)"
                          >
                            <q-tooltip>Detalles</q-tooltip>
                          </q-btn>
                          <q-btn
                            unelevated round
                            color="green-9"
                            icon="check_circle"
                            class="btn-press action-icon-btn"
                            @click="aprobarCancelacion(comite)"
                          >
                            <q-tooltip>Aprobar cancelación</q-tooltip>
                          </q-btn>
                          <q-btn
                            unelevated round
                            color="negative"
                            icon="block"
                            class="btn-press action-icon-btn"
                            @click="rechazarCancelacion(comite)"
                          >
                            <q-tooltip>Rechazar cancelación</q-tooltip>
                          </q-btn>
                        </template>
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
                class="comite-card-horizontal q-mb-sm"
                :style="{ animationDelay: `${index * 40}ms` }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-col-gutter-sm">
                    <!-- Ficha y Estado -->
                    <div class="col-auto">
                      <div class="row items-center">
                        <div class="ficha-badge">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="status-chip status-scheduled" dense>
                          <q-icon name="event" size="13px" class="q-mr-xs" />
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <q-icon name="school" size="16px" class="text-grey-5">
                          <q-tooltip>Aprendices</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="chip-neutral"
                          dense
                        >
                          {{ learner.name }}
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="chip-more" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <q-icon name="person" size="16px" class="text-grey-5">
                          <q-tooltip>Instructores</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'chip-creator' : 'chip-neutral'"
                          dense
                        >
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="chip-more" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Fecha reunión -->
                    <div class="col-auto">
                      <div class="row items-center q-gutter-xs">
                        <q-icon name="schedule" size="15px" class="text-grey-5" />
                        <span class="text-caption text-grey-6">{{ formatDate(comite.meetingDate) }}</span>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Botones -->
                    <div class="col-auto">
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat round
                          color="grey-6"
                          icon="info_outline"
                          class="btn-press action-icon-btn"
                          @click="verDetalles(comite)"
                        >
                          <q-tooltip>Detalles</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat round
                          color="green-9"
                          icon="picture_as_pdf"
                          class="btn-press action-icon-btn"
                          @click="verOrdenDelDiaPDF(comite)"
                        >
                          <q-tooltip>Ver Orden del Día</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat round
                          color="grey-6"
                          icon="edit_calendar"
                          class="btn-press action-icon-btn"
                          @click="modificarAgendamiento(comite)"
                        >
                          <q-tooltip>Modificar agendamiento</q-tooltip>
                        </q-btn>
                        <q-btn
                          unelevated round
                          color="green-9"
                          icon="task_alt"
                          class="btn-press action-icon-btn"
                          @click="marcarCompletado(comite)"
                        >
                          <q-tooltip>Marcar como completado</q-tooltip>
                        </q-btn>
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
                class="comite-card-horizontal q-mb-sm"
                :style="{ animationDelay: `${index * 40}ms` }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-col-gutter-sm">
                    <!-- Ficha y Estado -->
                    <div class="col-auto">
                      <div class="row items-center">
                        <div class="ficha-badge">
                          <span class="text-weight-bold">{{ comite.ficha }}</span>
                        </div>
                        <q-chip size="sm" class="status-chip status-completed" dense>
                          <q-icon name="check" size="13px" class="q-mr-xs" />
                          {{ getEstadoLabel(comite.status) }}
                        </q-chip>
                        <q-chip v-if="comite.resolutionNumber" size="sm" class="chip-resolution" dense>
                          <q-icon name="gavel" size="12px" class="q-mr-xs" />
                          {{ comite.resolutionNumber }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Aprendices -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs no-wrap">
                        <q-icon name="school" size="16px" class="text-grey-5">
                          <q-tooltip>Aprendices</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="chip-neutral"
                          dense
                        >
                          {{ learner.name }}
                        </q-chip>
                        <q-chip v-if="comite.learners.length > 3" size="sm" class="chip-more" dense>
                          +{{ comite.learners.length - 3 }}
                        </q-chip>
                      </div>
                    </div>

                    <!-- Separador -->
                    <div class="col-auto sep-line">|</div>

                    <!-- Instructores -->
                    <div class="col">
                      <div class="row items-center q-gutter-xs">
                        <q-icon name="person" size="16px" class="text-grey-5">
                          <q-tooltip>Instructores</q-tooltip>
                        </q-icon>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'chip-creator' : 'chip-neutral'"
                          dense
                        >
                          {{ instructor.name }}
                          <q-tooltip v-if="instructor.esCreador">Solicitó el comité</q-tooltip>
                        </q-chip>
                        <q-chip v-if="getInstructoresOrganizados(comite).length > 2" size="sm" class="chip-more" dense>
                          +{{ getInstructoresOrganizados(comite).length - 2 }}
                        </q-chip>
                      </div>
                    </div>



                    <!-- Botones -->
                    <div class="col-auto">
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat round
                          color="grey-6"
                          icon="info_outline"
                          class="btn-press action-icon-btn"
                          @click="verDetalles(comite)"
                        >
                          <q-tooltip>Detalles</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat round
                          color="green-9"
                          icon="picture_as_pdf"
                          class="btn-press action-icon-btn"
                          @click="verActaCierrePDF(comite)"
                        >
                          <q-tooltip>Ver Acta de Cierre</q-tooltip>
                        </q-btn>
                      </div>
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
    <q-dialog v-model="dialogDetalles" v-if="comiteSeleccionado">
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

        <q-card-section class="q-pa-md dialog-body">
          <!-- Loading indicator -->
          <div v-if="loadingDetalles" class="flex flex-center q-pa-xl">
            <q-spinner color="green-9" size="3em" />
            <div class="text-caption text-grey-7 q-ml-md">Cargando detalles...</div>
          </div>

          <!-- Content when loaded -->
          <div v-else>
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
                <!-- Mostrar severidad individual -->
                <q-chip
                  v-if="learner.severidad"
                  size="sm"
                  outline
                  color="grey-8"
                  class="q-mr-xs"
                >
                  Falta: {{ (learner.severidad === 'LEVE' || learner.severidad === 'LIGHT') ? 'Leve' : (learner.severidad === 'GRAVE' || learner.severidad === 'SERIOUS') ? 'Grave' : (learner.severidad === 'GRAVISIMA' || learner.severidad === 'VERY_SERIOUS') ? 'Gravísima' : learner.severidad }}
                </q-chip>

                <!-- Mostrar múltiples decisiones -->
                <div class="row q-gutter-xs justify-end inline" v-if="learner.decisiones && learner.decisiones.length > 0">
                  <q-chip
                    v-for="(dec, dIdx) in learner.decisiones"
                    :key="'dec-'+dIdx"
                    size="sm"
                    :class="getDecisionChipClass(dec)"
                  >
                    {{ getDecisionLabel(dec) }}
                  </q-chip>
                </div>

                <!-- Fallback a decisión única (si fue un comité antiguo) -->
                <q-chip
                  v-else-if="learner.decision && learner.decision !== 'PENDING'"
                  size="sm"
                  :class="getDecisionChipClass(learner.decision)"
                >
                  {{ getDecisionLabel(learner.decision) }}
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>
          </div>
          <!-- Fin del contenido cuando está cargado -->
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-sm" v-if="!loadingDetalles">
          <q-btn 
            v-if="comiteSeleccionado.status === 'SCHEDULED'" 
            unelevated 
            color="green-9" 
            icon="description" 
            label="Orden del Día" 
            @click="generarOrdenDelDia(comiteSeleccionado)" 
          />
          <q-btn 
            v-if="comiteSeleccionado.status === 'COMPLETED'" 
            unelevated 
            color="green-9" 
            icon="description" 
            label="Acta de Cierre" 
            @click="generarActaCierre(comiteSeleccionado)" 
          />
          <q-btn flat label="Cerrar" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Completar Comité -->
    <q-dialog v-model="dialogCompletar" persistent>
      <q-card class="dialog-card dialog-card-large">
        <q-card-section class="bg-green-9 dialog-header">
          <div class="row items-center">
            <div class="col-10">
              <h5 class="q-mt-sm q-mb-sm text-white text-weight-bold">
                EVALUACIÓN Y CIERRE DE COMITÉ
              </h5>
            </div>
            <div class="col-2 text-right">
              <q-btn flat round icon="close" color="white" class="btn-press" @click="dialogCompletar = false" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md dialog-body">
          <div v-if="comiteSeleccionado" class="q-mb-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-6">
                <div class="text-subtitle2 text-weight-bold text-green-9">
                  Ficha: {{ comiteSeleccionado.ficha }}
                </div>
                <div class="text-caption text-grey-7">{{ comiteSeleccionado.nombrePrograma }}</div>
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  filled
                  dense
                  v-model="completarInstructoresInvitados"
                  multiple
                  use-chips
                  :options="instructores"
                  option-label="name"
                  option-value="_id"
                  emit-value
                  map-options
                  label="Instructores Invitados (Editar)"
                  class="bg-white"
                />
              </div>
            </div>
          </div>

          <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-sm">Evaluación por Aprendiz</div>

          <q-list bordered class="rounded-borders">
            <q-expansion-item
              v-for="(data, index) in completarData"
              :key="data.learnerId"
              group="aprendices"
              default-opened
              header-style="min-height: 75px; padding: 12px 16px; overflow: visible;"
            >
              <template v-slot:header>
                <q-item-section avatar style="overflow: visible;">
                  <q-avatar icon="school" color="green-9" text-color="white" size="sm" />
                </q-item-section>
                <q-item-section style="overflow: visible; padding-top: 4px;">
                  <q-item-label class="text-weight-bold text-green-9" style="line-height: 1.5; font-size: 14px;">{{ data.name }}</q-item-label>
                  <q-item-label caption style="line-height: 1.5; font-size: 12px; margin-top: 2px;">{{ data.documentType }}: {{ data.documentNumber }}</q-item-label>
                </q-item-section>
              </template>
              <q-card>
                <q-card-section class="q-pt-none">
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-md-6">
                      <q-select
                        filled
                        v-model="data.severidad"
                        :options="opcionesSeveridad"
                        label="Severidad de la Falta *"
                        emit-value
                        map-options
                      >
                        <template v-slot:prepend>
                          <q-icon name="report_problem" />
                        </template>
                      </q-select>
                    </div>
                    <div class="col-12 col-md-6">
                      <q-select
                        filled
                        v-model="data.decisiones"
                        :options="getOpcionesDecision(data)"
                        label="Decisión(es) a Tomar *"
                        multiple
                        emit-value
                        map-options
                        use-chips
                        @update:model-value="onDecisionesChange(data)"
                      >
                        <template v-slot:prepend>
                          <q-icon name="gavel" />
                        </template>
                        <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                          <q-item v-bind="itemProps" :disable="opt.disable">
                            <q-item-section side>
                              <q-checkbox :model-value="selected" @update:model-value="toggleOption(opt)" :disable="opt.disable" color="green-9" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label v-html="opt.label" />
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                    </div>
                  </div>

                  <!-- FLUJO CONDICIONAL -->
                  <div v-if="data.decisiones.length > 0" class="q-mt-md">
                    
                    <!-- Ruta B: Plan de Mejoramiento -->
                    <div v-if="data.decisiones.includes('PLAN_MEJORAMIENTO')" class="q-mb-md">
                      <q-card class="bg-blue-1 no-shadow bordered border-blue-2">
                        <q-card-section>
                          <div class="text-subtitle2 text-blue-9 q-mb-sm">Plan de Mejoramiento</div>
                          <div class="row q-col-gutter-sm">
                            <div class="col-12">
                              <q-select
                                filled
                                v-model="data.instructoresPlan"
                                :options="data.instructoresDisponibles"
                                option-label="name"
                                option-value="_id"
                                label="Instructores Encargados *"
                                multiple
                                emit-value
                                map-options
                                use-chips
                                bg-color="white"
                                @update:model-value="onInstructoresPlanChange(data)"
                              />
                            </div>
                            
                            <!-- Campos dinámicos por instructor -->
                            <div class="col-12" v-for="(plan, pIdx) in data.planesMejoramiento" :key="'plan-'+pIdx">
                              <div class="bg-white q-pa-sm rounded-borders border-blue-2 q-mb-sm">
                                <div class="text-caption text-weight-bold text-blue-8 q-mb-xs">
                                  Plan a cargo de: {{ getInstructorName(plan.instructorId, data.instructoresDisponibles) }}
                                </div>
                                <div class="row q-col-gutter-sm">
                                  <div class="col-12 col-md-8">
                                    <q-input
                                      filled dense
                                      v-model="plan.descripcion"
                                      label="Descripción del plan *"
                                    />
                                  </div>
                                  <div class="col-12 col-md-4">
                                    <q-input
                                      filled dense
                                      v-model="plan.fechaMaxima"
                                      label="Fecha límite *"
                                      type="date"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </q-card-section>
                      </q-card>
                    </div>

                    <!-- Ruta C: Condicionamiento / Cancelación -->
                    <div v-if="data.decisiones.includes('CONDICIONAMIENTO') || data.decisiones.includes('CANCELACION')" class="q-mb-md">
                      <q-card class="bg-red-1 no-shadow bordered border-red-2">
                        <q-card-section>
                          <!-- Vista de Confirmación inicial -->
                          <div v-if="!data.confirmacionRutaC" class="text-center q-pa-sm">
                            <q-icon name="warning" color="red-9" size="md" class="q-mb-sm" />
                            <div class="text-subtitle2 text-red-9 q-mb-md">
                              ¿Está seguro de que desea aplicar <strong>{{ data.decisiones.includes('CANCELACION') ? 'Cancelación' : 'Condicionamiento' }} de Matrícula</strong> a este aprendiz?
                            </div>
                            <q-btn unelevated color="red-9" label="Sí, aplicar sanción" @click="data.confirmacionRutaC = true" class="q-mr-sm" />
                            <q-btn outline color="grey-8" label="Quitar decisión" @click="quitarDecisionSevera(data)" />
                          </div>

                          <!-- Formulario de Resolución -->
                          <div v-else>
                            <div class="row items-center justify-between q-mb-sm">
                              <div class="text-subtitle2 text-red-9">
                                Datos de Resolución ({{ data.decisiones.includes('CANCELACION') ? 'Cancelación' : 'Condicionamiento' }})
                              </div>
                              <q-btn flat round color="grey-7" icon="undo" size="sm" @click="data.confirmacionRutaC = false">
                                <q-tooltip>Volver a confirmar</q-tooltip>
                              </q-btn>
                            </div>

                            <q-checkbox 
                              v-model="data.resolucionDespues" 
                              label="Añadir esta información después (Guardar temporalmente)" 
                              color="red-9"
                              class="q-mb-sm"
                            />

                            <div class="row q-col-gutter-sm" v-if="!data.resolucionDespues">
                              <div class="col-12 col-md-6">
                                <q-input
                                  filled dense bg-color="white"
                                  v-model="data.resolucionNumero"
                                  label="Número de Resolución *"
                                />
                              </div>
                              <div class="col-12 col-md-6">
                                <q-input
                                  filled dense bg-color="white"
                                  v-model="data.resolucionFecha"
                                  label="Fecha de Resolución *"
                                  type="date"
                                />
                              </div>
                            </div>
                          </div>
                        </q-card-section>
                      </q-card>
                    </div>

                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" class="btn-press" @click="dialogCompletar = false" />
          <q-btn
            unelevated
            color="green-9"
            label="Completar Comité"
            @click="guardarCompletado"
            :loading="guardando"
            class="btn-press"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import { get, put, post } from "../services/api.js";
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import { generarOrdenDelDia, generarActaCierre } from "../utils/pdfComites.js";

const $q = useQuasar();

// Estados
const tabActual = ref("pendientes");
const cargando = ref(true);
const guardando = ref(false);
const todosComites = ref([]);
const comiteSeleccionado = ref(null);
const loadingDetalles = ref(false);

// Dialogs
const dialogAgendar = ref(false);
const dialogModificar = ref(false);
const dialogDetalles = ref(false);
const dialogCompletar = ref(false);

const completarData = ref([]);
const completarInstructoresInvitados = ref([]);

const opcionesSeveridad = [
  { label: 'Leve', value: 'LEVE' },
  { label: 'Grave', value: 'GRAVE' },
  { label: 'Gravísima', value: 'GRAVISIMA' }
];

function getOpcionesDecision(learnerData) {
  return [
    { label: 'Plan de Mejoramiento', value: 'PLAN_MEJORAMIENTO' },
    { label: 'Llamado de Atención', value: 'LLAMADO_ATENCION' },
    { label: 'Condicionamiento de Matrícula', value: 'CONDICIONAMIENTO', disable: learnerData.decisiones.includes('CANCELACION') },
    { label: 'Cancelación de Matrícula', value: 'CANCELACION', disable: learnerData.decisiones.includes('CONDICIONAMIENTO') }
  ];
}

// Eventos de la vista condicional
function onDecisionesChange(data) {
  // Limpiar datos de Ruta B si se desmarcó
  if (!data.decisiones.includes('PLAN_MEJORAMIENTO')) {
    data.instructoresPlan = [];
    data.planesMejoramiento = [];
  }
  // Limpiar datos de Ruta C si se desmarcó
  if (!data.decisiones.includes('CONDICIONAMIENTO') && !data.decisiones.includes('CANCELACION')) {
    data.confirmacionRutaC = false;
    data.resolucionNumero = '';
    data.resolucionFecha = '';
    data.resolucionDespues = false;
  }
}

function onInstructoresPlanChange(data) {
  // Sincronizar el array de planes con los instructores seleccionados
  const nuevosPlanes = [];
  for (const instructorId of data.instructoresPlan) {
    const planExistente = data.planesMejoramiento.find(p => p.instructorId === instructorId);
    if (planExistente) {
      nuevosPlanes.push(planExistente);
    } else {
      nuevosPlanes.push({ instructorId, descripcion: '', fechaMaxima: '' });
    }
  }
  data.planesMejoramiento = nuevosPlanes;
}

function quitarDecisionSevera(data) {
  data.decisiones = data.decisiones.filter(d => d !== 'CONDICIONAMIENTO' && d !== 'CANCELACION');
  onDecisionesChange(data);
}

function getInstructorName(instructorId, lista) {
  const inst = lista.find(i => i._id === instructorId);
  return inst ? inst.name : 'Desconocido';
}

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


async function verDetalles(comite) {
  console.log("=== verDetalles llamado ===");
  console.log("Comite recibido:", comite);

  try {
    loadingDetalles.value = true;

    // Primero asignar el comite de la lista para que haya algo inmediatamente
    comiteSeleccionado.value = {
      ...comite,
      ficha: comite.ficha || 'N/A',
      nombrePrograma: comite.nombrePrograma || 'Sin nombre'
    };
    console.log("Comité inicial asignado:", comiteSeleccionado.value);

    // Abrir el diálogo
    dialogDetalles.value = true;
    console.log("Diálogo abierto:", dialogDetalles.value);

    // Luego obtener los detalles completos
    console.log("Obteniendo detalles del comité:", comite._id);
    const res = await get(`/comites/${comite._id}`);
    console.log("Respuesta del backend:", res);

    // Manejar diferentes estructuras de respuesta
    let data = res;
    if (res?.data && typeof res.data === 'object') {
      data = res.data;
    }

    // Actualizar con los datos completos
    if (data && data._id) {
      comiteSeleccionado.value = {
        ...data,
        ficha: data.fiche?.number || data.ficha || comite.ficha || 'N/A',
        nombrePrograma: data.fiche?.program?.name || data.nombrePrograma || comite.nombrePrograma || 'Sin nombre'
      };
      console.log("Comité actualizado con datos completos:", comiteSeleccionado.value);
    }
  } catch (error) {
    console.error("Error obteniendo detalles del comité:", error);
    // Si hay error, al menos ya asignamos el comite de la lista al principio
    $q.notify({
      message: "Usando información básica del comité",
      color: "orange",
      position: "top",
      timeout: 2000
    });
  } finally {
    loadingDetalles.value = false;
    console.log("=== verDetalles completado ===");
  }
}

async function verOrdenDelDiaPDF(comite) {
  try {
    $q.loading.show({ message: 'Generando PDF...' });
    const res = await get(`/comites/${comite._id}`);
    const comiteFresquito = res?.data || res;
    const comiteMapeado = {
      ...comiteFresquito,
      ficha: comiteFresquito.fiche?.number || comite.ficha || 'N/A',
      nombrePrograma: comiteFresquito.fiche?.program?.name || comite.nombrePrograma || 'Sin nombre'
    };
    await generarOrdenDelDia(comiteMapeado);
  } catch (error) {
    console.error("Error al visualizar PDF:", error);
    $q.notify({ message: "No se pudo generar el PDF", color: "red", position: "top" });
  } finally {
    $q.loading.hide();
  }
}

async function verActaCierrePDF(comite) {
  try {
    $q.loading.show({ message: 'Generando PDF...' });
    const res = await get(`/comites/${comite._id}`);
    const comiteFresquito = res?.data || res;
    const comiteMapeado = {
      ...comiteFresquito,
      ficha: comiteFresquito.fiche?.number || comite.ficha || 'N/A',
      nombrePrograma: comiteFresquito.fiche?.program?.name || comite.nombrePrograma || 'Sin nombre'
    };
    await generarActaCierre(comiteMapeado);
  } catch (error) {
    console.error("Error al visualizar PDF:", error);
    $q.notify({ message: "No se pudo generar el PDF", color: "red", position: "top" });
  } finally {
    $q.loading.hide();
  }
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
    const data = res?.data || res || comite; // Usar el resultado o fallback al original
    const comiteCompleto = {
      ...data,
      ficha: data.fiche?.number || comite.ficha || 'N/A',
      nombrePrograma: data.fiche?.program?.name || comite.nombrePrograma || 'Sin nombre'
    };

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

    const comiteId = comiteSeleccionado.value._id;

    // Generar PDF Orden del Día (sin bloquear)
    try {
      const resDetalle = await get(`/comites/${comiteId}`);
      const comiteFresquito = resDetalle?.data || resDetalle;
      generarOrdenDelDia(comiteFresquito);
    } catch (pdfErr) {
      console.error("Error generando PDF de Orden del Día:", pdfErr);
      $q.notify({ message: "No se pudo abrir el PDF de Orden del Día", color: "orange-9", position: "top" });
    }

    // Enviar correo de citación (en segundo plano, sin bloquear)
    post(`/comites/${comiteId}/send-email`, { tipo: 'CITACION' })
      .then(() => $q.notify({ message: "Correos de citación enviados", color: "green-9", position: "top", timeout: 3000 }))
      .catch(() => $q.notify({ message: "No se pudieron enviar los correos de citación", color: "orange-9", position: "top" }));

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

    // Enviar correo de modificación (en segundo plano)
    post(`/comites/${comiteSeleccionado.value._id}/send-email`, { tipo: 'MODIFICACION' })
      .then(() => $q.notify({ message: "Correos de modificación enviados", color: "green-9", position: "top", timeout: 3000 }))
      .catch(() => $q.notify({ message: "No se pudieron enviar los correos de modificación", color: "orange-9", position: "top" }));

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

async function aprobarCancelacion(comite) {
  $q.dialog({
    title: "Aprobar Cancelación",
    message: `¿Estás seguro de aprobar la cancelación del comité de la ficha ${comite.ficha}?`,
    ok: { label: "Sí, aprobar", class: "bg-green-9 text-white" },
    cancel: { label: "No", flat: true, class: "text-red" },
    prompt: {
      model: "",
      type: "text",
      label: "Nota (opcional)"
    }
  }).onOk(async (note) => {
    try {
      await put(`/comites/${comite._id}/approve-cancellation`, { note });
      $q.notify({ message: "Cancelación aprobada correctamente", color: "green-9", position: "top" });
      await cargarComites();
    } catch (error) {
      console.log("Error aprobando cancelación:", error);
      $q.notify({ message: "Error al aprobar la cancelación", color: "red", position: "top" });
    }
  });
}

async function rechazarCancelacion(comite) {
  $q.dialog({
    title: "Rechazar Cancelación",
    message: `¿Estás seguro de rechazar la solicitud de cancelación del comité de la ficha ${comite.ficha}?`,
    ok: { label: "Sí, rechazar", class: "bg-red text-white" },
    cancel: { label: "No", flat: true, class: "text-grey" },
    prompt: {
      model: "",
      type: "text",
      label: "Nota del rechazo (opcional)"
    }
  }).onOk(async (note) => {
    try {
      await put(`/comites/${comite._id}/reject-cancellation`, { note });
      $q.notify({ message: "Solicitud de cancelación rechazada correctamente", color: "green-9", position: "top" });
      await cargarComites();
    } catch (error) {
      console.log("Error rechazando cancelación:", error);
      $q.notify({ message: "Error al rechazar la cancelación", color: "red", position: "top" });
    }
  });
}

function marcarCompletado(comite) {
  comiteSeleccionado.value = comite;
  
  // Pre-calcular los instructores del comité para Ruta B
  const instructoresDisponibles = getInstructoresOrganizados(comite);
  
  completarData.value = (comite.learners || []).map(l => ({
    learnerId: l._id,
    name: l.name,
    documentType: l.documentType || 'CC',
    documentNumber: l.documentNumber || '',
    severidad: null,
    decisiones: [],
    // Ruta B: Plan de Mejoramiento
    instructoresPlan: [],
    planesMejoramiento: [], // Guardará { instructorId, descripcion, fechaMaxima }
    instructoresDisponibles, // Opciones para el q-select
    // Ruta C: Condicionamiento / Cancelación
    confirmacionRutaC: false,
    resolucionNumero: '',
    resolucionFecha: '',
    resolucionDespues: false
  }));
  completarInstructoresInvitados.value = (comite.meetingInvitedInstructors || []).map(i => i._id || i);
  dialogCompletar.value = true;
}

async function guardarCompletado() {
  // Validar
  for (const data of completarData.value) {
    if (!data.severidad) {
      $q.notify({ message: `Falta seleccionar severidad para ${data.name}`, color: 'red', position: 'top' });
      return;
    }
    if (!data.decisiones || data.decisiones.length === 0) {
      $q.notify({ message: `Falta seleccionar al menos una decisión para ${data.name}`, color: 'red', position: 'top' });
      return;
    }
    
    // Validar Ruta B
    if (data.decisiones.includes('PLAN_MEJORAMIENTO')) {
      if (data.instructoresPlan.length === 0) {
        $q.notify({ message: `Selecciona al menos un instructor para el plan de ${data.name}`, color: 'red', position: 'top' });
        return;
      }
      for (const plan of data.planesMejoramiento) {
        if (!plan.descripcion || !plan.fechaMaxima) {
          $q.notify({ message: `Completa la descripción y fecha del plan para ${data.name}`, color: 'red', position: 'top' });
          return;
        }
      }
    }

    // Validar Ruta C
    if (data.decisiones.includes('CONDICIONAMIENTO') || data.decisiones.includes('CANCELACION')) {
      if (!data.confirmacionRutaC) {
        $q.notify({ message: `Debes confirmar la sanción de ${data.name}`, color: 'red', position: 'top' });
        return;
      }
      if (!data.resolucionDespues && (!data.resolucionNumero || !data.resolucionFecha)) {
        $q.notify({ message: `Ingresa el número y fecha de resolución para ${data.name}`, color: 'red', position: 'top' });
        return;
      }
    }
  }

  try {
    guardando.value = true;
    const payload = {
      status: 'COMPLETED',
      meetingInvitedInstructors: completarInstructoresInvitados.value,
      learners: completarData.value.map(data => ({
        ...data,
        _id: data.learnerId
      }))
    };
    await put(`/comites/${comiteSeleccionado.value._id}`, payload);
    $q.notify({ message: "Comité marcado como completado", color: "green-9", position: "top" });
    dialogCompletar.value = false;

    const comiteId = comiteSeleccionado.value._id;

    // Generar PDF Acta de Cierre (sin bloquear)
    try {
      const resDetalle = await get(`/comites/${comiteId}`);
      const comiteFresquito = resDetalle?.data || resDetalle;
      generarActaCierre(comiteFresquito);
    } catch (pdfErr) {
      console.error("Error generando PDF de Acta de Cierre:", pdfErr);
      $q.notify({ message: "No se pudo abrir el PDF de Acta de Cierre", color: "orange-9", position: "top" });
    }

    // Enviar correo de finalización (en segundo plano)
    post(`/comites/${comiteId}/send-email`, { tipo: 'FINALIZACION' })
      .then(() => $q.notify({ message: "Correos de finalización enviados", color: "green-9", position: "top", timeout: 3000 }))
      .catch(() => $q.notify({ message: "No se pudieron enviar los correos de finalización", color: "orange-9", position: "top" }));

    await cargarComites();
  } catch (error) {
    console.log("Error completando:", error);
    $q.notify({ message: "Error al marcar como completado", color: "red", position: "top" });
  } finally {
    guardando.value = false;
  }
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
    BOTH: "LOS DOS TIPOS"
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
    PLAN_MEJORAMIENTO: "Plan de Mejoramiento",
    LLAMADO_DE_ATENCION: "Llamado de Atención",
    LLAMADO_ATENCION: "Llamado de Atención",
    CONDICIONAMIENTO_DE_MATRICULA: "Condicionamiento",
    CONDICIONAMIENTO: "Condicionamiento",
    CANCELACION_DE_MATRICULA: "Cancelación",
    CANCELACION: "Cancelación",
    OTRA: "Otra",
    PENDING: "Pendiente"
  };
  return labels[decision] || decision;
}

function getDecisionChipClass(decision) {
  const classes = {
    PLAN_DE_MEJORAMIENTO: "bg-yellow-1 text-yellow-9",
    PLAN_MEJORAMIENTO: "bg-yellow-1 text-yellow-9",
    LLAMADO_DE_ATENCION: "bg-orange-1 text-orange-9",
    LLAMADO_ATENCION: "bg-orange-1 text-orange-9",
    CONDICIONAMIENTO_DE_MATRICULA: "bg-red-1 text-red-9",
    CONDICIONAMIENTO: "bg-red-1 text-red-9",
    CANCELACION_DE_MATRICULA: "bg-red text-white",
    CANCELACION: "bg-red text-white",
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
  font-size: 13px;
}

/* Forzar tamaño de fuente uniforme en todos los hijos de la card */
.comite-card-horizontal :deep(.q-chip__content),
.comite-card-horizontal :deep(.q-chip),
.comite-card-horizontal .text-caption,
.comite-card-horizontal span {
  font-size: 13px !important;
}

/* Alinear verticalmente los chips al mismo alto */
.comite-card-horizontal :deep(.q-chip) {
  height: 24px;
  line-height: 24px;
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
   Ficha Badge - Neutro unificado
   ======================================== */
.ficha-badge {
  background: #455a64;
  color: white;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  height: 24px;
  line-height: 24px;
  display: inline-flex;
  align-items: center;
}

/* ========================================
   Status chips
   ======================================== */
.status-chip {
  font-size: 13px !important;
  font-weight: 600;
  border-radius: 4px !important;
  margin: 0 0 0 8px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
}

.status-pending {
  background: #fff3e0 !important;
  color: #e65100 !important;
  border: 1px solid #ffcc80;
}

.status-scheduled {
  background: #e8eaf6 !important;
  color: #283593 !important;
  border: 1px solid #9fa8da;
}

.status-completed {
  background: #e8f5e9 !important;
  color: #1b5e20 !important;
  border: 1px solid #a5d6a7;
}

.status-cancel {
  background: #fce4ec !important;
  color: #b71c1c !important;
  border: 1px solid #f48fb1;
}

/* ========================================
   Chips neutrales
   ======================================== */
.chip-neutral {
  background: #f5f5f5 !important;
  color: #424242 !important;
  border: 1px solid #e0e0e0 !important;
}

.chip-creator {
  background: #eceff1 !important;
  color: #263238 !important;
  border: 1px solid #b0bec5 !important;
  font-weight: 600;
}

.chip-more {
  background: #eeeeee !important;
  color: #757575 !important;
  font-weight: 600;
}

.chip-resolution {
  background: #f3e5f5 !important;
  color: #4a148c !important;
  border: 1px solid #ce93d8 !important;
  margin: 0 0 0 8px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
}

/* ========================================
   Separador de columnas
   ======================================== */
.sep-line {
  color: #e0e0e0;
  font-size: 18px;
  user-select: none;
}

/* ========================================
   Botones de acción icon-only
   ======================================== */
.action-icon-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  max-width: 28px !important;
  min-height: 28px !important;
  max-height: 28px !important;
  padding: 0 !important;
  border-radius: 50% !important;
}

.action-icon-btn :deep(.q-icon) {
  font-size: 15px !important;
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
  animation: scaleIn 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.dialog-card-large {
  width: 700px !important;
  max-width: 90vw !important;
  border-radius: 16px;
  opacity: 0;
  animation: scaleIn 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
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
