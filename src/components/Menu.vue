<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import iconeCasaVermelha from '@/assets/icones/casavermelha.svg'
import iconePredioCinza from '@/assets/icones/prediocinza.svg'
import iconeAlertaCinza from '@/assets/icones/alertacinza.svg'
import iconePessoa from '@/assets/icones/pessoa.svg'
import iconeEngrenagem from '@/assets/icones/engrenagem.svg'

const roteador = useRouter()
const menuEngrenagemAberto = ref(false)

const alternarMenuEngrenagem = () => {
  menuEngrenagemAberto.value = !menuEngrenagemAberto.value
}

const irParaLogin = () => {
  menuEngrenagemAberto.value = false
  localStorage.removeItem('usuario')
  localStorage.removeItem('token')
  roteador.push('/login')
}

</script>

<template>
  <aside class="menu-lateral">
    <div class="topo-menu">
      <div class="cabecalho-menu">
        <div class="caixa-logo">M</div>
        <div class="texto-logo">
          <strong>MÓVEIS MEDEIROS</strong>
          <span>SISTEMA DE OBRAS</span>
        </div>
      </div>

      <nav class="navegacao-menu">
        <router-link to="/" class="item-navegacao" exact-active-class="ativo">
          <img :src="iconeCasaVermelha" alt="Início" class="icone-menu" />
          <span>Início</span>
        </router-link>

        <router-link to="/obras" class="item-navegacao" active-class="ativo">
          <img :src="iconePredioCinza" alt="Obras" class="icone-menu" />
          <span>Obras</span>
        </router-link>

        <router-link to="/ocorrencias" class="item-navegacao" active-class="ativo">
          <img :src="iconeAlertaCinza" alt="Ocorrências" class="icone-menu" />
          <span>Ocorrências</span>
        </router-link>
      </nav>
    </div>

  <div class="rodape-sidebar">
  <div v-if="menuEngrenagemAberto" class="menu-popover-engrenagem">
    <button type="button" class="item-menu-engrenagem" @click="irParaLogin">
      <img :src="iconePessoa" alt="Login" />
      <span>Login</span>
    </button>
  </div>

  <div class="cartao-usuario-sidebar">
    <div class="avatar-sidebar">
      <img :src="iconePessoa" alt="Usuário" />
    </div>

    <div class="info-usuario-sidebar">
      <strong>Móveis Medeiros</strong>
      <span>Operação Canteiro</span>
    </div>

    <button
      type="button"
      class="botao-engrenagem"
      title="Opções"
      @click="alternarMenuEngrenagem"
    >
      <img :src="iconeEngrenagem" alt="Configurações" />
    </button>
  </div>
</div>
  </aside>
</template>

<style scoped>

.rodape-sidebar {
  position: relative;
  margin-top: auto;
}

.menu-popover-engrenagem {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  left: 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12);
  z-index: 40;
}

.item-menu-engrenagem {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  border-radius: 7px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.item-menu-engrenagem:hover {
  background-color: #fef2f2;
  color: #c8102e;
}

.item-menu-engrenagem img {
  width: 15px;
  height: 15px;
  opacity: 0.75;
}

.cartao-usuario-sidebar {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 10px 12px;
}

.avatar-sidebar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background-color: #c8102e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-sidebar img {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
}

.info-usuario-sidebar {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.info-usuario-sidebar strong {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-usuario-sidebar span {
  font-size: 11px;
  color: #64748b;
}

.botao-engrenagem {
  background: none;
  border: none;
  padding: 5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.botao-engrenagem:hover {
  background-color: #e2e8f0;
}

.botao-engrenagem img {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.menu-lateral {
  width: 240px;
  height: 100vh;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  left: 0;
  top: 0;
  padding: 20px 14px;
}

.topo-menu {
  display: flex;
  flex-direction: column;
}

.cabecalho-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.caixa-logo {
  width: 36px;
  height: 36px;
  background-color: #c8102e;
  color: #ffffff;
  font-weight: 800;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.texto-logo {
  display: flex;
  flex-direction: column;
  font-size: 12.5px;
  color: #0f172a;
}

.texto-logo span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-top: 2px;
}

.navegacao-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 20px;
}

.item-navegacao {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #475569;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.2s;
}

.item-navegacao:hover {
  background-color: #f8fafc;
}

.item-navegacao.ativo {
  background-color: #fee2e2;
  color: #c8102e;
  font-weight: 700;
}

.icone-menu {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.rodape-menu {
  padding-top: 14px;
  border-top: 1px solid #f3f4f6;
}

.cartao-usuario-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 10px;
}

.avatar-usuario {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: #c8102e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icone-avatar {
  width: 15px;
  height: 15px;
  filter: brightness(0) invert(1);
}

.info-usuario {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: #0f172a;
}

.info-usuario strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-usuario small {
  color: #64748b;
  font-size: 10.5px;
}

.botao-configuracao {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.icone-engrenagem {
  width: 15px;
  height: 15px;
  opacity: 0.7;
}
</style>