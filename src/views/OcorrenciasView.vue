<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

import iconePessoa from '@/assets/icones/pessoa.svg'
import iconeSetaEsquerda from '@/assets/icones/setaesquerda.svg'
import iconeLocal from '@/assets/icones/local.svg'
import iconeFoto from '@/assets/icones/foto.svg'
import iconeFolha from '@/assets/icones/folha.svg'

const rota = useRoute()
const roteador = useRouter()

const listaObras = ref([])
const listaMontadores = ref([])
const obraSelecionadaId = ref(rota.query.obraId ? Number(rota.query.obraId) : null)
const obraAtual = ref(null)

const fotoArquivo = ref(null)
const fotoPreview = ref('')
const fotoBase64 = ref('')
const inputFoto = ref(null)

const pontoLocal = ref('')
const descricaoProblema = ref('')
const enviando = ref(false)

const carregarObras = async () => {
  try {
    const [respObras, respMont] = await Promise.allSettled([
      api.get('/Obra'),
      api.get('/Montador')
    ])

    if (respObras.status === 'fulfilled') {
      listaObras.value = respObras.value.data || []
    }
    if (respMont.status === 'fulfilled') {
      listaMontadores.value = respMont.value.data || []
    }

    if (obraSelecionadaId.value) {
      await carregarObraEspecifica(obraSelecionadaId.value)
    } else if (listaObras.value.length > 0) {
      const primeira = listaObras.value[0]
      obraSelecionadaId.value = primeira.id ?? primeira.obraId
      definirDadosObra(primeira)
    }
  } catch (erro) {
    console.error('Erro ao carregar obras:', erro)
  }
}

const definirDadosObra = (dados) => {
  if (!dados) return
  const id = dados.id ?? dados.obraId
  obraAtual.value = {
    id,
    cliente:
      dados.cliente?.nome ||
      dados.clienteNome ||
      dados.nomeCliente ||
      dados.nome ||
      `Obra #${id}`,
    endereco: dados.cliente?.endereco || dados.endereco || 'Endereço não cadastrado',
    montadorId: dados.montadorId || dados.montador?.id || null,
    raw: dados
  }
}

const carregarObraEspecifica = async (id) => {
  try {
    const resp = await api.get(`/Obra/${id}`)
    definirDadosObra(resp.data)
  } catch {
    const encontrada = listaObras.value.find((o) => (o.id ?? o.obraId) === Number(id))
    if (encontrada) definirDadosObra(encontrada)
  }
}

const aoTrocarObra = async () => {
  if (obraSelecionadaId.value) {
    await carregarObraEspecifica(obraSelecionadaId.value)
  }
}

const abrirSeletorFoto = () => {
  inputFoto.value?.click()
}

const selecionarFoto = (evento) => {
  const arquivo = evento.target.files?.[0]
  if (!arquivo) return
  fotoArquivo.value = arquivo
  fotoPreview.value = URL.createObjectURL(arquivo)

  const leitor = new FileReader()
  leitor.onload = () => {
    fotoBase64.value = String(leitor.result || '')
  }
  leitor.readAsDataURL(arquivo)
}

const cancelarEVoltar = () => {
  if (obraSelecionadaId.value) {
    roteador.push(`/obras/${obraSelecionadaId.value}`)
  } else {
    roteador.push('/obras')
  }
}



const obterMontadorIdValido = () => {
 const obraAtual = listaObras.value.find((o) => Number(o.id) === Number(obraSelecionadaId.value))

 const idDaObra = Number(obraAtual?.montadorId || obraAtual?.montador?.id)
  if (idDaObra > 0) return idDaObra

  if (listaMontadores.value?.length > 0) {
    return Number(listaMontadores.value[0].id)
  }
  
  return 1
}

const enviarNotificacao = async () => {
  if (!obraSelecionadaId.value) {
    alert('Selecione uma obra antes de enviar a ocorrência.')
    return
  }
  if (!pontoLocal.value.trim()) {
    alert('Informe o Ponto / Local Identificado.')
    return
  }
  if (descricaoProblema.value.trim().length < 30) {
    alert('A descrição detalhada deve ter no mínimo 30 caracteres.')
    return
  }

  enviando.value = true
  try {
    const idObra = Number(obraSelecionadaId.value)
    const montadorId = obterMontadorIdValido()

    const respOcorrencia = await api.post('/Ocorrencia', {
      obraId: idObra,
      montadorId,
      fotoOcorrencia: fotoArquivo.value?.name || 'evidencia.png',
      local: pontoLocal.value.trim(),
      descricao: descricaoProblema.value.trim(),
      prazo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })

    const ocorrenciaId = respOcorrencia.data?.id ?? respOcorrencia.data?.ocorrenciaId

    if (ocorrenciaId) {
      if (fotoBase64.value) {
        sessionStorage.setItem(`ocorrencia_foto_${ocorrenciaId}`, fotoBase64.value)
      }
      const montadorObj = listaMontadores.value.find((m) => Number(m.id) === montadorId)
      if (montadorObj?.nome) {
        sessionStorage.setItem(`ocorrencia_montador_${ocorrenciaId}`, montadorObj.nome)
      }
    }

    const respObra = await api.get(`/Obra/${idObra}`)
    const o = respObra.data

    await api.put(`/Obra/${idObra}`, {
      codigo: o.codigo || `PRJ-${idObra}`,
      clienteId: Number(o.clienteId),
      montadorId: Number(o.montadorId),
      arquitetoId: Number(o.arquitetoId),
      dataInspecao: o.dataInspecao || new Date().toISOString(),
      prazo: o.prazo || new Date().toISOString(),
      pdf: o.pdf || 'planejamento.pdf',
      status: 'Com Ocorrência'
    })

    if (ocorrenciaId) {
      roteador.push(`/ocorrencias/${ocorrenciaId}/correcao`)
    } else {
      roteador.push('/obras')
    }
  } catch (erro) {
    console.error('Erro ao registrar ocorrência:', erro.response?.data || erro)
    const detalhes =
      erro.response?.data?.errors ||
      erro.response?.data ||
      erro.message ||
      'Erro ao enviar ocorrência.'
    alert(typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes, null, 2))
  } finally {
    enviando.value = false
  }
}

onMounted(carregarObras)
</script>

<template>
  <div class="pagina-relatar-ocorrencia">
    <header class="barra-superior">
      <span class="etiqueta-superior">MARCENARIA FINA • CANTEIRO OPERACIONAL</span>
      <div class="avatar-usuario" title="Perfil">
        <img :src="iconePessoa" alt="Usuário" />
      </div>
    </header>

    <div class="linha-subtopo">
      <button type="button" class="botao-voltar" @click="cancelarEVoltar">
        <img :src="iconeSetaEsquerda" alt="Voltar" />
        <span>Voltar para Obras</span>
      </button>

      <span class="badge-bloqueio-topo">• BLOQUEIO EM ABERTO / PENDÊNCIA TÉCNICA</span>
    </div>

    <section class="cabecalho-ocorrencia">
      <span class="subtitulo-vermelho">FISCALIZAÇÃO OPERACIONAL • CANTEIRO DE OBRAS</span>
      <h1>Relatar Ocorrência na Obra</h1>
      <p>Registro de divergências, avarias de transporte e falhas de montagem em campo.</p>
    </section>

    <section v-if="obraAtual" class="cartao-cliente-vermelho">
      <div class="icone-obra-vermelho">
        <span>!</span>
      </div>
      <div class="info-cliente-vermelho">
        <h2>{{ obraAtual.cliente }}</h2>
        <p>
          <img :src="iconeLocal" alt="Endereço" />
          <span>{{ obraAtual.endereco }}</span>
        </p>
      </div>

      <select
        v-if="!rota.query.obraId && listaObras.length > 1"
        v-model="obraSelecionadaId"
        class="seletor-obra-inline"
        @change="aoTrocarObra"
      >
        <option v-for="o in listaObras" :key="o.id ?? o.obraId" :value="o.id ?? o.obraId">
          {{ o.cliente?.nome || o.clienteNome || o.codigo || `Obra #${o.id}` }}
        </option>
      </select>
    </section>

    <form class="formulario-ocorrencia" @submit.prevent="enviarNotificacao">
      <div class="bloco-campo">
        <div class="cabecalho-campo">
          <label>
            <img :src="iconeFoto" alt="Foto" class="icone-label" />
            <span>Registro Fotográfico da Falha <strong class="asterisco">*</strong></span>
          </label>
          <span class="dica-direita">Evidência obrigatória para triagem técnica</span>
        </div>

        <div class="caixa-upload-foto" @click="abrirSeletorFoto">
          <template v-if="fotoPreview">
            <img :src="fotoPreview" alt="Preview da falha" class="preview-imagem" />
            <span class="texto-trocar-foto">Clique para alterar a imagem selecionada</span>
          </template>
          <template v-else>
            <div class="icone-camera-box">
              <img :src="iconeFoto" alt="Câmera" />
            </div>
            <strong>Clique ou arraste a foto do problema ou defeito encontrado</strong>
            <p>
              Formatos aceitos: JPG, PNG até 15MB • Fotografe sob iluminação clara<br />
              evidenciando o ponto exato da divergência milimétrica.
            </p>
            <button type="button" class="botao-selecionar-arquivo">
              <img :src="iconeFolha" alt="Arquivo" />
              <span>Selecionar do Computador ou Celular</span>
            </button>
          </template>

          <input
            ref="inputFoto"
            type="file"
            accept="image/png, image/jpeg"
            hidden
            @change="selecionarFoto"
          />
        </div>
      </div>

      <div class="bloco-campo">
        <div class="cabecalho-campo">
          <label>
            <img :src="iconeLocal" alt="Local" class="icone-label" />
            <span>Ponto / Local Identificado <strong class="asterisco">*</strong></span>
          </label>
          <span class="dica-direita">Ambiente • Módulo • Peça</span>
        </div>

        <div class="input-com-icone">
          <img :src="iconeLocal" alt="Ponto" />
          <input
            v-model="pontoLocal"
            type="text"
            placeholder="Ex: Suíte Master - Porta Deslizante Esquerda do Closet"
            required
          />
        </div>
      </div>

      <div class="bloco-campo">
        <div class="cabecalho-campo">
          <label>
            <img :src="iconeFolha" alt="Descrição" class="icone-label" />
            <span>Descrição Detalhada do Problema Encontrado <strong class="asterisco">*</strong></span>
          </label>
          <span class="dica-direita">Mínimo 30 caracteres ({{ descricaoProblema.length }}/30)</span>
        </div>

        <textarea
          v-model="descricaoProblema"
          rows="4"
          placeholder="Descreva detalhadamente a divergência encontrada, medidas afetadas e necessidade de reposição ou ajuste..."
          required
        ></textarea>
      </div>

      <div class="rodape-botoes">
        <button type="button" class="botao-cancelar" @click="cancelarEVoltar">
          Cancelar e Voltar
        </button>

        <button type="submit" class="botao-enviar-vermelho" :disabled="enviando">
          {{ enviando ? 'Enviando...' : 'Enviar Notificação para Responsável' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.pagina-relatar-ocorrencia {
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

.etiqueta-superior {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
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

.linha-subtopo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.botao-voltar {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.botao-voltar img {
  width: 13px;
  height: 13px;
}

.badge-bloqueio-topo {
  background-color: #fee2e2;
  color: #c8102e;
  font-size: 10.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.cabecalho-ocorrencia {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subtitulo-vermelho {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #c8102e;
}

.cabecalho-ocorrencia h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.cabecalho-ocorrencia p {
  font-size: 13px;
  color: #64748b;
}

.cartao-cliente-vermelho {
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.icone-obra-vermelho {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #c8102e;
  color: #ffffff;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-cliente-vermelho {
  flex: 1;
}

.info-cliente-vermelho h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 3px;
}

.info-cliente-vermelho p {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.info-cliente-vermelho p img {
  width: 13px;
  height: 13px;
}

.seletor-obra-inline {
  height: 36px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12.5px;
  background-color: #ffffff;
}

.formulario-ocorrencia {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bloco-campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cabecalho-campo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.cabecalho-campo label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.icone-label {
  width: 15px;
  height: 15px;
}

.asterisco {
  color: #c8102e;
}

.dica-direita {
  font-size: 11px;
  color: #64748b;
}

.caixa-upload-foto {
  background-color: #f1f5f9;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.caixa-upload-foto:hover {
  border-color: #c8102e;
}

.icone-camera-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 4px;
}

.icone-camera-box img {
  width: 20px;
  height: 20px;
}

.caixa-upload-foto strong {
  font-size: 13px;
  color: #0f172a;
}

.caixa-upload-foto p {
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
}

.botao-selecionar-arquivo {
  margin-top: 6px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.botao-selecionar-arquivo img {
  width: 13px;
  height: 13px;
}

.preview-imagem {
  max-height: 220px;
  border-radius: 8px;
  object-fit: contain;
}

.texto-trocar-foto {
  font-size: 11.5px;
  font-weight: 600;
  color: #c8102e;
}

.input-com-icone {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  height: 44px;
}

.input-com-icone img {
  width: 15px;
  height: 15px;
  opacity: 0.65;
}

.input-com-icone input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #1e293b;
}

.bloco-campo textarea {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: #1e293b;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.bloco-campo textarea:focus {
  background-color: #ffffff;
  border-color: #cbd5e1;
}

.rodape-botoes {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.botao-cancelar {
  background-color: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  padding: 12px 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.botao-enviar-vermelho {
  background-color: #c8102e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
}

.botao-enviar-vermelho:hover {
  background-color: #a50d26;
}

.botao-enviar-vermelho:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>