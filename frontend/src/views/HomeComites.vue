<template>
  <div>
    <BtnBack route="/home/instructor" />
    <HeaderLayout title="Comités" />

    <div class="row q-my-xl justify-center row-tittle">
      <div class="col-12 text-center text-h5 text-weight-bold">
        MÓDULO DE COMITÉS
      </div>
    </div>

    <div class="row q-my-xl justify-center">
      <div class="col-10 col-md-8 text-center">
        <q-card class="q-pa-xl">
          <q-card-section>
            <div class="text-h6 text-weight-bold text-green-9">
              Bienvenido al módulo de Comités
            </div>
            <div class="text-subtitle1 q-mt-md">
              Aquí podrás gestionar los comités y sus actividades.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import BtnBack from "../layouts/btnBackLayout.vue";
import HeaderLayout from "../layouts/headerViewsLayout.vue";
</script>

<style scoped>
.row-tittle {
  margin-top: 50px;
}
</style>
