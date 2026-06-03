<template>
  <div>
    <HeaderLayout title="Gestión de Comités" />
    <BtnBack route="/home/comites" />

    <q-page class="q-pa-lg flex flex-center">
      <q-card class="q-pa-xl text-center shadow-2" style="border-radius: 20px; max-width: 500px;">
        <q-card-section>
          <q-icon name="handshake" size="80px" color="green-9" class="q-mb-md" />
          <div class="text-h5 text-weight-bold text-green-9 q-mb-md">
            Gestión de Comités
          </div>
          <div class="text-subtitle1 text-grey-7">
            Sección en blanco. Pronto podrás administrar los comités desde aquí.
          </div>
        </q-card-section>
      </q-card>
    </q-page>
  </div>
</template>

<script setup>
import HeaderLayout from "../layouts/headerViewsLayout.vue";
import BtnBack from "../layouts/btnBackLayout.vue";
</script>

<style scoped>
</style>
