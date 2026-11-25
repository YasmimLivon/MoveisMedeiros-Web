<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import iconeOlho from '@/assets/icones/olho.svg'

const roteador = useRouter()

const campoUsuario = ref('')
const campoSenha = ref('')
const mostrarSenha = ref(false)
const carregando = ref(false)
const mensagemErro = ref('')

const realizarLogin = async () => {
  mensagemErro.value = ''
  carregando.value = true

  try {
    const resposta = await api.post('/Auth/login', {
      login: campoUsuario.value,
      senha: campoSenha.value
    })

    if (resposta.data?.token) {
      localStorage.setItem('token', resposta.data.token)
    }
    localStorage.setItem('usuario', JSON.stringify(resposta.data))

    roteador.push('/')
  } catch (erro) {
    console.error('Erro detalhado no login:', erro)
    if (erro.response?.status === 401) {
      mensagemErro.value = 'E-mail/CPF ou senha inválidos.'
    } else if (erro.response?.status === 400) {
      mensagemErro.value = 'Dados inválidos. Verifique os campos enviados.'
    } else {
      mensagemErro.value = 'Erro ao conectar com a API.'
    }
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="pagina-login">
    <div class="cartao-login">
      <div class="brilho-cartao"></div>

      <div class="cabecalho-cartao">
        <div class="quadrado-logo">M</div>
        <h1>Móveis Medeiros</h1>
        <span class="subtitulo">ACESSO INTERNO</span>
      </div>

      <form @submit.prevent="realizarLogin" class="formulario-login">
        <div class="grupo-campo">
          <label for="usuario">E-mail ou CNPJ/CPF</label>
          <input
            id="usuario"
            v-model="campoUsuario"
            type="text"
            placeholder="ex: contato@marcenaria.com ou 000.000.000-00"
            required
          />
        </div>

        <div class="grupo-campo">
          <label for="senha">Senha</label>
          <div class="caixa-senha">
            <input
              id="senha"
              v-model="campoSenha"
              :type="mostrarSenha ? 'text' : 'password'"
              placeholder="Digite sua senha de acesso"
              required
            />
            <button
              type="button"
              class="botao-ver-senha"
              @click="mostrarSenha = !mostrarSenha"
              title="Mostrar ou ocultar senha"
            >
              <img
                :src="iconeOlho"
                alt="Mostrar ou ocultar senha"
                class="icone-olho"
                :class="{ ativo: mostrarSenha }"
              />
            </button>
          </div>
        </div>

        <p v-if="mensagemErro" class="texto-erro">{{ mensagemErro }}</p>

        <button type="submit" class="botao-entrar" :disabled="carregando">
          <span v-if="!carregando">Entrar →</span>
          <span v-else>Entrando...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.pagina-login {
  min-height: 100vh;
  width: 100%;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cartao-login {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 410px;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 44px 36px 48px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.brilho-cartao {
  position: absolute;
  top: -35px;
  right: -35px;
  width: 130px;
  height: 130px;
  background: radial-gradient(circle, rgba(200, 30, 43, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.cabecalho-cartao {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 30px;
}

.quadrado-logo {
  width: 48px;
  height: 48px;
  background-color: #c8102e;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.cabecalho-cartao h1 {
  font-size: 21px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.subtitulo {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #475569;
  text-transform: uppercase;
}

.formulario-login {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grupo-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grupo-campo label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.grupo-campo input {
  width: 100%;
  height: 42px;
  background-color: #f1f3f5;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 14px;
  font-size: 12.5px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.grupo-campo input::placeholder {
  color: #94a3b8;
}

.grupo-campo input:focus {
  background-color: #ffffff;
  border-color: #c8102e;
}

.caixa-senha {
  position: relative;
  display: flex;
  align-items: center;
}

.caixa-senha input {
  padding-right: 40px;
}

.botao-ver-senha {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.icone-olho {
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.65;
  transition: opacity 0.2s;
}

.icone-olho.ativo {
  opacity: 1;
}

.texto-erro {
  font-size: 12px;
  color: #c8102e;
  background-color: #fef2f2;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
}

.botao-entrar {
  margin-top: 8px;
  width: 100%;
  height: 42px;
  background-color: #c8102e;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-entrar:hover:not(:disabled) {
  background-color: #a50d26;
}

.botao-entrar:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>