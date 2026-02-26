import './style.css'
import { supabase } from './supabase.js'

// ── STATE ──
const state = {
  city: '',
  type: '',
  data: {}
}

const typeLabels = {
  abrigo:       '🏠 Abrigo',
  doacao:       '📦 Ponto de Doação',
  desaparecido: '🔍 Pessoa Desaparecida',
  alimentacao:  '🍽️ Ponto de Alimentação',
  comunidade:   '🏘️ Comunidade / Bairro',
  voluntario:   '🙋 Oferecer Ajuda'
}

// ── NAVIGATION ──
window.goStep = function (n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'))
  document.getElementById('step-' + n).classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

window.selectCity = function (city) {
  state.city = city
  document.getElementById('selected-city-label').textContent = city
  document.getElementById('ctx-city').textContent = city
  goStep(2)
}

window.selectType = function (type) {
  state.type = type
  document.getElementById('ctx-type').textContent = typeLabels[type] || type

  document.querySelectorAll('.form-type').forEach(f => f.style.display = 'none')
  const form = document.getElementById('form-' + type)
  if (form) form.style.display = 'block'

  goStep(3)
}

// ── MAPA: tipo → tabela e campos ──
const TIPO_TABELA = {
  abrigo:       'abrigos',
  doacao:       'pontos_doacao',
  desaparecido: 'desaparecidos',
  alimentacao:  'pontos_alimentacao',
  comunidade:   'comunidades',
  voluntario:   'voluntarios'
}

// Campos que devem virar arrays (checkboxes múltiplos)
const CAMPOS_ARRAY = new Set([
  'recursos', 'aceita', 'refeicao', 'necessidades', 'habilidade'
])

// Mapa de nomes de campo do form → coluna da tabela
const CAMPO_COLUNA = {
  refeicao:     'refeicoes',
  habilidade:   'habilidades',
  pix_tipo:     'pix_tipo',
  pix_chave:    'pix_chave',
  pix_titular:  'pix_titular',
  ultima_vez:   'ultima_vez_visto',
  saude:        'condicao_saude',
  informante_nome: 'informante_nome',
  informante_tel:  'informante_tel',
}

// Carrega cidade_id a partir do nome (cache simples)
const cidadeCache = {}
async function getCidadeId(nome) {
  if (cidadeCache[nome]) return cidadeCache[nome]
  const { data, error } = await supabase
    .from('cidades')
    .select('id')
    .eq('nome', nome)
    .single()
  if (error || !data) throw new Error(`Cidade não encontrada: ${nome}`)
  cidadeCache[nome] = data.id
  return data.id
}

// ── FORM SUBMIT ──
window.submitForm = async function (event, tipo) {
  event.preventDefault()
  const form = event.target
  const submitBtn = form.querySelector('[type="submit"]')

  const originalText = submitBtn.innerHTML
  submitBtn.innerHTML = 'Salvando...'
  submitBtn.disabled = true

  const existingError = form.querySelector('.form-error')
  if (existingError) existingError.remove()

  try {
    const cidade_id = await getCidadeId(state.city)
    const formRaw = collectFormData(form)
    state.data = formRaw

    // Monta payload para a tabela correta
    const payload = { cidade_id }
    for (const [key, val] of Object.entries(formRaw)) {
      if (!val || val === '' || val === '— Não recebe PIX —') continue
      const coluna = CAMPO_COLUNA[key] || key
      payload[coluna] = CAMPOS_ARRAY.has(key)
        ? (Array.isArray(val) ? val : [val])
        : val
    }

    const tabela = TIPO_TABELA[tipo]
    const { error } = await supabase.from(tabela).insert(payload)

    if (error) throw error

    const summary = buildSummary(state.city, tipo, formRaw)
    document.getElementById('summary-text').textContent = summary
    goStep(4)

  } catch (err) {
    submitBtn.innerHTML = originalText
    submitBtn.disabled = false
    const errEl = document.createElement('div')
    errEl.className = 'alert alert-warning form-error'
    errEl.style.marginTop = '16px'
    errEl.innerHTML = `<span>⚠️</span><span>Erro ao salvar: ${err.message}. Tente novamente.</span>`
    form.appendChild(errEl)
  }
}

// ── COLLECT FORM DATA ──
function collectFormData(form) {
  const formData = new FormData(form)
  const data = {}
  formData.forEach((value, key) => {
    if (data[key]) {
      if (!Array.isArray(data[key])) data[key] = [data[key]]
      data[key].push(value)
    } else {
      data[key] = value
    }
  })
  return data
}

// ── BUILD SUMMARY ──
function buildSummary(city, type, data) {
  const now = new Date().toLocaleString('pt-BR')
  const lines = []
  lines.push('=== AJUDE JF — ' + (typeLabels[type] || type).toUpperCase() + ' ===')
  lines.push('📍 Cidade: ' + city)
  lines.push('📅 Data/hora: ' + now)
  lines.push('')

  const labelMap = {
    nome_local:       'Local',
    nome_pessoa:      'Nome da pessoa',
    nome:             'Nome',
    responsavel:      'Responsável',
    telefone:         'Telefone/WhatsApp',
    endereco:         'Endereço',
    vagas:            'Vagas disponíveis',
    recursos:         'Recursos disponíveis',
    animais:          'Aceita animais',
    necessidades:     'Necessidades AGORA',
    nao_precisa:      'NÃO precisa',
    prioridade:       'Prioridade',
    horario:          'Horário',
    aceita:           'O que aceita',
    pix_tipo:         'Tipo da chave PIX',
    pix_chave:        'Chave PIX',
    pix_titular:      'Titular PIX',
    refeicao:         'Tipo de refeição',
    voluntarios:      'Precisa voluntários',
    capacidade:       'Capacidade',
    familias:         'Famílias afetadas',
    descricao:        'Descrição física',
    ultima_vez:       'Última vez visto',
    local_visto:      'Local visto',
    saude:            'Condição de saúde',
    informante_nome:  'Informante',
    informante_tel:   'Tel. informante',
    relacao:          'Relação',
    idade:            'Idade',
    bairro:           'Bairro',
    veiculo:          'Veículo',
    habilidade:       'Habilidades',
    disponibilidade:  'Disponibilidade',
    obs:              'Observações'
  }

  for (const [key, val] of Object.entries(data)) {
    if (!val || val === '' || val === '— Não recebe PIX —') continue
    const label = labelMap[key] || key
    const value = Array.isArray(val) ? val.join(', ') : val
    lines.push('• ' + label + ': ' + value)
  }

  lines.push('')
  lines.push('Registrado em ajudejf.com.br')
  return lines.join('\n')
}

// ── SHARE ──
window.shareWhatsApp = function () {
  const text = document.getElementById('summary-text').textContent
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
}

window.copyText = function () {
  const text = document.getElementById('summary-text').textContent
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert('Texto copiado!'))
  } else {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    alert('Texto copiado!')
  }
}

window.newEntry = function () {
  document.querySelectorAll('.form-type').forEach(f => {
    f.reset()
    f.style.display = 'none'
    const err = f.querySelector('.form-error')
    if (err) err.remove()
  })
  state.city = ''
  state.type = ''
  state.data = {}
  goStep(1)
}

// ═══════════════════════════════════════════════════════
// VIEWS — HOME / CADASTRAR / CONSULTAR
// ═══════════════════════════════════════════════════════

window.showView = function (view) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'))
  document.getElementById('view-' + view).classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
  if (view === 'consultar') loadConsulta()
  if (view === 'cadastrar') goStep(1)
}

// ═══════════════════════════════════════════════════════
// CONSULTA — HELPERS
// ═══════════════════════════════════════════════════════

function esc (str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatWpp (tel) {
  if (!tel) return ''
  const d = tel.replace(/\D/g, '')
  return d.length >= 10 ? '55' + d.slice(-11) : d
}

function formatDate (dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function chips (arr) {
  if (!arr || arr.length === 0) return ''
  return `<div class="rc-chips">${arr.map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div>`
}

function prioBadge (p) {
  const map = { Alta: 'badge-red', Média: 'badge-gold', Baixa: 'badge-green' }
  return p ? `<span class="badge ${map[p] || ''}">${esc(p)}</span>` : ''
}

function wppBtn (tel, label = 'WhatsApp') {
  if (!tel) return ''
  return `<a href="https://wa.me/${formatWpp(tel)}" target="_blank" rel="noopener" class="rc-wpp">📱 ${label}</a>`
}

// ═══════════════════════════════════════════════════════
// CONSULTA — CARDS POR TABELA
// ═══════════════════════════════════════════════════════

function cardAbrigo (item, cidade) {
  return `
    <div class="result-card">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome_local)}</div>
        ${prioBadge(item.prioridade)}
      </div>
      <div class="rc-city">📍 ${esc(cidade)} — ${esc(item.endereco)}</div>
      <div class="rc-body">
        <div class="rc-row">🛏️ <strong>${item.vagas ?? '—'}</strong> vagas disponíveis</div>
        ${item.aceita_animais ? `<div class="rc-row">🐾 Animais: ${esc(item.aceita_animais)}</div>` : ''}
        ${item.necessidades ? `<div class="rc-row rc-needs">⚠️ Precisa agora: ${esc(item.necessidades)}</div>` : ''}
        ${chips(item.recursos)}
      </div>
      ${wppBtn(item.telefone)}
    </div>`
}

function cardDoacao (item, cidade) {
  return `
    <div class="result-card">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome_local)}</div>
      </div>
      <div class="rc-city">📍 ${esc(cidade)} — ${esc(item.endereco)}</div>
      <div class="rc-body">
        ${item.horario ? `<div class="rc-row">🕐 ${esc(item.horario)}</div>` : ''}
        ${chips(item.aceita)}
        ${item.pix_chave ? `<div class="rc-row rc-pix">💰 PIX (${esc(item.pix_tipo)}): <strong>${esc(item.pix_chave)}</strong>${item.pix_titular ? ` — ${esc(item.pix_titular)}` : ''}</div>` : ''}
      </div>
      ${wppBtn(item.telefone)}
    </div>`
}

function cardDesaparecido (item, cidade) {
  return `
    <div class="result-card result-card-urgente">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome_pessoa)}</div>
        <span class="badge badge-red">Desaparecido</span>
      </div>
      <div class="rc-city">📍 ${esc(cidade)}</div>
      <div class="rc-body">
        ${item.idade ? `<div class="rc-row">🎂 ${item.idade} anos</div>` : ''}
        <div class="rc-row">📝 ${esc(item.descricao)}</div>
        ${item.ultima_vez_visto ? `<div class="rc-row">🕐 Última vez: ${formatDate(item.ultima_vez_visto)}${item.local_visto ? ` — ${esc(item.local_visto)}` : ''}</div>` : ''}
        ${item.condicao_saude ? `<div class="rc-row rc-needs">🏥 Saúde: ${esc(item.condicao_saude)}</div>` : ''}
      </div>
      <div class="rc-footer-info">Informante: ${esc(item.informante_nome)}</div>
      ${wppBtn(item.informante_tel, 'Contatar informante')}
    </div>`
}

function cardAlimentacao (item, cidade) {
  return `
    <div class="result-card">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome_local)}</div>
        ${item.precisa_voluntarios === 'Sim, urgente' ? '<span class="badge badge-red">Voluntários urgente</span>' : ''}
      </div>
      <div class="rc-city">📍 ${esc(cidade)} — ${esc(item.endereco)}</div>
      <div class="rc-body">
        ${item.horario ? `<div class="rc-row">🕐 ${esc(item.horario)}</div>` : ''}
        ${item.capacidade ? `<div class="rc-row">👥 ${esc(item.capacidade)}</div>` : ''}
        ${chips(item.refeicoes)}
        ${item.necessidades ? `<div class="rc-row rc-needs">⚠️ Precisa: ${esc(item.necessidades)}</div>` : ''}
      </div>
      ${wppBtn(item.telefone)}
    </div>`
}

function cardComunidade (item, cidade) {
  return `
    <div class="result-card">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome_local)}</div>
        ${prioBadge(item.prioridade)}
      </div>
      <div class="rc-city">📍 ${esc(cidade)} — ${esc(item.endereco)}</div>
      <div class="rc-body">
        ${item.familias ? `<div class="rc-row">👨‍👩‍👧 ~${item.familias} famílias afetadas</div>` : ''}
        ${chips(item.necessidades)}
        ${item.obs ? `<div class="rc-row">${esc(item.obs)}</div>` : ''}
      </div>
      ${wppBtn(item.telefone)}
    </div>`
}

function cardVoluntario (item, cidade) {
  return `
    <div class="result-card result-card-voluntario">
      <div class="rc-header">
        <div class="rc-title">${esc(item.nome)}</div>
        ${item.veiculo && item.veiculo !== 'Não' ? `<span class="badge badge-blue">${esc(item.veiculo)}</span>` : ''}
      </div>
      <div class="rc-city">📍 ${esc(cidade)}${item.bairro ? ` — ${esc(item.bairro)}` : ''}</div>
      <div class="rc-body">
        ${chips(item.habilidades)}
        ${item.disponibilidade ? `<div class="rc-row">🕐 ${esc(item.disponibilidade)}</div>` : ''}
      </div>
      ${wppBtn(item.telefone)}
    </div>`
}

const TABELA_CONFIG = {
  abrigos:            { icon: '🏠', label: 'Abrigos',           card: cardAbrigo },
  pontos_doacao:      { icon: '📦', label: 'Pontos de Doação',  card: cardDoacao },
  desaparecidos:      { icon: '🔍', label: 'Desaparecidos',     card: cardDesaparecido },
  pontos_alimentacao: { icon: '🍽️', label: 'Alimentação',       card: cardAlimentacao },
  comunidades:        { icon: '🏘️', label: 'Comunidades',       card: cardComunidade },
  voluntarios:        { icon: '🙋', label: 'Voluntários',       card: cardVoluntario },
}

// ═══════════════════════════════════════════════════════
// CONSULTA — LOAD & RENDER
// ═══════════════════════════════════════════════════════

window.loadConsulta = async function () {
  const cityFilter = document.getElementById('filter-city').value
  const typeFilter = document.getElementById('filter-type').value
  const elLoading  = document.getElementById('consulta-loading')
  const elEmpty    = document.getElementById('consulta-empty')
  const elError    = document.getElementById('consulta-error')
  const elResults  = document.getElementById('consulta-results')

  elLoading.style.display = 'flex'
  elEmpty.style.display   = 'none'
  elError.style.display   = 'none'
  elResults.innerHTML     = ''

  try {
    const { data: cidades } = await supabase.from('cidades').select('id, nome')
    const cidadeMap = {}
    ;(cidades || []).forEach(c => { cidadeMap[c.id] = c.nome })

    const tables = typeFilter ? [typeFilter] : Object.keys(TABELA_CONFIG)
    let totalItems = 0
    let html = ''

    for (const table of tables) {
      let query = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(100)

      if (cityFilter) {
        const cidadeId = (cidades || []).find(c => c.nome === cityFilter)?.id
        if (cidadeId) query = query.eq('cidade_id', cidadeId)
      }

      const { data, error: err } = await query
      if (err) throw err

      const items = data || []
      if (items.length === 0) continue

      totalItems += items.length
      const config = TABELA_CONFIG[table]
      html += `
        <div class="consulta-section">
          <div class="consulta-section-header">
            <span>${config.icon} ${config.label}</span>
            <span class="consulta-section-count">${items.length}</span>
          </div>
          <div class="result-cards-grid">
            ${items.map(item => config.card(item, cidadeMap[item.cidade_id] || '—')).join('')}
          </div>
        </div>`
    }

    elLoading.style.display = 'none'

    if (totalItems === 0) {
      elEmpty.style.display = 'flex'
      return
    }

    elResults.innerHTML = html

  } catch (err) {
    elLoading.style.display = 'none'
    document.getElementById('consulta-error-msg').textContent = 'Erro ao carregar dados: ' + err.message
    elError.style.display = 'flex'
  }
}
