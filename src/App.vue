<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Menu from '@/components/Menu.vue'

const rota = useRoute()
const paginaLogin = computed(() => rota.path === '/login')
</script>

<template>
  <div class="estrutura-aplicacao">
    <Menu v-show="!paginaLogin" />
    <main :class="{ 'conteudo-principal': !paginaLogin, 'conteudo-tela-cheia': paginaLogin }">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

body {
  background-color: #f5f6f8;
  color: #1f2937;
}

.conteudo-principal {
  margin-left: 240px;
  padding: 28px 36px;
  min-height: 100vh;
}

.conteudo-tela-cheia {
  width: 100%;
  min-height: 100vh;
}
</style>