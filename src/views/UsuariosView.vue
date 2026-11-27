<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const roteador = useRouter()

const email = ref('')
const senha = ref('')
const carregando = ref(false)
const mensagemErro = ref('')

const realizarLogin = async () => {
  mensagemErro.value = ''

  if (!email.value.trim() || !senha.value.trim()) {
    mensagemErro.value = 'Preencha o e-mail e a senha para entrar.'
    return
  }

  carregando.value = true

  try {
    const resposta = await api.post('/Usuario/login', {
      email: email.value.trim(),
      senha: senha.value
    })

    const dados = resposta.data || {}
    const usuarioObj = dados.usuario || dados.user || dados

    if (!usuarioObj || (!usuarioObj.id && !usuarioObj.Id && !usuarioObj.usuarioId)) {
      mensagemErro.value = 'Resposta de autenticação inválida. Verifique os dados do usuário.'
      return
    }

    const usuarioNormalizado = {
      ...usuarioObj,
      id: Number(usuarioObj.id || usuarioObj.Id || usuarioObj.usuarioId)
    }

    localStorage.setItem('usuario', JSON.stringify(usuarioNormalizado))

    if (dados.token) {
      localStorage.setItem('token', dados.token)
    }

    roteador.push('/')
  } catch (erro) {
    console.error('Erro ao realizar login:', erro)

    if (erro.response?.status === 401 || erro.response?.status === 400 || erro.response?.status === 404) {
      mensagemErro.value =
        typeof erro.response.data === 'string'
          ? erro.response.data
          : 'E-mail ou senha inválidos.'
    } else {
      mensagemErro.value = 'Não foi possível conectar ao servidor. Verifique se a API está rodando.'
    }
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="pagina-login">
    <div class="cartao-login">
      <div class="cabecalho-login">
        <div class="logo-login">M</div>
        <div class="titulos-login">
          <h1>MÓVEIS MEDEIROS</h1>
          <span>SISTEMA DE GESTÃO DE OBRAS</span>
        </div>
      </div>

      <p class="subtitulo-login">
        Acesse sua conta para gerenciar obras, clientes e ocorrências de montagem.
      </p>

      <div v-if="mensagemErro" class="alerta-erro">
        {{ mensagemErro }}
      </div>

      <form class="formulario-login" @submit.prevent="realizarLogin">
        <div class="campo-grupo">
          <label for="email">E-mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="seuemail@moveismedeiros.com.br"
            autocomplete="email"
            required
          />
        </div>

        <div class="campo-grupo">
          <label for="senha">Senha</label>
          <input
            id="senha"
            v-model="senha"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="botao-entrar" :disabled="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar no Sistema' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.pagina-login {
  min-height: 100vh;
  width: 100%;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.cartao-login {
  width: 100%;
  max-width: 420px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08);
}

.cabecalho-login {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo-login {
  width: 44px;
  height: 44px;
  background-color: #c8102e;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.titulos-login {
  display: flex;
  flex-direction: column;
}

.titulos-login h1 {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: 0.02em;
}

.titulos-login span {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.subtitulo-login {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.alerta-erro {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 18px;
}

.formulario-login {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.campo-grupo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campo-grupo label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.campo-grupo input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  background-color: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.campo-grupo input:focus {
  outline: none;
  border-color: #c8102e;
  box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.12);
}

.botao-entrar {
  margin-top: 6px;
  width: 100%;
  padding: 12px;
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s;
}

.botao-entrar:hover:not(:disabled) {
  background-color: #a50d26;
}

.botao-entrar:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>