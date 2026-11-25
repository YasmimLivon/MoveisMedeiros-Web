<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

import iconeNuvem from '@/assets/icones/foto.svg'
import iconeCorreto from '@/assets/icones/correto.svg'
import iconeCadeado from '@/assets/icones/folha.svg'
import iconeInfo from '@/assets/icones/alertavermelho.svg'
import iconeFoto from '@/assets/icones/foto.svg'

const rota = useRoute()
const roteador = useRouter()
const ocorrenciaId = rota.params.id

const ocorrencia = ref(null)
const carregando = ref(true)
const salvando = ref(false)

const responsavelCorrecao = ref('')
const prazoRealizacao = ref('')
const veiculoUtilizado = ref('TWD382')
const descricaoServicoFeito = ref('')
const fotoCorrigidaUrl = ref('')
const inputFotoRef = ref(null)

const obterParamsAcesso = () => {
  try {
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}')
    return {
      montadorId: usuarioSalvo.montadorId ? Number(usuarioSalvo.montadorId) : 1,
      usuarioId: usuarioSalvo.id ? Number(usuarioSalvo.id) : 1
    }
  } catch {
    return { montadorId: 1, usuarioId: 1 }
  }
}

const formatarDataHora = (dataIso) => {
  if (!dataIso) return 'Não definido'
  const d = new Date(dataIso)
  if (Number.isNaN(d.getTime())) return dataIso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const carregarOcorrencia = async () => {
  carregando.value = true
  try {
    const params = obterParamsAcesso()
    const resp = await api.get(`/Ocorrencia/${ocorrenciaId}`, { params })
    ocorrencia.value = resp.data

    const montadorNomeLocal = sessionStorage.getItem(`ocorrencia_montador_${ocorrenciaId}`)
    responsavelCorrecao.value =
      montadorNomeLocal ||
      resp.data?.montador?.nome ||
      'Marcos Pereira - Técnico'

    prazoRealizacao.value = formatarDataHora(resp.data?.prazo)
  } catch (erro) {
    console.error('Erro ao carregar ocorrência:', erro.response?.data || erro)
  } finally {
    carregando.value = false
  }
}

const obterImagemOcorrencia = () => {
  const fotoLocal = sessionStorage.getItem(`ocorrencia_foto_${ocorrenciaId}`)
  if (fotoLocal) return fotoLocal

  const fotoApi = ocorrencia.value?.fotoOcorrencia
  if (
    fotoApi &&
    (fotoApi.startsWith('http') || fotoApi.startsWith('data:') || fotoApi.startsWith('blob:'))
  ) {
    return fotoApi
  }
  return ''
}

const selecionarFotoCorrigida = (evento) => {
  const arquivo = evento.target.files?.[0]
  if (!arquivo) return
  fotoCorrigidaUrl.value = URL.createObjectURL(arquivo)
  evento.target.value = ''
}

const enviarFeedbackEAtualizar = async () => {
  if (!descricaoServicoFeito.value.trim()) {
    alert('Descreva o serviço realizado antes de concluir.')
    return
  }

  salvando.value = true
  try {
    const { montadorId } = obterParamsAcesso()
    const obraId = Number(ocorrencia.value?.obraId)

    await api.put(`/Ocorrencia/${ocorrenciaId}`, {
      obraId,
      montadorId: Number(ocorrencia.value?.montadorId || montadorId),
      fotoOcorrencia: fotoCorrigidaUrl.value || ocorrencia.value?.fotoOcorrencia || 'corrigido.png',
      local: ocorrencia.value?.local || '',
      descricao: `${ocorrencia.value?.descricao || ''} | Solução: ${descricaoServicoFeito.value.trim()}`,
      prazo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })

    if (obraId) {
      await api.patch(`/Obra/${obraId}/concluir`)
    }

    alert('Feedback enviado e status atualizado para Liberado / Concluído!')
    roteador.push('/obras')
  } catch (erro) {
    console.error('Erro ao atualizar ocorrência:', erro.response?.data || erro)
    const detalhes = erro.response?.data || 'Erro ao concluir ocorrência.'
    alert(typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes, null, 2))
  } finally {
    salvando.value = false
  }
}

onMounted(carregarOcorrencia)
</script>

<template>
  <div class="pagina-correcao">
    <header class="barra-superior">
      <span class="etiqueta-topo">MARCENARIA FINA • CANTEIRO OPERACIONAL</span>
      <div class="avatar-topo">
        <img :src="iconePessoa" alt="Perfil" />
      </div>
    </header>

    <div class="linha-voltar">
      <button type="button" class="botao-voltar" @click="roteador.push('/obras')">
        <img :src="iconeSetaEsquerda" alt="Voltar" />
        <span>Voltar para Obras</span>
      </button>

      <span class="badge-intervencao">
        <span class="ponto-vermelho"></span> INTERVENÇÃO EM CAMPO
      </span>
    </div>

    <section class="cabecalho-pagina">
      <span class="sub-vermelho">FISCALIZAÇÃO OPERACIONAL • CANTEIRO DE OBRAS</span>
      <h1>Correção do Problema Relatado</h1>
      <p>Acompanhamento da solução técnica executada e liberação em campo</p>
    </section>

    <p v-if="carregando" class="estado-texto">Carregando dados da ocorrência...</p>

    <div v-else class="grade-duas-colunas">
      <!-- CARTÃO ESQUERDO: OCORRÊNCIA REGISTRADA -->
      <section class="cartao-branco">
        <div class="topo-cartao">
          <span class="badge-rosa">OCORRÊNCIA REGISTRADA</span>
          <span class="texto-leitura">
            <img :src="iconeCadeado" alt="Somente leitura" class="icone-mini" />
            <span>Somente Leitura</span>
          </span>
        </div>

        <div class="box-imagem-ocorrencia">
          <img
            v-if="obterImagemOcorrencia()"
            :src="obterImagemOcorrencia()"
            alt="Evidência da ocorrência"
            class="foto-evidencia"
          />
          <div v-else class="placeholder-evidencia">
            <img :src="iconeFoto" alt="Sem imagem" class="icone-placeholder" />
            <span>Sem imagem anexada no registro</span>
          </div>
          <span class="tag-escura">
            <img :src="iconeInfo" alt="Alerta" class="icone-tag-escura" />
            <span>Inconformidade Identificada</span>
          </span>
        </div>

        <div class="bloco-cinza">
          <span class="rotulo-mini">PONTO / LOCAL IDENTIFICADO</span>
          <strong>
            {{ ocorrencia?.local || 'Ambiente não especificado' }}
          </strong>
        </div>

        <div class="bloco-cinza">
          <span class="rotulo-mini">DESCRIÇÃO TÉCNICA DA INCONFORMIDADE</span>
          <p class="texto-descricao">
            {{ ocorrencia?.descricao || 'Nenhuma descrição registrada.' }}
          </p>
        </div>
      </section>

      <!-- CARTÃO DIREITO: SOLUÇÃO TÉCNICA -->
      <section class="cartao-branco">
        <div class="topo-cartao">
          <span class="badge-azul">SOLUÇÃO TÉCNICA</span>
          <span class="status-verde">
            <span class="ponto-verde"></span> Pronto para Validação
          </span>
        </div>

        <div class="grade-dois">
          <div class="campo">
            <label>Responsável pela Correção</label>
            <div class="input-cinza">
              <img :src="iconePessoa" alt="Responsável" />
              <input v-model="responsavelCorrecao" type="text" readonly />
            </div>
          </div>

          <div class="campo">
            <label>Prazo para Realização</label>
            <div class="input-cinza">
              <img :src="iconeCalendario" alt="Prazo" />
              <input v-model="prazoRealizacao" type="text" readonly />
            </div>
          </div>
        </div>

        <div class="campo">
          <label>Veículo Utilizado</label>
          <select v-model="veiculoUtilizado" class="select-cinza">
            <option value="TWD382">TWD382</option>
            <option value="Fiorino - ABC1234">Fiorino - ABC1234</option>
            <option value="Ducato - XYZ9876">Ducato - XYZ9876</option>
          </select>
        </div>

        <div class="campo">
          <label>Foto do Serviço Corrigido</label>
          <div class="box-upload-duplo">
            <div class="preview-gabarito">
              <img
                v-if="fotoCorrigidaUrl"
                :src="fotoCorrigidaUrl"
                alt="Serviço corrigido"
              />
              <div v-else class="sem-foto-corrigida">Sem foto</div>
              <span v-if="fotoCorrigidaUrl" class="tag-gabarito">
                <img :src="iconeCorreto" alt="OK" class="icone-gabarito" />
                <span>GABARITO OK</span>
              </span>
            </div>

            <div class="area-anexar" @click="inputFotoRef?.click()">
              <img :src="iconeNuvem" alt="Anexar" class="icone-nuvem" />
              <strong>Substituir ou Anexar</strong>
              <span>JPG, PNG até 12MB</span>
              <span class="link-vermelho">Selecionar novo arquivo</span>
              <input
                ref="inputFotoRef"
                type="file"
                accept="image/png, image/jpeg"
                hidden
                @change="selecionarFotoCorrigida"
              />
            </div>
          </div>
        </div>

        <div class="campo">
          <label>Descrição do que foi feito</label>
          <textarea
            v-model="descricaoServicoFeito"
            rows="4"
            placeholder="Ex: Realizado refilamento e nova furação padronizada, acabamento em cera e alinhamento milimétrico."
          ></textarea>
        </div>

        <button
          type="button"
          class="botao-confirmar-verde"
          :disabled="salvando"
          @click="enviarFeedbackEAtualizar"
        >
          <img :src="iconeCorreto" alt="Confirmar" />
          <span>
            {{ salvando ? 'Salvando...' : 'Enviar Feedback e Atualizar Status do Serviço' }}
          </span>
        </button>

        <p class="nota-rodape">
          Ao confirmar, o status geral do ambiente mudará para
          <span class="texto-verde-link">Liberado / Concluído</span>.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pagina-correcao {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #0f172a;
}

.barra-superior {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.etiqueta-topo {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
}

.avatar-topo {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #c8102e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-topo img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.linha-voltar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.botao-voltar {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.botao-voltar img {
  width: 13px;
  height: 13px;
}

.badge-intervencao {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #fee2e2;
  color: #c8102e;
  font-size: 10.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.ponto-vermelho {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #c8102e;
}

.sub-vermelho {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #c8102e;
}

.cabecalho-pagina h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 4px 0;
}

.cabecalho-pagina p {
  font-size: 13px;
  color: #64748b;
}

.grade-duas-colunas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.cartao-branco {
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.topo-cartao {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-rosa {
  background-color: #fee2e2;
  color: #c8102e;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
}

.badge-azul {
  background-color: #e0e7ff;
  color: #3730a3;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
}

.texto-leitura {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #64748b;
}

.icone-mini {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

.status-verde {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
}

.ponto-verde {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #15803d;
}

.box-imagem-ocorrencia {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  height: 210px;
  background-color: #1e293b;
}

.foto-evidencia {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-evidencia {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 12px;
}

.icone-placeholder {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
  opacity: 0.6;
}

.tag-escura {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(15, 23, 42, 0.85);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.icone-tag-escura {
  width: 12px;
  height: 12px;
  filter: brightness(0) invert(1);
}

.bloco-cinza {
  background-color: #f8fafc;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rotulo-mini {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.bloco-cinza strong {
  font-size: 14px;
  color: #0f172a;
}

.texto-descricao {
  font-size: 12.5px;
  color: #334155;
  line-height: 1.5;
}

.grade-dois {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.campo label {
  font-size: 11.5px;
  font-weight: 700;
  color: #334155;
}

.input-cinza {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 0 10px;
  height: 36px;
}

.input-cinza img {
  width: 13px;
  height: 13px;
  opacity: 0.65;
}

.input-cinza input {
  border: none;
  background: transparent;
  font-size: 12px;
  color: #0f172a;
  width: 100%;
  outline: none;
}

.select-cinza {
  height: 36px;
  background-color: #f1f5f9;
  border: none;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 12.5px;
  color: #0f172a;
  outline: none;
}

.box-upload-duplo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  min-height: 125px;
}

.preview-gabarito {
  position: relative;
  background-color: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-gabarito img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sem-foto-corrigida {
  font-size: 11px;
  color: #64748b;
}

.tag-gabarito {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #15803d;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 4px;
}

.icone-gabarito {
  width: 10px;
  height: 10px;
  filter: brightness(0) invert(1);
}

.area-anexar {
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  gap: 3px;
  cursor: pointer;
}

.icone-nuvem {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
}

.area-anexar strong {
  font-size: 11.5px;
  color: #0f172a;
}

.area-anexar span {
  font-size: 10px;
  color: #64748b;
}

.area-anexar .link-vermelho {
  color: #c8102e;
  font-weight: 700;
  margin-top: 2px;
}

.campo textarea {
  background-color: #f1f5f9;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 12.5px;
  font-family: inherit;
  color: #0f172a;
  resize: vertical;
  outline: none;
}

.botao-confirmar-verde {
  width: 100%;
  background-color: #10b981;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.botao-confirmar-verde:hover {
  background-color: #059669;
}

.botao-confirmar-verde img {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.nota-rodape {
  text-align: center;
  font-size: 11px;
  color: #64748b;
}

.texto-verde-link {
  color: #10b981;
  font-weight: 700;
}

@media (max-width: 900px) {
  .grade-duas-colunas {
    grid-template-columns: 1fr;
  }
}
</style>