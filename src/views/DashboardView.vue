<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

import iconeNotificacao from '@/assets/icones/notificacao.svg'
import iconePessoa from '@/assets/icones/pessoa.svg'
import iconePredioCinza from '@/assets/icones/prediocinza.svg'
import iconeMartelo from '@/assets/icones/martelo.svg'
import iconeAlertaVermelho from '@/assets/icones/alertavermelho.svg'
import iconeLupa from '@/assets/icones/lupa.svg'
import iconeTelefone from '@/assets/icones/telefone.svg'
import iconeLocal from '@/assets/icones/local.svg'
import iconeFolha from '@/assets/icones/folha.svg'

const roteador = useRouter()

const listaObras = ref([])
const totalOcorrenciasAbertas = ref(0)
const textoBusca = ref('')
const filtroStatus = ref('todas')
const carregando = ref(true)
const erroConexao = ref('')

const obterUsuarioId = () => {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    return Number(usuario.id || usuario.Id || usuario.usuarioId) || 1
  } catch {
    return 1
  }
}

const carregarDadosDaApi = async () => {
  carregando.value = true
  erroConexao.value = ''

  try {
    const usuarioId = obterUsuarioId()

    const [respostaObras, respostaOcorrencias] = await Promise.allSettled([
      api.get('/Obra', { params: { usuarioId } }),
      api.get('/Ocorrencia', { params: { usuarioId } })
    ])

    if (respostaObras.status === 'fulfilled') {
      listaObras.value = (respostaObras.value.data || []).map((obra) => {
        const id = obra.id ?? obra.obraId
        return {
          id,
          cliente:
            obra.cliente?.nome ||
            obra.clienteNome ||
            obra.nomeCliente ||
            `Obra #${id}`,
          contrato: obra.codigo
            ? `Contrato #${obra.codigo}`
            : obra.numeroContrato
              ? `Contrato #${obra.numeroContrato}`
              : `Contrato #MM-${id}`,
          telefone: obra.cliente?.telefone || obra.telefone || 'Não informado',
          endereco: obra.cliente?.endereco || obra.endereco || 'Endereço não cadastrado',
          status: obra.status || 'Em Andamento'
        }
      })
    } else {
      throw respostaObras.reason
    }

    if (respostaOcorrencias.status === 'fulfilled') {
      const ocorrencias = respostaOcorrencias.value.data || []
      totalOcorrenciasAbertas.value = ocorrencias.filter(
        (oc) => oc.resolvida === false
      ).length
    } else {
      totalOcorrenciasAbertas.value = listaObras.value.filter((o) =>
        o.status.toLowerCase().includes('ocorr')
      ).length
    }
  } catch (erro) {
    console.error('Erro ao buscar dados da API:', erro)
    erroConexao.value = 'Não foi possível carregar as obras da API.'
  } finally {
    carregando.value = false
  }
}

const totalObras = computed(() => listaObras.value.length)

const totalEmAndamento = computed(() =>
  listaObras.value.filter((o) => o.status.toLowerCase().includes('andamento')).length
)

  const totalComOcorrencia = computed(() =>
  listaObras.value.filter((o) => o.status.toLowerCase().includes('ocorr')).length
)
  listaObras.value.filter((o) => o.status.toLowerCase().includes('ocorr')).length


const formatarDoisDigitos = (valor) => String(valor).padStart(2, '0')

const ehOcorrencia = (status) => (status || '').toLowerCase().includes('ocorr')

const obrasFiltradas = computed(() => {
  return listaObras.value.filter((obra) => {
    const termo = textoBusca.value.toLowerCase()
    const bateTexto =
      obra.cliente.toLowerCase().includes(termo) ||
      obra.endereco.toLowerCase().includes(termo) ||
      obra.contrato.toLowerCase().includes(termo)

    if (!bateTexto) return false

    if (filtroStatus.value === 'andamento') {
      return obra.status.toLowerCase().includes('andamento')
    }
    if (filtroStatus.value === 'ocorrencia') {
      return ehOcorrencia(obra.status)
    }
    return true
  })
})

const abrirDetalhesObra = (id) => {
  roteador.push(`/obras/${id}`)
}

const abrirNovaObra = () => {
  roteador.push('/obras?nova=true')
}

onMounted(carregarDadosDaApi)
</script>

<template>
  <div class="pagina-painel">
    <header class="barra-superior">
      <span class="subtitulo-sistema">MARCENARIA FINA • CANTEIRO OPERACIONAL</span>

      <div class="acoes-topo">
        <button type="button" class="botao-sino" title="Notificações">
          <img :src="iconeNotificacao" alt="Notificações" />
        </button>
        <div class="avatar-usuario" title="Perfil">
          <img :src="iconePessoa" alt="Usuário" />
        </div>
      </div>
    </header>

    <section class="cabecalho-painel">
      <div>
        <h1>Painel Geral</h1>
        <p>Acompanhamento direto e visão resumida<br />das montagens em campo</p>
      </div>

      <button type="button" class="botao-nova-obra" @click="abrirNovaObra">
        + Nova Obra/Cliente
      </button>
    </section>

    <section class="grade-metricas">
      <article class="cartao-metrica">
        <div class="topo-metrica">
          <span class="rotulo-metrica">TOTAL DE OBRAS</span>
          <img :src="iconePredioCinza" alt="Total de Obras" class="icone-metrica" />
        </div>
        <div class="valor-metrica">
          <strong>{{ totalObras }}</strong>
          <span class="complemento-metrica">contratos ativos</span>
        </div>
        <p class="rodape-metrica">Base ativa de montagens no período</p>
      </article>

      <article class="cartao-metrica">
        <div class="topo-metrica">
          <span class="rotulo-metrica">EM ANDAMENTO</span>
          <img :src="iconeMartelo" alt="Em Andamento" class="icone-metrica" />
        </div>
        <div class="valor-metrica">
          <strong>{{ totalEmAndamento }}</strong>
          <span class="selo-verde">• Em Curso</span>
        </div>
        <p class="rodape-metrica">Cronogramas em conformidade executiva</p>
      </article>

      <article class="cartao-metrica">
        <div class="topo-metrica">
          <span class="rotulo-metrica">COM OCORRÊNCIA</span>
          <img :src="iconeAlertaVermelho" alt="Com Ocorrência" class="icone-metrica" />
        </div>
        <div class="valor-metrica">
          <strong class="numero-vermelho">{{ formatarDoisDigitos(totalComOcorrencia) }}</strong>
          <span class="selo-vermelho">• Requer Atenção</span>
        </div>
        <p class="rodape-metrica">Pendência de medidas e revisão de corte</p>
      </article>
    </section>

    <section class="barra-filtros">
      <div class="caixa-busca">
        <img :src="iconeLupa" alt="Buscar" class="icone-busca" />
        <input
          v-model="textoBusca"
          type="text"
          placeholder="Buscar por cliente, endereço..."
        />
      </div>

      <div class="grupo-abas-filtro">
        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'todas' }"
          @click="filtroStatus = 'todas'"
        >
          Todas {{ totalObras }}
        </button>

        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'andamento' }"
          @click="filtroStatus = 'andamento'"
        >
          <span class="ponto-verde">•</span> Em Andamento {{ totalEmAndamento }}
        </button>

        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'ocorrencia' }"
          @click="filtroStatus = 'ocorrencia'"
        >
          <span class="ponto-vermelho">•</span> Com Ocorrência {{ totalComOcorrencia }}
        </button>
      </div>
    </section>

    <p v-if="carregando" class="mensagem-estado">Carregando obras...</p>
    <p v-else-if="erroConexao" class="mensagem-erro">{{ erroConexao }}</p>
    <p v-else-if="obrasFiltradas.length === 0" class="mensagem-estado">
      Nenhuma obra encontrada.
    </p>

    <section v-else class="grade-obras">
      <article
        v-for="obra in obrasFiltradas"
        :key="obra.id"
        class="cartao-obra"
        :class="ehOcorrencia(obra.status) ? 'borda-vermelha' : 'borda-verde'"
      >
        <div class="corpo-cartao-obra">
          <div class="linha-titulo-obra">
            <h3 :title="obra.cliente">{{ obra.cliente }}</h3>
            <span
              class="etiqueta-status"
              :class="ehOcorrencia(obra.status) ? 'selo-vermelho' : 'selo-verde'"
            >
              {{ ehOcorrencia(obra.status) ? 'Com Ocorrência' : 'Em Andamento' }}
            </span>
          </div>

          <p class="texto-contrato">{{ obra.contrato }}</p>

          <div class="lista-contatos-obra">
            <p class="linha-info">
              <img :src="iconeTelefone" alt="Telefone" class="icone-info" />
              <span>{{ obra.telefone }}</span>
            </p>
            <p class="linha-info">
              <img :src="iconeLocal" alt="Endereço" class="icone-info" />
              <span>{{ obra.endereco }}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          class="botao-rodape-cartao"
          @click="abrirDetalhesObra(obra.id)"
        >
          <img :src="iconeFolha" alt="PDF" class="icone-botao-pdf" />
          <span>Ver Detalhes / Anexar PDF</span>
        </button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.pagina-painel {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: #0f172a;
}

.barra-superior {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.subtitulo-sistema {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
}

.acoes-topo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.botao-sino {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.botao-sino img {
  width: 17px;
  height: 17px;
}

.avatar-usuario {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #c8102e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-usuario img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.cabecalho-painel {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}

.cabecalho-painel h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}

.cabecalho-painel p {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.45;
}

.botao-nova-obra {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 7px;
  padding: 11px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-nova-obra:hover {
  background-color: #a50d26;
}

.grade-metricas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.cartao-metrica {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.topo-metrica {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rotulo-metrica {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #64748b;
}

.icone-metrica {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.valor-metrica {
  display: flex;
  align-items: center;
  gap: 10px;
}

.valor-metrica strong {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  color: #0f172a;
}

.numero-vermelho {
  color: #c8102e !important;
}

.complemento-metrica {
  font-size: 12px;
  color: #64748b;
}

.rodape-metrica {
  font-size: 12px;
  color: #64748b;
}

.selo-verde {
  background-color: #dcfce7;
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.selo-vermelho {
  background-color: #fee2e2;
  color: #c8102e;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.barra-filtros {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.caixa-busca {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 14px;
  height: 40px;
  width: 310px;
  max-width: 100%;
}

.icone-busca {
  width: 15px;
  height: 15px;
  opacity: 0.6;
}

.caixa-busca input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  background: transparent;
}

.grupo-abas-filtro {
  display: flex;
  align-items: center;
  background-color: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
  flex-wrap: wrap;
}

.aba-filtro {
  border: none;
  background: transparent;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.aba-filtro.ativa {
  background-color: #fee2e2;
  color: #c8102e;
  font-weight: 700;
}

.ponto-verde {
  color: #16a34a;
  font-size: 14px;
}

.ponto-vermelho {
  color: #c8102e;
  font-size: 14px;
}

.grade-obras {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.cartao-obra {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  border-left: 4px solid #15803d;
}

.cartao-obra.borda-verde {
  border-left-color: #15803d;
}

.cartao-obra.borda-vermelha {
  border-left-color: #c8102e;
}

.corpo-cartao-obra {
  padding: 18px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.linha-titulo-obra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.linha-titulo-obra h3 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.texto-contrato {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.lista-contatos-obra {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.linha-info {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #475569;
}

.linha-info span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icone-info {
  width: 13px;
  height: 13px;
  object-fit: contain;
  flex-shrink: 0;
}

.botao-rodape-cartao {
  width: 100%;
  background-color: #fef2f2;
  color: #c8102e;
  border: none;
  border-top: 1px solid #fee2e2;
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-rodape-cartao:hover {
  background-color: #fee2e2;
}

.icone-botao-pdf {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.mensagem-estado {
  font-size: 13px;
  color: #64748b;
}

.mensagem-erro {
  font-size: 13px;
  color: #c8102e;
  background-color: #fef2f2;
  padding: 10px 14px;
  border-radius: 8px;
}

@media (max-width: 1100px) {
  .grade-metricas,
  .grade-obras {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 720px) {
  .grade-metricas,
  .grade-obras {
    grid-template-columns: 1fr;
  }
}
</style>