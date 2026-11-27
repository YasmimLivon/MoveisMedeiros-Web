<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

import iconeNotificacao from '@/assets/icones/notificacao.svg'
import iconePessoa from '@/assets/icones/pessoa.svg'
import iconeSetaEsquerda from '@/assets/icones/setaesquerda.svg'
import iconeTelefone from '@/assets/icones/telefone.svg'
import iconeLocal from '@/assets/icones/local.svg'
import iconeCaixa from '@/assets/icones/caixa.svg'
import iconeCalendario from '@/assets/icones/calendario.svg'
import iconeFolha from '@/assets/icones/folha.svg'
import iconeNuvem from '@/assets/icones/nuvem.svg'
import iconeLupa from '@/assets/icones/lupa.svg'
import iconeLixeira from '@/assets/icones/lixeira.svg'
import iconeFoto from '@/assets/icones/foto.svg'
import iconeCorreto from '@/assets/icones/correto.svg'
import iconeRelogio from '@/assets/icones/relogio.svg'
import iconeAlertaVermelho from '@/assets/icones/alertavermelho.svg'

const rota = useRoute()
const roteador = useRouter()
const obraId = rota.params.id

const obra = ref(null)
const carregando = ref(true)
const erroCarregamento = ref('')
const ocorrenciaAbertaId = ref(null)

const itensChecklist = ref([])
const novoItemTitulo = ref('')
const mostrarFormularioItem = ref(false)

const acaoRealizada = ref('')
const observacoes = ref('')

const inputArquivo = ref(null)
const fotosMontagem = ref([])
const fotoAmpliada = ref(null)

const usuarioLogado = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('usuario') || '{}')
  } catch {
    return {}
  }
})

const ehPerfilEscritorio = computed(() => {
  const perfil = (
    usuarioLogado.value.perfil ||
    usuarioLogado.value.cargo ||
    usuarioLogado.value.role ||
    'Escritório'
  ).toLowerCase()
  return !perfil.includes('montador')
})

const obterUsuarioId = () => Number(usuarioLogado.value.id || usuarioLogado.value.usuarioId) || 1

const nomeTitularProjeto = computed(() => {
  if (!obra.value) return ''
  return (
    obra.value.cliente?.nome ||
    obra.value.clienteNome ||
    obra.value.nomeCliente ||
    obra.value.codigo ||
    `Obra #${obraId}`
  )
})

const telefoneCliente = computed(
  () => obra.value?.cliente?.telefone || obra.value?.telefone || 'Não informado'
)

const enderecoMontagem = computed(
  () => obra.value?.cliente?.endereco || obra.value?.endereco || 'Endereço não cadastrado'
)

const montadorResponsavelNome = computed(
  () => obra.value?.montador?.nome || obra.value?.montadorResponsavel || 'Não atribuído'
)

const dataEntregaFormatada = computed(() =>
  formatarDataExtenso(obra.value?.prazo || obra.value?.dataPrevisao)
)

const totalConcluidos = computed(
  () => itensChecklist.value.filter((item) => item.concluido).length
)

const totalCaracteres = computed(
  () => (acaoRealizada.value || '').length + (observacoes.value || '').length
)

const formatarDataExtenso = (dataIso) => {
  if (!dataIso) return 'Não definida'
  const data = new Date(dataIso)
  if (Number.isNaN(data.getTime())) return dataIso
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const carregarDetalhes = async () => {
  carregando.value = true
  erroCarregamento.value = ''

  try {
    const usuarioId = obterUsuarioId()

    const respObra = await api.get(`/Obra/${obraId}`, {
      params: { usuarioId }
    })
    obra.value = respObra.data

    // Busca as ocorrências específicas desta obra passando o usuarioId
    try {
      const respOcorrencias = await api.get(`/Ocorrencia/obra/${obraId}`, {
        params: { usuarioId }
      })
      const listaOc = Array.isArray(respOcorrencias.data) ? respOcorrencias.data : []
      const encontrada = listaOc.find((oc) => !oc.resolvida)
      ocorrenciaAbertaId.value = encontrada ? (encontrada.id ?? encontrada.ocorrenciaId) : null
    } catch (e) {
      console.error('Erro ao buscar ocorrências da obra:', e)
      ocorrenciaAbertaId.value = null
    }

    try {
      const respItens = await api.get(`/ItensObra/obra/${obraId}`)
      if (Array.isArray(respItens.data) && respItens.data.length > 0) {
        itensChecklist.value = respItens.data.map((i) => ({
          id: i.id ?? i.itemObraId,
          titulo: i.descricao || i.nome || 'Item de montagem',
          concluido: (i.status || '').toLowerCase() === 'concluído' || Boolean(i.concluido),
          origemApi: true,
          raw: i
        }))
      } else {
        itensChecklist.value = [
          { id: 1, titulo: 'Chapa', concluido: true, origemApi: false },
          { id: 2, titulo: 'Cor', concluido: true, origemApi: false },
          { id: 3, titulo: 'Cantos e Bordas', concluido: false, origemApi: false },
          { id: 4, titulo: 'Fitas de borda', concluido: true, origemApi: false },
          { id: 5, titulo: 'Emendas e Junções', concluido: false, origemApi: false }
        ]
      }
    } catch {
      itensChecklist.value = [
        { id: 1, titulo: 'Chapa', concluido: true, origemApi: false },
        { id: 2, titulo: 'Cor', concluido: true, origemApi: false },
        { id: 3, titulo: 'Cantos e Bordas', concluido: false, origemApi: false },
        { id: 4, titulo: 'Fitas de borda', concluido: true, origemApi: false },
        { id: 5, titulo: 'Emendas e Junções', concluido: false, origemApi: false }
      ]
    }
  } catch (erro) {
    console.error('Erro ao carregar detalhes da obra:', erro)
    erroCarregamento.value = 'Não foi possível carregar os detalhes desta obra.'
  } finally {
    carregando.value = false
  }
}

const alternarItemChecklist = async (item) => {
  item.concluido = !item.concluido

  if (item.origemApi) {
    try {
      await api.put(`/ItensObra/${item.id}`, {
        ...item.raw,
        id: item.id,
        obraId: Number(obraId),
        status: item.concluido ? 'Concluído' : 'Pendente'
      })
    } catch (erro) {
      console.error('Erro ao atualizar item na API:', erro)
    }
  }
}

const adicionarNovoItemChecklist = async () => {
  if (!novoItemTitulo.value.trim()) return

  try {
    await api.post('/ItensObra', {
      descricao: novoItemTitulo.value.trim(),
      quantidade: 1,
      status: 'Pendente',
      observacao: '',
      obraId: Number(obraId)
    })
    novoItemTitulo.value = ''
    mostrarFormularioItem.value = false
    await carregarDetalhes()
  } catch (erro) {
    console.error('Erro ao adicionar item:', erro)
    itensChecklist.value.push({
      id: Date.now(),
      titulo: novoItemTitulo.value.trim(),
      concluido: false,
      origemApi: false
    })
    novoItemTitulo.value = ''
    mostrarFormularioItem.value = false
  }
}

const abrirSeletorFotos = () => {
  inputArquivo.value?.click()
}

const processarArquivosSelecionados = (evento) => {
  const arquivos = Array.from(evento.target.files || [])
  arquivos.forEach((arquivo, idx) => {
    const url = URL.createObjectURL(arquivo)
    const numero = String(fotosMontagem.value.length + idx + 1).padStart(2, '0')
    fotosMontagem.value.push({
      id: Date.now() + idx,
      legenda: `Foto ${numero} - ${arquivo.name.replace(/\.[^/.]+$/, '')}`,
      url
    })
  })
  evento.target.value = ''
}

const removerFoto = (id) => {
  fotosMontagem.value = fotosMontagem.value.filter((f) => f.id !== id)
}

const visualizarPdfPlanejamento = () => {
  const urlPdf = obra.value?.urlPdf || obra.value?.arquivoPdf || obra.value?.pdf
  if (urlPdf && (urlPdf.startsWith('http') || urlPdf.startsWith('blob:') || urlPdf.startsWith('data:'))) {
    window.open(urlPdf, '_blank')
  } else if (urlPdf) {
    alert(`Arquivo vinculado à obra: ${urlPdf}`)
  } else {
    alert('Nenhum PDF anexado a esta obra ainda.')
  }
}

const voltarParaObras = () => {
  roteador.push('/obras')
}

const irParaRelatarOcorrencia = () => {
  roteador.push({
    path: '/ocorrencias',
    query: { obraId }
  })
}

const irParaSolucionarOcorrencia = async () => {
  if (ocorrenciaAbertaId.value) {
    roteador.push(`/ocorrencias/${ocorrenciaAbertaId.value}/correcao`)
    return
  }

  
  try {
    const resp = await api.get(`/Ocorrencia/obra/${obraId}`, {
      params: { usuarioId: obterUsuarioId() }
    })
    const aberta = (resp.data || []).find((oc) => !oc.resolvida)
    if (aberta) {
      roteador.push(`/ocorrencias/${aberta.id}/correcao`)
      return
    }
  } catch (e) {
    console.error(e)
  }

  alert('Nenhuma ocorrência em aberto encontrada para esta obra.')
}

const enviarFeedbackEConcluir = async () => {
  try {
    const usuarioId = obterUsuarioId()
    await api.patch(`/Obra/${obraId}/concluir`, null, { params: { usuarioId } })
    alert('Feedback enviado e obra concluída com sucesso!')
    roteador.push('/obras')
  } catch (erro) {
    console.error('Erro ao concluir obra:', erro.response?.data || erro)
    const detalhes = erro.response?.data || 'Erro ao concluir obra.'
    alert(typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes, null, 2))
  }
}

onMounted(carregarDetalhes)
</script>

<template>
  <div class="pagina-progresso-montagem">
    <header class="barra-superior">
      <button type="button" class="botao-voltar" @click="voltarParaObras">
        <img :src="iconeSetaEsquerda" alt="Voltar" class="icone-seta" />
        <span>Voltar para Obras</span>
      </button>

      <div class="acoes-topo">
        <button type="button" class="botao-sino" title="Notificações">
          <img :src="iconeNotificacao" alt="Notificações" />
        </button>
        <div class="avatar-usuario" title="Perfil">
          <img :src="iconePessoa" alt="Usuário" />
        </div>
      </div>
    </header>

    <section class="cabecalho-pagina">
      <div>
        <h1>Progresso da Montagem</h1>
        <p>Vistoria e liberação técnica da obra em canteiro</p>
      </div>

      <span class="selo-fase-topo">
        • {{ obra?.status || 'Em Andamento' }} - Fase de Fixação
      </span>
    </section>

    <p v-if="carregando" class="mensagem-estado">Carregando dados da montagem...</p>
    <p v-else-if="erroCarregamento" class="mensagem-erro">{{ erroCarregamento }}</p>

    <div v-else-if="obra" class="grade-duas-colunas">
      <div class="coluna-esquerda">
        <section class="cartao-branco">
          <div class="topo-cartao-cliente">
            <h2>Informações da Obra<br />&amp; Cliente</h2>
            <span class="selo-status-cliente">• {{ obra.status || 'Em Andamento' }}</span>
          </div>

          <div class="bloco-titular">
            <span class="etiqueta-cinza">TITULAR DO PROJETO</span>
            <h3>{{ nomeTitularProjeto }}</h3>
          </div>

          <div class="lista-blocos-info">
            <div class="bloco-info-item">
              <img :src="iconeTelefone" alt="Telefone" class="icone-bloco" />
              <div>
                <span class="rotulo-bloco">Telefone / WhatsApp</span>
                <strong>{{ telefoneCliente }}</strong>
              </div>
            </div>

            <div class="bloco-info-item">
              <img :src="iconeLocal" alt="Endereço" class="icone-bloco" />
              <div>
                <span class="rotulo-bloco">Endereço da Montagem</span>
                <strong>{{ enderecoMontagem }}</strong>
              </div>
            </div>

            <div class="bloco-info-item">
              <img :src="iconeCaixa" alt="Montador" class="icone-bloco" />
              <div>
                <span class="rotulo-bloco">Montador Responsável</span>
                <strong>{{ montadorResponsavelNome }}</strong>
              </div>
            </div>

            <div class="bloco-info-item">
              <img :src="iconeCalendario" alt="Data Prevista" class="icone-bloco" />
              <div>
                <span class="rotulo-bloco">Data Prevista de Entrega</span>
                <strong>{{ dataEntregaFormatada }}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="botao-pdf-planejamento"
            @click="visualizarPdfPlanejamento"
          >
            <img :src="iconeFolha" alt="PDF" />
            <span>Visualizar PDF do Planejamento</span>
          </button>
        </section>

        <section class="cartao-branco">
          <div class="topo-cartao-fotos">
            <div>
              <h2>Fotos da Montagem<br />Realizada</h2>
              <p class="subtitulo-fotos">Comprovantes visuais para liberação da vistoria</p>
            </div>

            <span class="badge-anexadas">{{ fotosMontagem.length }}<br />anexadas</span>
          </div>

          <div class="area-upload" @click="abrirSeletorFotos">
            <div class="circulo-nuvem">
              <img :src="iconeNuvem" alt="Upload" />
            </div>
            <strong>Clique para selecionar ou arraste as fotos aqui</strong>
            <span>Formatos aceitos: JPG, PNG até 15MB</span>
            <input
              ref="inputArquivo"
              type="file"
              accept="image/png, image/jpeg"
              multiple
              hidden
              @change="processarArquivosSelecionados"
            />
          </div>

          <div v-if="fotosMontagem.length > 0" class="grade-miniaturas">
            <div v-for="foto in fotosMontagem" :key="foto.id" class="card-foto">
              <img :src="foto.url" :alt="foto.legenda" class="imagem-foto" />
              <div class="sobreposicao-foto">
                <span class="legenda-foto">{{ foto.legenda }}</span>
                <div class="botoes-foto">
                  <button
                    type="button"
                    class="botao-mini-foto"
                    @click="fotoAmpliada = foto"
                    title="Ampliar"
                  >
                    <img :src="iconeLupa" alt="Ampliar" />
                  </button>
                  <button
                    type="button"
                    class="botao-mini-foto excluir"
                    @click="removerFoto(foto.id)"
                    title="Excluir"
                  >
                    <img :src="iconeLixeira" alt="Excluir" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="button" class="botao-mais-fotos" @click="abrirSeletorFotos">
            <img :src="iconeFoto" alt="Adicionar fotos" />
            <span>Adicionar Mais Fotos</span>
          </button>
        </section>
      </div>

      <section class="cartao-branco coluna-direita">
        <div class="topo-checklist">
          <div>
            <h2>Checklist Técnico de Montagem</h2>
            <p>Marque os itens vistoriados e concluídos pela equipe em campo</p>
          </div>

          <div class="caixa-contador-checklist">
            <strong>{{ totalConcluidos }}</strong>
            <span>/ {{ itensChecklist.length }}<br />Concluídos</span>
          </div>
        </div>

        <div class="cabecalho-categoria">
          <span class="titulo-categoria">ACABAMENTO</span>
          <span class="contagem-validados">
            {{ totalConcluidos }} de {{ itensChecklist.length }} validados
          </span>
        </div>

        <ul class="lista-itens-tecnicos">
          <li
            v-for="item in itensChecklist"
            :key="item.id"
            class="linha-item-tecnico"
            :class="{ concluido: item.concluido }"
            @click="alternarItemChecklist(item)"
          >
            <div class="lado-esquerdo-item">
              <span class="quadrado-check" :class="{ ativo: item.concluido }"></span>
              <div class="textos-item-tecnico">
                <strong>{{ item.titulo }}</strong>
                <span v-if="item.concluido" class="subtexto-verde">Concluído • Vistoriado</span>
                <span v-else class="subtexto-pendente">Pendente</span>
              </div>
            </div>

            <div class="lado-direito-item">
              <img
                v-if="item.concluido"
                :src="iconeCorreto"
                alt="Validado"
                class="icone-validado"
              />
              <span v-else class="circulo-vazio"></span>
            </div>
          </li>
        </ul>

        <div v-if="mostrarFormularioItem" class="box-novo-item">
          <input
            v-model="novoItemTitulo"
            type="text"
            placeholder="Nome do item técnico (ex: Corrediças telescópicas)"
            @keyup.enter="adicionarNovoItemChecklist"
          />
          <button type="button" @click="adicionarNovoItemChecklist">Salvar</button>
        </div>

        <div class="bloco-campo-texto">
          <div class="topo-label-texto">
            <label>Descreva a ação realizada na montagem</label>
            <span>Registro técnico diário</span>
          </div>
          <textarea
            v-model="acaoRealizada"
            rows="4"
            placeholder="Descreva os serviços executados hoje na montagem..."
          ></textarea>
        </div>

        <div class="bloco-campo-texto">
          <div class="topo-label-texto">
            <label>Observações</label>
            <span>Registro técnico diário</span>
          </div>
          <textarea
            v-model="observacoes"
            rows="2"
            placeholder="Anotações de ferragens, ajustes ou pendências..."
          ></textarea>
        </div>

        <div class="rodape-auto-save">
          <div class="info-save">
            <img :src="iconeRelogio" alt="Salvo" />
            <span>Salvo automaticamente há 3 minutos</span>
          </div>
          <span>{{ totalCaracteres }} caracteres</span>
        </div>
      </section>
    </div>

      <footer v-if="obra" class="barra-acoes-rodape">
      <button
        type="button"
        class="botao-relatar-ocorrencia"
        @click="irParaRelatarOcorrencia"
      >
        <img :src="iconeAlertaVermelho" alt="Ocorrência" />
        <span>Relatar Ocorrência / Bloqueio</span>
      </button>

      <button
        v-if="ehPerfilEscritorio"
        type="button"
        class="botao-editar-amarelo"
        @click="mostrarFormularioItem = !mostrarFormularioItem"
      >
        Editar
      </button>

      <button
        v-if="ocorrenciaAbertaId || (obra?.status || '').toLowerCase().includes('ocorr')"
        type="button"
        class="botao-solucionar-azul"
        @click="irParaSolucionarOcorrencia"
      >
        Solucionar Ocorrência
      </button>

      <button
        type="button"
        class="botao-concluir-verde"
        @click="enviarFeedbackEConcluir"
      >
        <img :src="iconeCorreto" alt="Concluir" />
        <span>Enviar Feedback e Concluir</span>
      </button>
    </footer>

    <div v-if="fotoAmpliada" class="fundo-modal" @click.self="fotoAmpliada = null">
      <div class="janela-modal-foto">
        <img :src="fotoAmpliada.url" :alt="fotoAmpliada.legenda" />
        <div class="rodape-modal-foto">
          <strong>{{ fotoAmpliada.legenda }}</strong>
          <button type="button" @click="fotoAmpliada = null">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-progresso-montagem {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #0f172a;
}

.barra-superior {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.botao-voltar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.botao-voltar:hover {
  color: #0f172a;
}

.icone-seta {
  width: 14px;
  height: 14px;
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

.cabecalho-pagina {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.cabecalho-pagina h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.cabecalho-pagina p {
  font-size: 13px;
  color: #64748b;
}

.selo-fase-topo {
  background-color: #bbf7d0;
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.grade-duas-colunas {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  align-items: start;
}

.coluna-esquerda {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cartao-branco {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.topo-cartao-cliente {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.topo-cartao-cliente h2 {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
}

.selo-status-cliente {
  background-color: #bbf7d0;
  color: #15803d;
  font-size: 10.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  line-height: 1.2;
}

.bloco-titular {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.etiqueta-cinza {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #64748b;
}

.bloco-titular h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.lista-blocos-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bloco-info-item {
  background-color: #f8fafc;
  border-radius: 10px;
  padding: 11px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.icone-bloco {
  width: 15px;
  height: 15px;
  margin-top: 2px;
  flex-shrink: 0;
}

.rotulo-bloco {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}

.bloco-info-item strong {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.35;
}

.botao-pdf-planejamento {
  width: 100%;
  background-color: #fee2e2;
  color: #c8102e;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-pdf-planejamento:hover {
  background-color: #fecaca;
}

.botao-pdf-planejamento img {
  width: 15px;
  height: 15px;
}

.topo-cartao-fotos {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.topo-cartao-fotos h2 {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}

.subtitulo-fotos {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 4px;
}

.badge-anexadas {
  background-color: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  text-align: center;
  line-height: 1.25;
}

.area-upload {
  background-color: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.area-upload:hover {
  border-color: #c8102e;
}

.circulo-nuvem {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin-bottom: 4px;
}

.circulo-nuvem img {
  width: 18px;
  height: 18px;
}

.area-upload strong {
  font-size: 12px;
  color: #0f172a;
}

.area-upload span {
  font-size: 10.5px;
  color: #64748b;
}

.grade-miniaturas {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.card-foto {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  height: 110px;
  background-color: #1e293b;
}

.imagem-foto {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sobreposicao-foto {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.78) 10%, transparent 65%);
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
}

.legenda-foto {
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.botoes-foto {
  display: flex;
  gap: 6px;
}

.botao-mini-foto {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.botao-mini-foto.excluir {
  background-color: #c8102e;
}

.botao-mini-foto img {
  width: 11px;
  height: 11px;
}

.botao-mini-foto.excluir img {
  filter: brightness(0) invert(1);
}

.botao-mais-fotos {
  width: 100%;
  background-color: #f1f5f9;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
}

.botao-mais-fotos img {
  width: 14px;
  height: 14px;
}

.botao-solucionar-azul {
  background-color: #1d4ed8;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 11px 18px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-solucionar-azul:hover {
  background-color: #1e40af;
}

.topo-checklist {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.topo-checklist h2 {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.topo-checklist p {
  font-size: 12.5px;
  color: #64748b;
  margin-top: 3px;
}

.caixa-contador-checklist {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.caixa-contador-checklist strong {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.caixa-contador-checklist span {
  font-size: 10.5px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.cabecalho-categoria {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}

.titulo-categoria {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #475569;
}

.contagem-validados {
  font-size: 11.5px;
  color: #64748b;
}

.lista-itens-tecnicos {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.linha-item-tecnico {
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 13px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.linha-item-tecnico:hover {
  border-color: #cbd5e1;
}

.lado-esquerdo-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quadrado-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  background-color: #ffffff;
  flex-shrink: 0;
}

.quadrado-check.ativo {
  background-color: #c8102e;
  border-color: #c8102e;
}

.textos-item-tecnico {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.textos-item-tecnico strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.subtexto-verde {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
}

.subtexto-pendente {
  font-size: 11px;
  color: #64748b;
}

.icone-validado {
  width: 18px;
  height: 18px;
}

.circulo-vazio {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  display: inline-block;
}

.box-novo-item {
  display: flex;
  gap: 8px;
}

.box-novo-item input {
  flex: 1;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12.5px;
}

.box-novo-item button {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.bloco-campo-texto {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.topo-label-texto {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topo-label-texto label {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
}

.topo-label-texto span {
  font-size: 11px;
  color: #64748b;
}

.bloco-campo-texto textarea {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: #1e293b;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.bloco-campo-texto textarea:focus {
  background-color: #ffffff;
  border-color: #cbd5e1;
}

.rodape-auto-save {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #64748b;
}

.info-save {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-save img {
  width: 13px;
  height: 13px;
}

.barra-acoes-rodape {
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.botao-relatar-ocorrencia {
  background-color: #fee2e2;
  color: #c8102e;
  border: none;
  border-radius: 8px;
  padding: 11px 16px;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.botao-relatar-ocorrencia img {
  width: 15px;
  height: 15px;
}

.botao-editar-amarelo {
  background-color: #eab308;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 11px 18px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.botao-concluir-verde {
  background-color: #14532d;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 11px 18px;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.botao-concluir-verde img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.fundo-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.janela-modal-foto {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  max-width: 680px;
  width: 100%;
}

.janela-modal-foto img {
  width: 100%;
  max-height: 75vh;
  object-fit: contain;
  background: #0f172a;
}

.rodape-modal-foto {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rodape-modal-foto button {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
}

.mensagem-estado,
.mensagem-erro {
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 960px) {
  .grade-duas-colunas {
    grid-template-columns: 1fr;
  }
}
</style>