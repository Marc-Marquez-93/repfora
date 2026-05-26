<template>
  <div>
    <HeaderLayout title="Complementarias" />
    <BtnBack route="/home/instructor" />

    <div class="row justify-center">
      <div class="col-10 col-sm-6 col-md-4 col-lg-4 items-center flex q-my-lg">
        <q-card class="my-card shadow-8 full-width">
          <q-card-section class="bg-green-9 q-px-lg">
            <h4 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
              REPFORA
            </h4>
          </q-card-section>

          <div class="column items-center q-mt-md">
            <img
              src="/images/LOGO-SENA.png"
              style="height: 100px; width: 100px"
            />
          </div>

          <q-card-section class="text-center">
            <div class="text-h5 text-weight-bold">ACCESO COMPLEMENTARIAS</div>
          </q-card-section>
          <q-separator />

          <q-card-section class="q-px-lg q-pb-lg">
            <!-- Estado DOC_VERIFIED: enviar código -->
            <div v-if="state === 'DOC_VERIFIED'" class="text-center">
              <div class="text-subtitle2 q-mb-lg">
                Para acceder al módulo de complementarias, genera un código de
                verificación que será enviado a tus correos registrados.
              </div>
              <q-card-actions class="column items-center">
                <q-btn
                  label="ENVIAR CÓDIGO"
                  icon="send"
                  class="save_as"
                  style="width: 50%"
                  :loading="loading"
                  @click="sendCode"
                />
              </q-card-actions>
            </div>

            <!-- Estado CODE_SENT: ingresar OTP -->
            <div v-if="state === 'CODE_SENT'">
              <div
                class="bg-green-1 text-green-9 q-pa-md rounded-borders q-mb-md text-center"
              >
                <q-icon
                  name="mark_email_read"
                  color="green-9"
                  size="md"
                  class="q-mb-xs"
                />
                <div class="text-weight-bold q-mb-xs">
                  Código enviado exitosamente
                </div>
                <div class="text-caption q-mb-sm">
                  Se envió un código de verificación a:
                </div>
                <div
                  v-for="mail in sentEmails"
                  :key="mail"
                  class="text-weight-bold q-px-md q-py-xs bg-green-2 rounded-borders q-mt-xs"
                >
                  {{ maskEmail(mail) }}
                </div>
              </div>

              <q-separator class="q-mb-md" />

              <div class="text-subtitle2 text-center q-mb-sm">
                Ingrese el código de 6 dígitos:
              </div>
              <div class="row justify-center q-gutter-sm q-mb-sm">
                <q-input
                  v-for="(_, index) in otpDigits"
                  :key="index"
                  :ref="(el) => (otpRefs[index] = el)"
                  v-model="otpDigits[index]"
                  class="otp-input"
                  outlined
                  dense
                  maxlength="1"
                  inputmode="numeric"
                  :disable="loading"
                  @update:model-value="(v) => onOtpInput(v, index)"
                  @keydown.backspace="onBackspace(index)"
                />
              </div>

              <div
                v-if="codeError"
                class="text-negative text-caption text-center q-mb-sm"
              >
                {{ codeError }}
              </div>

              <!-- Countdown expiración -->
              <div class="text-center text-caption text-grey-7 q-mb-md">
                <span v-if="expiryCountdown > 0">
                  Expira en: {{ formatTime(expiryCountdown) }}
                </span>
                <span v-else class="text-negative">El código ha expirado</span>
              </div>

              <!-- Botón reenviar -->
              <q-card-actions class="column items-center">
                <q-btn
                  :label="
                    resendCountdown > 0
                      ? `Reenviar en ${resendCountdown}s`
                      : 'Reenviar código'
                  "
                  icon="refresh"
                  flat
                  color="green-9"
                  :disable="resendCountdown > 0 || loading"
                  :loading="loading"
                  @click="sendCode"
                />
              </q-card-actions>
            </div>

            <!-- Estado NO_ACCESS: sin instToken -->
            <div v-if="state === 'NO_ACCESS'" class="text-center q-py-md">
              <q-icon name="warning" color="orange-7" size="48px" />
              <div class="text-subtitle2 q-mt-md">
                Debes consultar tu información como instructor antes de acceder
                a este módulo.
              </div>
              <q-card-actions class="column items-center q-mt-md">
                <q-btn
                  label="IR A CONSULTA"
                  icon="arrow_back"
                  class="button_style"
                  @click="router.push('/consultor')"
                />
              </q-card-actions>
            </div>

            <!-- Estado CODE_VERIFIED -->
            <div v-if="state === 'CODE_VERIFIED'" class="text-center q-py-md">
              <q-icon name="check_circle" color="green-7" size="64px" />
              <div class="text-h6 text-green-9 q-mt-md">¡Acceso concedido!</div>
              <div class="text-caption text-grey-7 q-mt-sm">
                Redirigiendo...
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { post } from "../services/api.js";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import BtnBack from "../layouts/btnBackLayout.vue";
import { storeUser } from "../store/users";
import { notifySuccessRequest, notifyErrorRequest } from "../common/notify";

// ─── Setup ────────────────────────────────────────────────────────────────────
const router = useRouter();
const useStore = storeUser();

// ─── Estado ───────────────────────────────────────────────────────────────────
console.log("=== [LoginComplementarias] token:", useStore.token, "| email:", useStore.email, "| instructor:", useStore.newConsult);
const state = ref(useStore.token ? "DOC_VERIFIED" : "NO_ACCESS");
const loading = ref(false);
const sentEmails = ref([]);
const codeError = ref("");
const otpDigits = ref(["", "", "", "", "", ""]);
const otpRefs = ref([]);
const resendCountdown = ref(0);
const expiryCountdown = ref(0);
let resendTimer = null;
let expiryTimer = null;

// ─── Enviar código ────────────────────────────────────────────────────────────
async function sendCode() {
  console.log("=== [send-code] token:", useStore.token, "| email:", useStore.email);
  codeError.value = "";
  loading.value = true;
  clearTimers();
  try {
    const res = await post("/complementary/access/send-code", { email: useStore.email });
    sentEmails.value = res.emails || [];
    otpDigits.value = ["", "", "", "", "", ""];
    state.value = "CODE_SENT";
    notifySuccessRequest("Código enviado a tus correos");
    startResendCountdown();
    startExpiryCountdown();
  } catch (err) {
    console.log("=== [send-code] Error ===", err?.response?.data);
    const msg =
      err?.response?.data?.msg ||
      "No se pudo enviar el código. Intenta de nuevo.";
    if (state.value === "CODE_SENT") codeError.value = msg;
    else notifyErrorRequest(msg);
  } finally {
    loading.value = false;
  }
}

// ─── Verificar código ─────────────────────────────────────────────────────────
async function verifyCode() {
  codeError.value = "";
  loading.value = true;
  const code = otpDigits.value.join("");
  try {
    const res = await post("/complementary/access/verify-code", { email: useStore.email, code });
    console.log("=== [verify-code] token recibido:", res.token);
    useStore.token = res.token;
    if (res.instructor) useStore.instructorData = res.instructor;
    clearTimers();
    state.value = "CODE_VERIFIED";
    notifySuccessRequest("Acceso a complementarias concedido");
    setTimeout(() => router.push("/home/complementarias"), 3000);
  } catch (err) {
    console.log("=== [verify-code] Error ===", err?.response?.data);
    const msg =
      err?.response?.data?.msg || "Código incorrecto. Intenta de nuevo.";
    codeError.value = msg;
    otpDigits.value = ["", "", "", "", "", ""];
    if (otpRefs.value[0]) otpRefs.value[0].focus();
  } finally {
    loading.value = false;
  }
}

// ─── Inputs OTP ───────────────────────────────────────────────────────────────
// Avanza al siguiente campo al escribir; al completar los 6 dígitos verifica automáticamente
function onOtpInput(val, i) {
  otpDigits.value[i] = val ? val.slice(-1) : "";
  if (otpDigits.value[i] && i < 5) otpRefs.value[i + 1]?.focus();
  if (otpDigits.value.every((d) => d !== "")) verifyCode();
}

// Retrocede al campo anterior si el actual está vacío
function onBackspace(i) {
  if (!otpDigits.value[i] && i > 0) otpRefs.value[i - 1]?.focus();
}

// ─── Contadores ───────────────────────────────────────────────────────────────
function startResendCountdown() {
  resendCountdown.value = 30;
  resendTimer = setInterval(() => {
    if (--resendCountdown.value <= 0) clearInterval(resendTimer);
  }, 1000);
}

// Al expirar el código regresa al estado inicial para que el instructor lo reenvíe
function startExpiryCountdown() {
  expiryCountdown.value = 300;
  expiryTimer = setInterval(() => {
    if (--expiryCountdown.value <= 0) {
      clearTimers();
      codeError.value = "";
      state.value = "DOC_VERIFIED";
    }
  }, 1000);
}

function clearTimers() {
  clearInterval(resendTimer);
  clearInterval(expiryTimer);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function maskEmail(email) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 3)}****@${domain}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

onUnmounted(clearTimers);
</script>

<style scoped>
.save_as {
  font-size: 18px;
  background-color: var(--color_button);
  color: var(--color_text_button);
}

.otp-input {
  width: 48px;
}

.otp-input :deep(.q-field__control) {
  justify-content: center;
}

.otp-input :deep(input) {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}
</style>
