/* =========================================================
   MÓDULO R&S — RECRUTAMENTO E SELEÇÃO (Fase 1: fundação)
   -----------------------------------------------------------
   Ordem recomendada pela especificação: requisição de vaga →
   aprovação → publicação → candidatos → pipeline → proposta →
   conversão em colaborador. Esta fase cobre requisição+aprovação
   e o pipeline básico de candidatos, com cadastro MANUAL (sem
   página pública de candidatura ainda — decisão tomada para
   simplificar o início). A vaga herda dados do cargo escolhido,
   sem alterar o desenho original do cargo (RN da especificação).
   ========================================================= */

const ETAPAS_RS = [
  { id: 'nova', nome: 'Nova candidatura' },
  { id: 'triagem', nome: 'Triagem' },
  { id: 'contato_inicial', nome: 'Contato inicial' },
  { id: 'avaliacao', nome: 'Avaliação' },
  { id: 'entrevista', nome: 'Entrevista' },
  { id: 'finalista', nome: 'Finalista' },
  { id: 'proposta', nome: 'Proposta' },
  { id: 'aprovado', nome: 'Aprovado' },
];
const MOTIVOS_VAGA_RS = ['Substituição', 'Aumento de quadro', 'Temporária', 'Estágio', 'Banco de talentos', 'Outro'];

function garantirRS() {
  if (!state.rs) state.rs = { requisicoes: [], candidatos: [] };
  if (!state.rs.requisicoes) state.rs.requisicoes = [];
  if (!state.rs.candidatos) state.rs.candidatos = [];
}

function _rsEtapaNome(id) {
  return ETAPAS_RS.find((e) => e.id === id)?.nome || id;
}
function _rsStatusRequisicaoPill(r) {
  if (r.status === 'reprovada') return { label: 'Reprovada', classe: 'pill-iniciar' };
  if (r.status === 'pendente') return { label: 'Aguardando aprovação', classe: 'pill-desenvolver' };
  if (r.encerrada) return { label: 'Encerrada', classe: 'pill-neutral' };
  if (r.publicada) return { label: 'Vaga aberta', classe: 'pill-alavancar' };
  return { label: 'Aprovada — não publicada', classe: 'pill-desenvolver' };
}

/* ---------- Requisição de vaga ---------- */
let _rsNovaRequisicaoAberta = false;
let _rsRequisicaoExpandida = null; // id da requisição com o pipeline de candidatos aberto

function abrirNovaRequisicaoRS() {
  _rsNovaRequisicaoAberta = true;
  render();
}

function criarRequisicaoRS() {
  const cargoId = document.getElementById('rs_req_cargo').value;
  const unidadeId = document.getElementById('rs_req_unidade').value || null;
  const setorId = document.getElementById('rs_req_setor').value || null;
  const quantidade = parseInt(document.getElementById('rs_req_qtd').value, 10) || 1;
  const motivo = document.getElementById('rs_req_motivo').value;
  const prazo = document.getElementById('rs_req_prazo').value || null;
  const confidencial = document.getElementById('rs_req_confidencial').checked;
  if (!cargoId) {
    showToast('Selecione o cargo da vaga.');
    return;
  }
  const cargo = state.cargos.find((c) => c.id === cargoId);
  // A vaga herda missão/requisitos do desenho de cargo — sem alterar o cargo original.
  const d = cargo?.desenho || {};
  state.rs.requisicoes.push({
    id: uid(),
    codigo: `REQ-${String(state.rs.requisicoes.length + 1).padStart(3, '0')}`,
    cargoId,
    unidadeId,
    setorId,
    quantidade,
    motivo,
    prazo,
    confidencial,
    missaoHerdada: d.missao || '',
    responsabilidadesHerdadas: d.responsabilidades || [],
    gestorSolicitanteId: meuPerfilId,
    status: 'pendente', // pendente | aprovada | reprovada
    publicada: false,
    encerrada: false,
    candidatosCount: 0,
    ...novoCarimbo(),
  });
  _rsNovaRequisicaoAberta = false;
  showToast('Requisição criada e enviada para aprovação.');
  render();
}

function decidirRequisicaoRS(id, aprovar) {
  const r = state.rs.requisicoes.find((x) => x.id === id);
  if (!r) return;
  if (!aprovar) {
    const motivo = prompt('Motivo da reprovação/devolução:') || '';
    r.motivoDecisao = motivo;
    r.status = 'reprovada';
  } else {
    r.status = 'aprovada';
  }
  r.decididoPor = meuPerfilId;
  r.decididoEm = new Date().toISOString();
  showToast(aprovar ? 'Requisição aprovada.' : 'Requisição reprovada.');
  render();
}

let _rsConfigurarPublicaAberta = null; // id da requisição com o formulário de página pública aberto

function abrirConfigurarPaginaPublicaRS(id) {
  _rsConfigurarPublicaAberta = id;
  render();
}

async function publicarVagaRS(id) {
  const r = state.rs.requisicoes.find((x) => x.id === id);
  if (!r || r.status !== 'aprovada') return;
  const cargo = state.cargos.find((c) => c.id === r.cargoId);
  const titulo = document.getElementById('rs_pub_titulo').value.trim() || cargo?.nome || 'Vaga';
  const descricao = document.getElementById('rs_pub_descricao').value.trim();
  const requisitos = document.getElementById('rs_pub_requisitos').value.trim();
  const local = document.getElementById('rs_pub_local').value.trim();
  const modalidade = document.getElementById('rs_pub_modalidade').value;
  const mostrarSalario = document.getElementById('rs_pub_mostrar_salario').checked;
  const faixaSalarial = document.getElementById('rs_pub_faixa').value.trim();
  const mostrarEmpresa = document.getElementById('rs_pub_mostrar_empresa').checked;

  const { data, error } = await sb.functions.invoke('rs', {
    body: {
      action: 'sync_vaga_publica',
      requisicaoId: r.id,
      titulo,
      descricao,
      requisitos,
      local,
      modalidade,
      mostrarSalario,
      faixaSalarial,
      mostrarEmpresa,
      nomeEmpresaExibicao: state.empresa?.nomeFantasia || '',
    },
  });
  if (error || data?.error) {
    showToast((data && data.error) || 'Não foi possível publicar a página pública.');
    return;
  }
  r.publicada = true;
  r.publicadaEm = new Date().toISOString();
  r.vagaPublicaId = data.vagaPublicaId;
  _rsConfigurarPublicaAberta = null;
  showToast('Vaga publicada! Copie o link abaixo pra divulgar.');
  render();
}

function linkPublicoRS(r) {
  if (!r.vagaPublicaId) return '';
  return `${location.origin}${location.pathname.replace('index.html', '')}vaga.html?v=${r.vagaPublicaId}`;
}

function copiarLinkPublicoRS(id) {
  const r = state.rs.requisicoes.find((x) => x.id === id);
  if (!r) return;
  const link = linkPublicoRS(r);
  navigator.clipboard?.writeText(link);
  showToast('Link copiado! Cole onde quiser divulgar a vaga.');
}

async function encerrarVagaRS(id) {
  const r = state.rs.requisicoes.find((x) => x.id === id);
  if (!r) return;
  const motivo = prompt('Motivo do encerramento (ex: vaga preenchida, cancelada, congelada):') || '';
  r.encerrada = true;
  r.motivoEncerramento = motivo;
  r.encerradaEm = new Date().toISOString();
  if (r.vagaPublicaId) {
    await sb.functions.invoke('rs', { body: { action: 'desativar_vaga_publica', requisicaoId: r.id } }).catch(() => {});
  }
  render();
}

/* ---------- Candidatos e pipeline ---------- */
let _rsNovoCandidatoAberto = null; // id da vaga com o formulário de novo candidato aberto

function abrirNovoCandidatoRS(vagaId) {
  _rsNovoCandidatoAberto = vagaId;
  render();
}

function criarCandidatoRS(vagaId) {
  const nome = document.getElementById('rs_cand_nome').value.trim();
  const email = document.getElementById('rs_cand_email').value.trim();
  const telefone = document.getElementById('rs_cand_telefone').value.trim();
  const origem = document.getElementById('rs_cand_origem').value.trim();
  const curriculo = document.getElementById('rs_cand_curriculo').value.trim();
  if (!nome) {
    showToast('Informe o nome do candidato.');
    return;
  }
  // Duplicidade por e-mail/telefone na mesma vaga — não apaga histórico, só avisa.
  const jaExiste = state.rs.candidatos.find(
    (c) => c.vagaId === vagaId && ((email && c.email === email) || (telefone && c.telefone === telefone))
  );
  if (
    jaExiste &&
    !confirm(`Já existe um candidato com esse contato nesta vaga (${jaExiste.nome}). Cadastrar mesmo assim?`)
  ) {
    return;
  }
  state.rs.candidatos.push({
    id: uid(),
    vagaId,
    nome,
    email,
    telefone,
    origem: origem || 'Cadastro manual',
    curriculo,
    etapa: 'nova',
    reprovado: false,
    historico: [
      {
        de: null,
        para: 'nova',
        autorId: meuPerfilId,
        em: new Date().toISOString(),
        observacao: 'Candidatura cadastrada',
      },
    ],
    ...novoCarimbo(),
  });
  _rsNovoCandidatoAberto = null;
  showToast('Candidato cadastrado.');
  render();
}

function moverEtapaCandidatoRS(candidatoId, novaEtapa) {
  const cand = state.rs.candidatos.find((c) => c.id === candidatoId);
  if (!cand) return;
  const anterior = cand.etapa;
  if (anterior === novaEtapa) return;
  cand.etapa = novaEtapa;
  cand.historico.push({
    de: anterior,
    para: novaEtapa,
    autorId: meuPerfilId,
    em: new Date().toISOString(),
    observacao: '',
  });
  render();
}

function reprovarCandidatoRS(candidatoId) {
  const cand = state.rs.candidatos.find((c) => c.id === candidatoId);
  if (!cand) return;
  const motivo = prompt(
    'Motivo da reprovação/desistência (fica no histórico, não é enviado ao candidato automaticamente):'
  );
  if (motivo === null) return;
  cand.reprovado = true;
  cand.historico.push({
    de: cand.etapa,
    para: 'reprovado',
    autorId: meuPerfilId,
    em: new Date().toISOString(),
    observacao: motivo,
  });
  render();
}

function reabrirCandidatoRS(candidatoId) {
  const cand = state.rs.candidatos.find((c) => c.id === candidatoId);
  if (!cand) return;
  cand.reprovado = false;
  render();
}

// Converte um candidato Aprovado em colaborador — reaproveita só os dados
// necessários (nome e contato), preservando o histórico do processo seletivo.
function pageRS() {
  garantirRS();
  const souGestor = ['owner', 'rh'].includes(meuPapelReal);
  const cargosPublicados = state.cargos.filter((c) => c.desenho?.aprovado && !c.descontinuado);

  return `
    <div class="page-head">
      <div class="eyebrow">Pessoas</div>
      <h1>R&S — Recrutamento e Seleção</h1>
      <p class="page-desc">Do pedido de vaga até a contratação. A vaga herda os dados do cargo, sem alterar o desenho original.</p>
      <div class="notice info" style="margin-top:10px;">🚧 Fase 1: requisição com aprovação e pipeline de candidatos, com cadastro manual — ainda não há página pública de candidatura.</div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h3 style="margin:0;">Requisições de vaga</h3>
        <button class="btn btn-primary btn-sm" onclick="abrirNovaRequisicaoRS()">Nova requisição</button>
      </div>
      ${
        _rsNovaRequisicaoAberta
          ? `
        <div class="card" style="background:var(--surface-2);margin-top:12px;">
          <h3 style="font-size:14px;">Nova requisição de vaga</h3>
          <div class="grid3">
            <div class="field"><label>Cargo</label>
              <select id="rs_req_cargo">
                <option value="">Selecione…</option>
                ${cargosPublicados.map((c) => `<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Unidade</label>
              <select id="rs_req_unidade"><option value="">—</option>${state.estrutura
                .filter((n) => n.tipo === 'unidade')
                .map((n) => `<option value="${n.id}">${escaparHtml(n.nome)}</option>`)
                .join('')}</select>
            </div>
            <div class="field"><label>Setor</label>
              <select id="rs_req_setor"><option value="">—</option>${state.estrutura
                .filter((n) => ['setor', 'equipe', 'departamento'].includes(n.tipo))
                .map((n) => `<option value="${n.id}">${escaparHtml(n.nome)}</option>`)
                .join('')}</select>
            </div>
          </div>
          <div class="grid3">
            <div class="field"><label>Quantidade</label><input id="rs_req_qtd" type="number" min="1" value="1"></div>
            <div class="field"><label>Motivo</label>
              <select id="rs_req_motivo">${MOTIVOS_VAGA_RS.map((m) => `<option value="${m}">${m}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Prazo desejado</label><input id="rs_req_prazo" type="date"></div>
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin:8px 0;"><input id="rs_req_confidencial" type="checkbox"> Vaga confidencial (não exibir nome do cargo/empresa externamente)</label>
          <button class="btn btn-primary" onclick="criarRequisicaoRS()">Enviar para aprovação</button>
          <button class="btn btn-ghost" onclick="_rsNovaRequisicaoAberta=false;render();">Cancelar</button>
        </div>`
          : ''
      }

      ${
        state.rs.requisicoes.length
          ? `<table style="margin-top:14px;"><thead><tr><th>Código</th><th>Cargo</th><th>Qtd.</th><th>Status</th><th></th></tr></thead><tbody>
            ${state.rs.requisicoes
              .slice()
              .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
              .map((r) => {
                const cargo = state.cargos.find((c) => c.id === r.cargoId);
                const pill = _rsStatusRequisicaoPill(r);
                const candidatosDaVaga = state.rs.candidatos.filter((c) => c.vagaId === r.id);
                return `<tr>
                <td><b>${escaparHtml(r.codigo)}</b></td>
                <td class="small-muted">${escaparHtml(cargo?.nome || '—')}</td>
                <td class="small-muted">${r.quantidade}</td>
                <td><span class="pill ${pill.classe}">${pill.label}</span></td>
                <td style="text-align:right;white-space:nowrap;">
                  ${
                    r.status === 'pendente' && souGestor
                      ? `<button class="btn btn-sm btn-primary" onclick="decidirRequisicaoRS('${r.id}',true)">Aprovar</button><button class="btn btn-sm btn-ghost" onclick="decidirRequisicaoRS('${r.id}',false)">Reprovar</button>`
                      : ''
                  }
                  ${r.status === 'aprovada' && !r.publicada ? `<button class="btn btn-sm btn-primary" onclick="abrirConfigurarPaginaPublicaRS('${r.id}')">Publicar</button>` : ''}
                  ${r.publicada && !r.encerrada ? `<button class="btn btn-sm btn-ghost" onclick="encerrarVagaRS('${r.id}')">Encerrar</button>` : ''}
                  ${
                    r.publicada
                      ? `<button class="btn btn-sm btn-ghost" onclick="_rsRequisicaoExpandida = _rsRequisicaoExpandida==='${r.id}'?null:'${r.id}'; render();">${_rsRequisicaoExpandida === r.id ? 'Ocultar candidatos' : `Candidatos (${candidatosDaVaga.length})`}</button>`
                      : ''
                  }
                </td>
              </tr>
              ${
                r.publicada && !r.encerrada && r.vagaPublicaId
                  ? `<tr><td colspan="5" class="small-muted" style="padding-top:0;">🔗 Link público: <code style="font-size:11px;">${linkPublicoRS(r)}</code> <button class="btn btn-ghost btn-sm" onclick="copiarLinkPublicoRS('${r.id}')">Copiar</button></td></tr>`
                  : ''
              }
              ${
                _rsConfigurarPublicaAberta === r.id
                  ? `<tr><td colspan="5">
                <div class="card" style="background:var(--surface-2);margin-top:0;">
                  <h3 style="font-size:14px;">Configurar página pública — ${escaparHtml(r.codigo)}</h3>
                  <div class="field"><label>Título da vaga (como candidatos verão)</label><input id="rs_pub_titulo" type="text" value="${escaparHtml(cargo?.nome || '')}"></div>
                  <div class="field"><label>Descrição</label><textarea id="rs_pub_descricao">${escaparHtml(r.missaoHerdada || '')}</textarea></div>
                  <div class="field"><label>Requisitos</label><textarea id="rs_pub_requisitos">${(r.responsabilidadesHerdadas || []).map((x) => (typeof x === 'string' ? x : x.nome || '')).join('\n')}</textarea></div>
                  <div class="grid2">
                    <div class="field"><label>Local</label><input id="rs_pub_local" type="text"></div>
                    <div class="field"><label>Modalidade</label>
                      <select id="rs_pub_modalidade"><option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto</option></select>
                    </div>
                  </div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin:6px 0;"><input id="rs_pub_mostrar_salario" type="checkbox"> Mostrar faixa salarial na página pública</label>
                  <div class="field"><label>Faixa salarial <small>(só aparece se marcado acima)</small></label><input id="rs_pub_faixa" type="text" placeholder="Ex: R$ 2.500 a R$ 3.200"></div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin:6px 0;"><input id="rs_pub_mostrar_empresa" type="checkbox" checked> Mostrar o nome da empresa (desmarque para vaga confidencial)</label>
                  <button class="btn btn-primary btn-sm" onclick="publicarVagaRS('${r.id}')">Publicar vaga</button>
                  <button class="btn btn-ghost btn-sm" onclick="_rsConfigurarPublicaAberta=null;render();">Cancelar</button>
                </div>
              </td></tr>`
                  : ''
              }
              ${_rsRequisicaoExpandida === r.id ? `<tr><td colspan="5">${renderPipelineCandidatosRS(r)}</td></tr>` : ''}`;
              })
              .join('')}
          </tbody></table>`
          : '<div class="empty" style="margin-top:10px;">Nenhuma requisição criada ainda.</div>'
      }
    </div>
  `;
}

let _rsCandidaturasPendentes = {}; // vagaId -> array | undefined (ainda não carregou)
let _rsCandidaturasCarregando = {};

async function carregarCandidaturasPendentesRS(vaga) {
  _rsCandidaturasCarregando[vaga.id] = true;
  const { data, error } = await sb.functions.invoke('rs', {
    body: { action: 'listar_candidaturas_pendentes', requisicaoId: vaga.id },
  });
  _rsCandidaturasCarregando[vaga.id] = false;
  if (!error && data && !data.error) _rsCandidaturasPendentes[vaga.id] = data.candidaturas || [];
  render();
}

async function importarCandidaturaRS(candidaturaId, vagaId) {
  const { data, error } = await sb.functions.invoke('rs', { body: { action: 'importar_candidatura', candidaturaId } });
  if (error || data?.error) {
    showToast((data && data.error) || 'Não foi possível importar.');
    return;
  }
  const c = data.candidato;
  state.rs.candidatos.push({
    id: uid(),
    vagaId,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    origem: 'Página pública',
    curriculo: '',
    etapa: 'nova',
    reprovado: false,
    historico: [
      {
        de: null,
        para: 'nova',
        autorId: meuPerfilId,
        em: new Date().toISOString(),
        observacao: 'Candidatura recebida pela página pública',
      },
    ],
    ...novoCarimbo(),
  });
  await carregarCandidaturasPendentesRS(state.rs.requisicoes.find((r) => r.id === vagaId));
  showToast(`"${c.nome}" importado(a) para o pipeline.`);
}

function renderPipelineCandidatosRS(vaga) {
  const candidatos = state.rs.candidatos
    .filter((c) => c.vagaId === vaga.id)
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));

  if (_rsCandidaturasPendentes[vaga.id] === undefined && !_rsCandidaturasCarregando[vaga.id]) {
    carregarCandidaturasPendentesRS(vaga);
  }
  const pendentes = _rsCandidaturasPendentes[vaga.id] || [];

  return `
    <div class="card" style="background:var(--surface-2);margin-top:8px;">
      ${
        pendentes.length
          ? `<div class="notice info" style="margin-bottom:12px;">📥 <b>${pendentes.length} candidatura(s) nova(s)</b> recebida(s) pela página pública, aguardando importar pro pipeline:
        ${pendentes
          .map(
            (
              p
            ) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line);">
          <span>${escaparHtml(p.nome)} <span class="small-muted">(${escaparHtml(p.email)})</span>${p.curriculoUrl ? ` · <a href="${p.curriculoUrl}" target="_blank" rel="noopener">ver currículo</a>` : ''}</span>
          <button class="btn btn-sm btn-primary" onclick="importarCandidaturaRS('${p.id}','${vaga.id}')">Importar</button>
        </div>`
          )
          .join('')}
      </div>`
          : ''
      }
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h3 style="margin:0;font-size:14px;">Candidatos — ${escaparHtml(vaga.codigo)}</h3>
        <button class="btn btn-sm btn-primary" onclick="abrirNovoCandidatoRS('${vaga.id}')">+ Candidato</button>
      </div>
      ${
        _rsNovoCandidatoAberto === vaga.id
          ? `
        <div class="card" style="margin-top:10px;">
          <div class="grid2">
            <div class="field"><label>Nome</label><input id="rs_cand_nome" type="text"></div>
            <div class="field"><label>E-mail</label><input id="rs_cand_email" type="email"></div>
          </div>
          <div class="grid2">
            <div class="field"><label>Telefone</label><input id="rs_cand_telefone" type="tel"></div>
            <div class="field"><label>Origem</label><input id="rs_cand_origem" type="text" placeholder="Indicação, LinkedIn, etc."></div>
          </div>
          <div class="field"><label>Currículo / resumo <small>(cole o texto ou um link)</small></label><textarea id="rs_cand_curriculo"></textarea></div>
          <button class="btn btn-primary btn-sm" onclick="criarCandidatoRS('${vaga.id}')">Cadastrar</button>
          <button class="btn btn-ghost btn-sm" onclick="_rsNovoCandidatoAberto=null;render();">Cancelar</button>
        </div>`
          : ''
      }
      ${
        candidatos.length
          ? `<table style="margin-top:10px;"><thead><tr><th>Candidato</th><th>Contato</th><th>Origem</th><th>Etapa</th><th></th></tr></thead><tbody>
            ${candidatos
              .map(
                (c) => `<tr style="${c.reprovado ? 'opacity:0.6;' : ''}">
              <td><b>${escaparHtml(c.nome)}</b></td>
              <td class="small-muted">${escaparHtml(c.email || c.telefone || '—')}</td>
              <td class="small-muted">${escaparHtml(c.origem)}</td>
              <td>${
                c.reprovado
                  ? '<span class="pill pill-iniciar">Reprovado/desistiu</span>'
                  : c.etapa === 'aprovado'
                    ? '<span class="pill pill-alavancar">Aprovado</span>'
                    : `<select onchange="moverEtapaCandidatoRS('${c.id}', this.value)" style="max-width:170px;">${ETAPAS_RS.map((e) => `<option value="${e.id}" ${e.id === c.etapa ? 'selected' : ''}>${e.nome}</option>`).join('')}</select>`
              }</td>
              <td style="white-space:nowrap;">
                ${
                  c.reprovado
                    ? `<button class="btn btn-sm btn-ghost" onclick="reabrirCandidatoRS('${c.id}')">Reabrir</button>`
                    : c.etapa === 'aprovado'
                      ? `<button class="btn btn-sm btn-primary" onclick="converterCandidatoEmColaboradorRS('${c.id}')" ${c.convertidoEm ? 'disabled' : ''}>${c.convertidoEm ? 'Convertido ✓' : 'Converter em colaborador'}</button>`
                      : `<button class="btn btn-sm btn-ghost" onclick="reprovarCandidatoRS('${c.id}')">Reprovar</button>`
                }
              </td>
            </tr>`
              )
              .join('')}
          </tbody></table>`
          : '<div class="empty" style="margin-top:10px;">Nenhum candidato cadastrado ainda.</div>'
      }
    </div>`;
}
