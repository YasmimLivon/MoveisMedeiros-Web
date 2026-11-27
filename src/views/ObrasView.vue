<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
import iconeCalendario from '@/assets/icones/calendario.svg'
import iconeRelogio from '@/assets/icones/relogio.svg'
import iconeLixeira from '@/assets/icones/lixeira.svg'
import iconeCorreto from '@/assets/icones/correto.svg'

const roteador = useRouter()
const rota = useRoute()

const listaObras = ref([])
const listaArquitetos = ref([])
const listaMontadores = ref([])

const textoBusca = ref('')
const filtroStatus = ref('todas')
const carregando = ref(true)
const erroConexao = ref('')
const modalNovaObraAberto = ref(false)
const salvandoObra = ref(false)
const inputPdfRef = ref(null)

const criarFormularioInicial = () => ({
  codigoProjeto: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
  clienteNome: '',
  telefone: '',
  email: '',
  endereco: '',
  dataInspecao: new Date().toISOString().split('T')[0],
  prazoMontagem: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  tipoArquiteto: 'Interno',
  arquitetoId: listaArquitetos.value[0]?.id ?? '',
  montadorId: listaMontadores.value[0]?.id ?? '',
  whatsappMontador: '',
  itens: [
    {
      nome: '',
      ambiente: '',
      corAcabamento: '',
      medidas: ''
    }
  ],
  arquivoPdf: null,
  nomeArquivoPdf: ''
})

const novaObra = ref(criarFormularioInicial())

const obterUsuarioId = () => {
  try {
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}')
    return Number(usuarioSalvo.id || usuarioSalvo.usuarioId) || 1
  } catch {
    return 1
  }
}

const ehEscritorio = computed(() => {
  try {
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}')
    return usuarioSalvo.perfil === 'Escritorio'
  } catch {
    return false
  }
})

const carregarAuxiliares = async () => {
  try {
    const usuarioId = obterUsuarioId()

    const [respArq, respMont] = await Promise.allSettled([
      api.get('/Arquiteto', { params: { usuarioId } }),
      api.get('/Montador', { params: { usuarioId } })
    ])

    if (respArq.status === 'fulfilled') {
      const dadosArq = respArq.value.data
      listaArquitetos.value = Array.isArray(dadosArq)
        ? dadosArq
        : dadosArq?.$values || dadosArq?.items || []
    } else {
      console.error('Erro ao buscar /Arquiteto:', respArq.reason?.response || respArq.reason)
    }

    if (respMont.status === 'fulfilled') {
      const dadosMont = respMont.value.data
      listaMontadores.value = Array.isArray(dadosMont)
        ? dadosMont
        : dadosMont?.$values || dadosMont?.items || []
    } else {
      console.error('Erro ao buscar /Montador:', respMont.reason?.response || respMont.reason)
    }
  } catch (e) {
    console.warn('Não foi possível carregar arquitetos/montadores:', e)
  }
}

const abrirModalNovaObra = async () => {
  if (listaArquitetos.value.length === 0 || listaMontadores.value.length === 0) {
    await carregarAuxiliares()
  }
  novaObra.value = criarFormularioInicial()
  aoTrocarMontador()
  modalNovaObraAberto.value = true
}

const aoTrocarMontador = () => {
  const encontrado = listaMontadores.value.find(
    (m) => Number(m.id) === Number(novaObra.value.montadorId)
  )
  if (encontrado?.telefone) {
    novaObra.value.whatsappMontador = encontrado.telefone
  }
}

const adicionarItemObra = () => {
  novaObra.value.itens.push({
    nome: '',
    ambiente: '',
    corAcabamento: '',
    medidas: ''
  })
}

const removerItemObra = (indice) => {
  if (novaObra.value.itens.length > 1) {
    novaObra.value.itens.splice(indice, 1)
  }
}

const selecionarArquivoPdf = (evento) => {
  const arquivo = evento.target.files?.[0]
  if (!arquivo) return
  novaObra.value.arquivoPdf = arquivo
  novaObra.value.nomeArquivoPdf = arquivo.name
}

const carregarObras = async () => {
  carregando.value = true
  erroConexao.value = ''

  try {
    const usuarioId = obterUsuarioId()
    const resposta = await api.get('/Obra', { params: { usuarioId } })
    listaObras.value = (resposta.data || []).map((obra) => {
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
          : `Contrato #MM-${id}`,
        telefone: obra.cliente?.telefone || obra.telefone || 'Não informado',
        endereco: obra.cliente?.endereco || obra.endereco || 'Endereço não cadastrado',
        status: obra.status || 'Em Andamento'
      }
    })
  } catch (erro) {
    console.error('Erro ao buscar obras da API:', erro)
    erroConexao.value =
      'Não foi possível carregar as obras da API. Verifique se o backend está rodando.'
  } finally {
    carregando.value = false
  }
}

const cadastrarNovaObra = async () => {
  salvandoObra.value = true
  try {
    const respCliente = await api.post('/Cliente', {
      usuarioId: obterUsuarioId(),
      nome: novaObra.value.clienteNome.trim(),
      telefone: novaObra.value.telefone.trim(),
      email: novaObra.value.email.trim(),
      endereco: novaObra.value.endereco.trim()
    })

    const clienteId = respCliente.data?.id ?? respCliente.data?.clienteId
    if (!clienteId) {
      throw new Error('A API não retornou o ID do cliente criado.')
    }

    const arquitetoId = Number(novaObra.value.arquitetoId || listaArquitetos.value[0]?.id)
    const montadorId = Number(novaObra.value.montadorId || listaMontadores.value[0]?.id)

    if (!arquitetoId) {
      alert('Nenhum Arquiteto encontrado no banco. Cadastre um arquiteto antes de criar a obra.')
      salvandoObra.value = false
      return
    }

    if (!montadorId) {
      alert('Nenhum Montador encontrado no banco. Cadastre um montador antes de criar a obra.')
      salvandoObra.value = false
      return
    }

      const dataInspecaoIso =
      novaObra.value.dataInspecao || new Date().toISOString().split('T')[0]

      const prazoIso =
      novaObra.value.prazoMontagem ||
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const codigoNumerico =
      Number(String(novaObra.value.codigoProjeto).replace(/\D/g, '')) ||
      Math.floor(1000 + Math.random() * 9000)

    const respObra = await api.post(
  '/Obra',
  {
    codigo: codigoNumerico,
    clienteId: Number(clienteId),
    montadorId,
    arquitetoId,
    dataInspecao: dataInspecaoIso,
    prazo: prazoIso,
    pdf: novaObra.value.nomeArquivoPdf || 'planejamento.pdf',
    status: 'Em Andamento'
  },
  {
    params: { usuarioId: obterUsuarioId() }
  }
)

    const obraCriadaId = respObra.data?.id ?? respObra.data?.obraId

    if (obraCriadaId) {
      for (const item of novaObra.value.itens) {
        if (item.nome.trim()) {
          try {
            await api.post('/ItensObra', {
              obraId: Number(obraCriadaId),
              descricao: `${item.nome.trim()}${item.ambiente ? ` - ${item.ambiente.trim()}` : ''}`,
              cor: item.corAcabamento || '',
              medidas: item.medidas || '',
              quantidade: 1,
              status: 'Pendente'
            })
          } catch (e) {
            console.warn('Item não salvo separadamente:', e)
          }
        }
      }
    }

    modalNovaObraAberto.value = false
    await carregarObras()
  } catch (erro) {
    console.error('Erro ao cadastrar obra:', erro.response?.data || erro)
    const detalhes =
      erro.response?.data?.errors ||
      erro.response?.data ||
      erro.message ||
      'Erro ao cadastrar obra.'
    alert(typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes, null, 2))
  } finally {
    salvandoObra.value = false
  }
}

const totalObras = computed(() => listaObras.value.length)

const totalEmAndamento = computed(() =>
  listaObras.value.filter((o) => o.status.toLowerCase().includes('andamento')).length
)

const totalComOcorrencia = computed(() =>
  listaObras.value.filter((o) => o.status.toLowerCase().includes('ocorr')).length
)

const ehOcorrencia = (status) => (status || '').toLowerCase().includes('ocorr')

const obrasFiltradas = computed(() => {
  return listaObras.value.filter((obra) => {
    const termo = textoBusca.value.toLowerCase()
    const bateTexto =
      obra.cliente.toLowerCase().includes(termo) ||
      obra.contrato.toLowerCase().includes(termo) ||
      obra.endereco.toLowerCase().includes(termo)

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
onMounted(async () => {
  await carregarObras()
  if (ehEscritorio.value) {
    await carregarAuxiliares()
    if (rota.query.nova === 'true') {
      await abrirModalNovaObra()
    }
  }
})
</script>

<template>
  <div class="pagina-gestao-obras">
    <header class="barra-superior">
      <span class="etiqueta-superior">MARCENARIA FINA • CANTEIRO OPERACIONAL</span>

      <div class="acoes-topo">
        <button type="button" class="botao-notificacao" title="Notificações">
          <img :src="iconeNotificacao" alt="Notificações" />
        </button>
        <div class="icone-perfil" title="Perfil">
          <img :src="iconePessoa" alt="Usuário" />
        </div>
      </div>
    </header>

   <section class="cabecalho-gestao">
      <div class="titulos-gestao">
        <h1>{{ ehEscritorio ? 'Gestão de Obras & Clientes' : 'Minhas Obras de Montagem' }}</h1>
        <p>
          {{
            ehEscritorio
              ? 'Monitoramento de prazos executivos e liberação de plantas'
              : 'Acompanhamento das montagens atribuídas a você'
          }}
        </p>
      </div>

      <button
        v-if="ehEscritorio"
        type="button"
        class="botao-nova-obra"
        @click="abrirModalNovaObra"
      >
        + Nova Obra/Cliente
      </button>
    </section>

    <section class="grade-metricas">
      <article class="cartao-metrica">
        <div class="corpo-metrica">
          <div class="topo-metrica-inline">
            <span class="rotulo-metrica">TOTAL DE OBRAS</span>
            <img :src="iconePredioCinza" alt="Total de Obras" class="icone-metrica" />
          </div>
          <div class="linha-numero">
            <strong>{{ String(totalObras).padStart(2, '0') }}</strong>
            <span class="texto-apoio">contratos ativos</span>
          </div>
          <p class="descricao-metrica">Base ativa de montagens no período</p>
        </div>
      </article>

      <article class="cartao-metrica">
        <div class="corpo-metrica">
          <div class="topo-metrica-inline">
            <span class="rotulo-metrica">EM ANDAMENTO</span>
            <img :src="iconeMartelo" alt="Em Andamento" class="icone-metrica" />
          </div>
          <div class="linha-numero">
            <strong>{{ String(totalEmAndamento).padStart(2, '0') }}</strong>
            <span class="etiqueta-status verde">• Em Curso</span>
          </div>
          <p class="descricao-metrica">Cronogramas em conformidade executiva</p>
        </div>
      </article>

      <article class="cartao-metrica">
        <div class="corpo-metrica">
          <div class="topo-metrica-inline">
            <span class="rotulo-metrica">COM OCORRÊNCIA</span>
            <img :src="iconeAlertaVermelho" alt="Com Ocorrência" class="icone-metrica" />
          </div>
          <div class="linha-numero">
            <strong class="numero-vermelho">{{ String(totalComOcorrencia).padStart(2, '0') }}</strong>
            <span class="etiqueta-status vermelho">• Requer Atenção</span>
          </div>
          <p class="descricao-metrica texto-vermelho">Pendência de medidas e revisão de corte</p>
        </div>
      </article>
    </section>

    <section class="container-filtros">
      <div class="campo-busca">
        <img :src="iconeLupa" alt="Buscar" class="icone-lupa" />
        <input
          v-model="textoBusca"
          type="text"
          placeholder="Buscar por cliente, contrato ou endereço..."
        />
      </div>

      <div class="grupo-abas">
        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'todas' }"
          @click="filtroStatus = 'todas'"
        >
          Todas <span class="contador-aba">{{ totalObras }}</span>
        </button>

        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'andamento' }"
          @click="filtroStatus = 'andamento'"
        >
          <span class="ponto verde"></span> Em Andamento
          <span class="contador-aba">{{ totalEmAndamento }}</span>
        </button>

        <button
          type="button"
          class="aba-filtro"
          :class="{ ativa: filtroStatus === 'ocorrencia' }"
          @click="filtroStatus = 'ocorrencia'"
        >
          <span class="ponto vermelho"></span> Com Ocorrência
          <span class="contador-aba">{{ totalComOcorrencia }}</span>
        </button>
      </div>
    </section>

    <p v-if="carregando" class="mensagem-status">Carregando obras da API...</p>
    <p v-else-if="erroConexao" class="mensagem-erro">{{ erroConexao }}</p>
    <p v-else-if="obrasFiltradas.length === 0" class="mensagem-status">
      Nenhuma obra encontrada para o filtro selecionado.
    </p>

    <section v-else class="grade-obras">
      <article
        v-for="obra in obrasFiltradas"
        :key="obra.id"
        class="cartao-obra"
        :class="ehOcorrencia(obra.status) ? 'borda-vermelha' : 'borda-verde'"
      >
        <div class="conteudo-obra">
          <div class="linha-titulo-obra">
            <h3 :title="obra.cliente">{{ obra.cliente }}</h3>
            <span
              class="etiqueta-obra"
              :class="ehOcorrencia(obra.status) ? 'vermelha' : 'verde'"
            >
              • {{ obra.status }}
            </span>
          </div>

          <p
            class="subtitulo-contrato"
            :class="{ 'destaque-vermelho': ehOcorrencia(obra.status) }"
          >
            {{ obra.contrato }}
          </p>

          <ul class="lista-info-obra">
            <li>
              <img :src="iconeTelefone" alt="Telefone" class="icone-info" />
              <span>{{ obra.telefone }}</span>
            </li>
            <li>
              <img :src="iconeLocal" alt="Endereço" class="icone-info" />
              <span>{{ obra.endereco }}</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          class="botao-detalhes-obra"
          @click="abrirDetalhesObra(obra.id)"
        >
          <img :src="iconeFolha" alt="PDF" class="icone-botao-pdf" />
          <span>Ver Detalhes / Anexar PDF</span>
        </button>
      </article>
    </section>

    <div v-if="modalNovaObraAberto" class="fundo-modal" @click.self="modalNovaObraAberto = false">
      <div class="janela-modal-projeto">
        <div class="cabecalho-modal-projeto">
          <div class="titulo-modal-esquerda">
            <div class="logo-m-vermelho">M</div>
            <div>
              <h2>Nova Obra / Projeto</h2>
              <span>Móveis Medeiros • Grupo Lupia</span>
            </div>
          </div>

          <div class="acoes-cabecalho-modal">
            <span class="tag-codigo-projeto"># {{ novaObra.codigoProjeto }}</span>
            <button type="button" class="botao-fechar-modal" @click="modalNovaObraAberto = false">
              ✕
            </button>
          </div>
        </div>

        <form @submit.prevent="cadastrarNovaObra" class="corpo-modal-projeto">
          <!-- SEÇÃO 1 -->
          <div class="secao-modal">
            <div class="cabecalho-secao-modal">
              <span class="titulo-secao">1. DADOS DO CLIENTE E PRAZOS</span>
              <span class="aviso-obrigatorio">* Campos Obrigatórios</span>
            </div>

            <div class="grade-dois-campos">
              <div class="campo-modal">
                <label>Nome do Cliente <span class="req">*</span></label>
                <div class="input-icone-box">
                  <img :src="iconePessoa" alt="Cliente" />
                  <input
                    v-model="novaObra.clienteNome"
                    type="text"
                    placeholder="Ex: Roberto Silveira Albuquerque"
                    required
                  />
                </div>
              </div>

              <div class="campo-modal">
                <label>Telefone / WhatsApp do Cliente <span class="req">*</span></label>
                <div class="input-icone-box">
                  <img :src="iconeTelefone" alt="Telefone" />
                  <input
                    v-model="novaObra.telefone"
                    type="text"
                    placeholder="(11) 98765-4321"
                    required
                  />
                </div>
              </div>
            </div>

            <div class="grade-dois-campos">
              <div class="campo-modal">
                <label>E-mail do Cliente</label>
                <div class="input-icone-box">
                  <span class="icone-texto">✉</span>
                  <input
                    v-model="novaObra.email"
                    type="email"
                    placeholder="roberto.silveira@email.com"
                  />
                </div>
              </div>

              <div class="campo-modal">
                <label>Endereço Completo (e informações afins) <span class="req">*</span></label>
                <div class="input-icone-box">
                  <img :src="iconeLocal" alt="Endereço" />
                  <input
                    v-model="novaObra.endereco"
                    type="text"
                    placeholder="Alameda dos Jacarandás, 412 - Apt"
                    required
                  />
                </div>
              </div>
            </div>

            <div class="grade-dois-campos">
              <div class="campo-modal">
                <label>Data da Inspeção Técnica</label>
                <div class="input-icone-box">
                  <img :src="iconeCalendario" alt="Data" />
                  <input v-model="novaObra.dataInspecao" type="date" />
                </div>
              </div>

              <div class="campo-modal">
                <label>Prazo Estimado de Montagem <span class="req">*</span></label>
                <div class="input-icone-box">
                  <img :src="iconeRelogio" alt="Prazo" />
                  <input v-model="novaObra.prazoMontagem" type="date" required />
                </div>
              </div>
            </div>
          </div>

          <!-- SEÇÃO 2 -->
          <div class="secao-modal">
            <div class="cabecalho-secao-modal">
              <span class="titulo-secao">2. EQUIPE RESPONSÁVEL</span>
              <span class="subtitulo-secao">Arquitetura &amp; Montagem</span>
            </div>

            <div class="grade-tres-campos">
              <div class="campo-modal">
                <div class="label-com-toggle">
                  <label>Arquiteto <span class="req">*</span></label>
                  <div class="toggle-arquiteto">
                    <button
                      type="button"
                      :class="{ ativo: novaObra.tipoArquiteto === 'Interno' }"
                      @click="novaObra.tipoArquiteto = 'Interno'"
                    >
                      Interno
                    </button>
                    <button
                      type="button"
                      :class="{ ativo: novaObra.tipoArquiteto === 'Externo' }"
                      @click="novaObra.tipoArquiteto = 'Externo'"
                    >
                      Externo
                    </button>
                  </div>
                </div>
                <div class="input-icone-box">
                  <span class="icone-texto">✎</span>
                  <select v-model="novaObra.arquitetoId" required>
                    <option value="" disabled>Selecione o arquiteto</option>
                    <option v-for="arq in listaArquitetos" :key="arq.id" :value="arq.id">
                      {{ arq.nome }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="campo-modal">
                <label>Montador Responsável <span class="req">*</span></label>
                <div class="input-icone-box">
                  <img :src="iconeMartelo" alt="Montador" />
                  <select v-model="novaObra.montadorId" required @change="aoTrocarMontador">
                    <option value="" disabled>Selecione o montador</option>
                    <option v-for="mont in listaMontadores" :key="mont.id" :value="mont.id">
                      {{ mont.nome }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="campo-modal">
                <label>WhatsApp do Montador</label>
                <div class="input-icone-box">
                  <img :src="iconeTelefone" alt="WhatsApp" />
                  <input
                    v-model="novaObra.whatsappMontador"
                    type="text"
                    placeholder="(11) 97654-3210"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- SEÇÃO 3 -->
          <div class="secao-modal">
            <div class="cabecalho-secao-modal">
              <span class="titulo-secao">3. MÓVEIS DA OBRA</span>
              <span class="subtitulo-secao">
                {{ novaObra.itens.length }}
                {{ novaObra.itens.length === 1 ? 'item adicionado' : 'itens adicionados' }}
              </span>
            </div>

            <div
              v-for="(item, index) in novaObra.itens"
              :key="index"
              class="cartao-item-movel"
            >
              <div class="topo-item-movel">
                <span class="titulo-item-movel">
                  <span class="bolinha-vermelha"></span> Item {{ index + 1 }}
                </span>

                <button
                  v-if="novaObra.itens.length > 1"
                  type="button"
                  class="botao-lixeira-item"
                  title="Remover item"
                  @click="removerItemObra(index)"
                >
                  <img :src="iconeLixeira" alt="Remover" />
                </button>
              </div>

              <div class="grade-dois-campos">
                <div class="campo-modal">
                  <label>Nome do Item</label>
                  <input
                    v-model="item.nome"
                    type="text"
                    class="input-branco-limpo"
                    placeholder="Ex: Guarda-roupa Master"
                  />
                </div>

                <div class="campo-modal">
                  <label>Ambiente</label>
                  <input
                    v-model="item.ambiente"
                    type="text"
                    class="input-branco-limpo"
                    placeholder="Ex: Quarto Master"
                  />
                </div>
              </div>

              <div class="grade-dois-campos">
                <div class="campo-modal">
                  <label>Cor / Acabamento</label>
                  <input
                    v-model="item.corAcabamento"
                    type="text"
                    class="input-branco-limpo"
                    placeholder="Ex: Off White / Louro Freijó"
                  />
                </div>

                <div class="campo-modal">
                  <label>Medidas</label>
                  <input
                    v-model="item.medidas"
                    type="text"
                    class="input-branco-limpo"
                    placeholder="Ex: 2,40m x 2,80m"
                  />
                </div>
              </div>
            </div>

            <button type="button" class="botao-adicionar-outro-item" @click="adicionarItemObra">
              + Adicionar outro item
            </button>
          </div>

          <!-- ANEXAR PDF -->
          <div class="secao-modal">
            <label class="label-pdf-titulo">Anexar PDF Técnico da Obra</label>

            <div class="caixa-anexo-pdf" @click="inputPdfRef?.click()">
              <div class="esquerda-anexo-pdf">
                <div class="icone-pdf-rosa">
                  <img :src="iconeFolha" alt="PDF" />
                </div>
                <div>
                  <strong>
                    {{ novaObra.nomeArquivoPdf || 'Clique ou arraste o arquivo PDF' }}
                  </strong>
                  <span>Planta executiva ou detalhamento (até 35MB)</span>
                </div>
              </div>

              <button type="button" class="botao-selecionar-pdf">
                <img :src="iconeFolha" alt="Selecionar" />
                <span>Selecionar Arquivo</span>
              </button>

              <input
                ref="inputPdfRef"
                type="file"
                accept="application/pdf"
                hidden
                @change="selecionarArquivoPdf"
              />
            </div>
          </div>

          <!-- RODAPÉ -->
          <div class="rodape-modal-projeto">
            <button type="button" class="botao-cancelar" @click="modalNovaObraAberto = false">
              Cancelar
            </button>
            <button type="submit" class="botao-salvar-obra" :disabled="salvandoObra">
              <img :src="iconeCorreto" alt="Salvar" />
              <span>{{ salvandoObra ? 'Salvando...' : 'Salvar Obra' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-gestao-obras {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.barra-superior {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.etiqueta-superior {
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

.botao-notificacao {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.botao-notificacao img {
  width: 17px;
  height: 17px;
}

.icone-perfil {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #c8102e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icone-perfil img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.cabecalho-gestao {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}

.titulos-gestao h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.titulos-gestao p {
  font-size: 13px;
  color: #64748b;
}

.botao-nova-obra {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 7px;
  padding: 11px 18px;
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
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.corpo-metrica {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.topo-metrica-inline {
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

.linha-numero {
  display: flex;
  align-items: center;
  gap: 10px;
}

.linha-numero strong {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: #0f172a;
}

.linha-numero strong.numero-vermelho {
  color: #c8102e;
}

.texto-apoio {
  font-size: 12px;
  color: #64748b;
}

.etiqueta-status {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.etiqueta-status.verde {
  background-color: #dcfce7;
  color: #15803d;
}

.etiqueta-status.vermelho {
  background-color: #fee2e2;
  color: #c8102e;
}

.descricao-metrica {
  font-size: 12px;
  color: #64748b;
}

.descricao-metrica.texto-vermelho {
  color: #c8102e;
  font-weight: 500;
}

.container-filtros {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.campo-busca {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  height: 38px;
  width: 100%;
  max-width: 340px;
}

.icone-lupa {
  width: 15px;
  height: 15px;
  opacity: 0.6;
}

.campo-busca input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 12.5px;
  color: #1e293b;
}

.grupo-abas {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.aba-filtro {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.aba-filtro.ativa {
  background-color: #fee2e2;
  border-color: #fecaca;
  color: #c8102e;
}

.contador-aba {
  background-color: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.ponto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.ponto.verde {
  background-color: #16a34a;
}

.ponto.vermelho {
  background-color: #dc2626;
}

.mensagem-status {
  font-size: 13px;
  color: #64748b;
  text-align: center;
  padding: 20px;
}

.mensagem-erro {
  font-size: 13px;
  color: #c8102e;
  background-color: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.grade-obras {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.cartao-obra {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-left-width: 4px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.cartao-obra.borda-verde {
  border-left-color: #15803d;
}

.cartao-obra.borda-vermelha {
  border-left-color: #c8102e;
}

.conteudo-obra {
  padding: 18px 18px 14px;
}

.linha-titulo-obra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.linha-titulo-obra h3 {
  font-size: 15.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.etiqueta-obra {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.etiqueta-obra.verde {
  background-color: #dcfce7;
  color: #15803d;
}

.etiqueta-obra.vermelha {
  background-color: #fee2e2;
  color: #c8102e;
}

.subtitulo-contrato {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 14px;
  line-height: 1.4;
}

.subtitulo-contrato.destaque-vermelho {
  color: #c8102e;
  font-weight: 500;
}

.lista-info-obra {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}

.lista-info-obra li {
  display: flex;
  align-items: center;
  gap: 7px;
}

.lista-info-obra li span {
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

.botao-detalhes-obra {
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

.botao-detalhes-obra:hover {
  background-color: #fee2e2;
}

.icone-botao-pdf {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.fundo-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 16px;
  overflow-y: auto;
}

.janela-modal-projeto {
  background-color: #ffffff;
  border-radius: 14px;
  width: 100%;
  max-width: 680px;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
}

.cabecalho-modal-projeto {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  background-color: #ffffff;
  z-index: 5;
}

.titulo-modal-esquerda {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-m-vermelho {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  background-color: #c8102e;
  color: #ffffff;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.titulo-modal-esquerda h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.titulo-modal-esquerda span {
  font-size: 11px;
  color: #64748b;
}

.acoes-cabecalho-modal {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tag-codigo-projeto {
  background-color: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 6px;
}

.botao-fechar-modal {
  background: none;
  border: none;
  font-size: 16px;
  color: #64748b;
  cursor: pointer;
}

.corpo-modal-projeto {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.secao-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cabecalho-secao-modal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
}

.titulo-secao {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #475569;
}

.aviso-obrigatorio {
  font-size: 10px;
  font-weight: 700;
  color: #c8102e;
}

.subtitulo-secao {
  font-size: 10.5px;
  font-weight: 600;
  color: #64748b;
}

.grade-dois-campos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.grade-tres-campos {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 10px;
}

.campo-modal {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.campo-modal label {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
}

.req {
  color: #c8102e;
}

.input-icone-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  padding: 0 11px;
  height: 36px;
}

.input-icone-box img {
  width: 13px;
  height: 13px;
  opacity: 0.6;
}

.icone-texto {
  font-size: 12px;
  color: #64748b;
}

.input-icone-box input,
.input-icone-box select {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: #0f172a;
  width: 100%;
}

.label-com-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-arquiteto {
  display: flex;
  background-color: #f1f5f9;
  border-radius: 5px;
  padding: 2px;
}

.toggle-arquiteto button {
  border: none;
  background: transparent;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
}

.toggle-arquiteto button.ativo {
  background-color: #fee2e2;
  color: #c8102e;
}

.cartao-item-movel {
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.topo-item-movel {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.titulo-item-movel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
}

.bolinha-vermelha {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #c8102e;
}

.botao-lixeira-item {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
}

.botao-lixeira-item img {
  width: 13px;
  height: 13px;
  opacity: 0.65;
}

.input-branco-limpo {
  height: 35px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0 11px;
  font-size: 12px;
  color: #0f172a;
  outline: none;
}

.input-branco-limpo:focus {
  border-color: #cbd5e1;
}

.botao-adicionar-outro-item {
  align-self: flex-start;
  background: none;
  border: none;
  color: #c8102e;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 0;
}

.label-pdf-titulo {
  font-size: 11.5px;
  font-weight: 700;
  color: #334155;
}

.caixa-anexo-pdf {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.esquerda-anexo-pdf {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icone-pdf-rosa {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background-color: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icone-pdf-rosa img {
  width: 16px;
  height: 16px;
}

.esquerda-anexo-pdf strong {
  display: block;
  font-size: 12px;
  color: #0f172a;
}

.esquerda-anexo-pdf span {
  font-size: 10.5px;
  color: #64748b;
}

.botao-selecionar-pdf {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.botao-selecionar-pdf img {
  width: 12px;
  height: 12px;
}

.rodape-modal-projeto {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.botao-cancelar {
  background-color: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 7px;
  padding: 10px 18px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.botao-salvar-obra {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 7px;
  padding: 10px 20px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.botao-salvar-obra img {
  width: 13px;
  height: 13px;
  filter: brightness(0) invert(1);
}

@media (max-width: 1024px) {
  .grade-metricas,
  .grade-obras {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grade-metricas,
  .grade-obras,
  .grade-dois-campos,
  .grade-tres-campos {
    grid-template-columns: 1fr;
  }
}
</style>