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
                        <span class="text-caption text-grey-7">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-orange-1 text-orange-9"
                          dense
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
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
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
                        <span class="text-caption text-grey-7">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-blue-2 text-blue-9"
                          dense
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
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
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
                        <span class="text-caption text-grey-7">Aprendices:</span>
                        <q-chip
                          v-for="(learner, idx) in comite.learners.slice(0, 3)"
                          :key="'l-'+idx"
                          size="sm"
                          class="bg-green-2 text-green-9"
                          dense
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
                      <div class="row items-center q-gutter-xs no-wrap">
                        <span class="text-caption text-grey-7">Instructores:</span>
                        <q-chip
                          v-for="(instructor, idx) in getInstructoresOrganizados(comite).slice(0, 2)"
                          :key="'i-'+idx"
                          size="sm"
                          :class="instructor.esCreador ? 'bg-green-9 text-white' : 'bg-green-1 text-green-9'"
                          dense
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
      <q-card class="dialog-card">
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

          <div class="row q-col-gutter-md q-mt-md">
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
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" class="btn-press" @click="cerrarDialogAgendar" />
          <q-btn
            unelevated
            color="green-9"
            label="Agendar"
            @click="guardarAgendamiento"
            :loading="guardando"
            class="btn-press"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Modificar Agendamiento -->
    <q-dialog v-model="dialogModificar" persistent>
      <q-card class="dialog-card">
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

          <div class="row q-col-gutter-md q-mt-md">
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
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" class="btn-press" @click="cerrarDialogModificar" />
          <q-btn
            unelevated
            color="blue-9"
            label="Guardar cambios"
            @click="guardarModificacion"
            :loading="guardando"
            class="btn-press"
          />
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

// Formulario de agendamiento
const agendamiento = ref({
  fecha: "",
  hora: "",
  lugar: ""
});

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
  agendamiento.value = {
    fecha: comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : "",
    hora: comite.meetingTime || "",
    lugar: comite.meetingLocation || ""
  };
  dialogAgendar.value = true;
}

function modificarAgendamiento(comite) {
  comiteSeleccionado.value = comite;
  agendamiento.value = {
    fecha: comite.meetingDate ? new Date(comite.meetingDate).toISOString().split('T')[0] : "",
    hora: comite.meetingTime || "",
    lugar: comite.meetingLocation || ""
  };
  dialogModificar.value = true;
}

function cerrarDialogAgendar() {
  dialogAgendar.value = false;
  comiteSeleccionado.value = null;
  agendamiento.value = { fecha: "", hora: "", lugar: "" };
}

function cerrarDialogModificar() {
  dialogModificar.value = false;
  comiteSeleccionado.value = null;
  agendamiento.value = { fecha: "", hora: "", lugar: "" };
}

async function guardarAgendamiento() {
  if (!agendamiento.value.fecha || !agendamiento.value.hora || !agendamiento.value.lugar) {
    $q.notify({ message: "Completa todos los campos", color: "orange", position: "top" });
    return;
  }

  try {
    guardando.value = true;
    await put(`/comites/${comiteSeleccionado.value._id}`, {
      meetingDate: agendamiento.value.fecha,
      meetingTime: agendamiento.value.hora,
      meetingLocation: agendamiento.value.lugar,
      status: 'SCHEDULED'
    });

    $q.notify({ message: "Reunión agendada correctamente", color: "green-9", position: "top" });
    dialogAgendar.value = false;
    await cargarComites();
  } catch (error) {
    console.log("Error agendando:", error);
    $q.notify({ message: "Error al agendar reunión", color: "red", position: "top" });
  } finally {
    guardando.value = false;
  }
}

async function guardarModificacion() {
  if (!agendamiento.value.fecha || !agendamiento.value.hora || !agendamiento.value.lugar) {
    $q.notify({ message: "Completa todos los campos", color: "orange", position: "top" });
    return;
  }

  try {
    guardando.value = true;
    await put(`/comites/${comiteSeleccionado.value._id}`, {
      meetingDate: agendamiento.value.fecha,
      meetingTime: agendamiento.value.hora,
      meetingLocation: agendamiento.value.lugar
    });

    $q.notify({ message: "Agendamiento modificado correctamente", color: "green-9", position: "top" });
    dialogModificar.value = false;
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

onMounted(() => {
  cargarComites();
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
  font-size: 13px;
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
