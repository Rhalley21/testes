/* =========================================================
   CENTRAL DE AJUDA / SUPORTE ESTRUTURADO
   -----------------------------------------------------------
   Qualquer usuário logado pode abrir um chamado pra própria
   empresa. Todo mundo da empresa vê os chamados dela (status:
   aberto → em andamento → resolvido). O Super Admin vê e
   responde chamados de qualquer empresa, num painel só.
   ========================================================= */

let _chamadosEmpresa = [];
let _chamadosCarregados = false;
let _novoChamadoAberto = false;

async function carregarChamadosEmpresa() {
  const { data, error } = await sb
    .from('chamados_suporte')
    .select('id, assunto, mensagem, status, resposta, criado_em, atualizado_em')
    .eq('empresa_id', empresaIdAtual)
    .order('criado_em', { ascending: false });
  if (!error) _chamadosEmpresa = data || [];
  _chamadosCarregados = true;
  render();
}

function abrirNovoChamado() {
  _novoChamadoAberto = true;
  render();
}

// Atalho pros direitos da LGPD (acesso, correção, exclusão, portabilidade)
// — já abre o chamado com assunto e mensagem prontos, só editar os detalhes.
function abrirSolicitacaoLGPD() {
  _novoChamadoAberto = true;
  render();
  setTimeout(() => {
    const campoAssunto = document.getElementById('cha_assunto');
    const campoMensagem = document.getElementById('cha_mensagem');
    if (campoAssunto) campoAssunto.value = 'Solicitação de direitos da LGPD';
    if (campoMensagem)
      campoMensagem.value =
        'Solicito, nos termos da LGPD (art. 18), o seguinte sobre meus dados pessoais no sistema:\n\n[ ] Acesso aos meus dados\n[ ] Correção de dados incorretos\n[ ] Exclusão dos meus dados\n[ ] Portabilidade dos meus dados\n\nDetalhe aqui o que precisa:\n';
  }, 50);
}

async function enviarChamadoSuporte() {
  const assunto = document.getElementById('cha_assunto').value.trim();
  const mensagem = document.getElementById('cha_mensagem').value.trim();
  if (!assunto || !mensagem) {
    showToast('Preencha o assunto e a mensagem.');
    return;
  }
  const meuPerfil = (_perfisEmpresa || []).find((p) => p.id === meuPerfilId);
  const { error } = await sb.from('chamados_suporte').insert({
    empresa_id: empresaIdAtual,
    criado_por: meuPerfilId,
    nome_solicitante: meuPerfil?.nome || 'Usuário',
    email: meuPerfil?.email || '',
    assunto,
    mensagem,
  });
  if (error) {
    console.error('Falha ao abrir chamado', error);
    showToast('Não foi possível abrir o chamado. Verifique se a migration 34 foi aplicada.');
    return;
  }
  sb.functions
    .invoke('enviar-email', {
      body: {
        destinatario: 'inetris25@gmail.com',
        assunto: `Novo chamado de suporte — ${state.empresa?.nomeFantasia || 'Empresa'}: ${assunto}`,
        corpoHtml: `<p><b>${escaparHtml(meuPerfil?.nome || 'Usuário')}</b> (${escaparHtml(meuPerfil?.email || '')}) abriu um chamado:</p><p><b>${escaparHtml(assunto)}</b></p><p>${escaparHtml(mensagem)}</p>`,
      },
    })
    .catch(() => {});
  _novoChamadoAberto = false;
  showToast('Chamado aberto! Nossa equipe vai responder em breve.');
  await carregarChamadosEmpresa();
}

function _corStatusChamado(status) {
  if (status === 'resolvido') return 'pill-alavancar';
  if (status === 'em_andamento') return 'pill-desenvolver';
  return 'pill-neutral';
}
function _labelStatusChamado(status) {
  if (status === 'resolvido') return 'Resolvido';
  if (status === 'em_andamento') return 'Em andamento';
  return 'Aberto';
}

function pageCentralAjuda() {
  if (!_chamadosCarregados) carregarChamadosEmpresa();

  return `
    <div class="page-head">
      <div class="eyebrow">Suporte</div>
      <h1>Central de Ajuda</h1>
      <p class="page-desc">Dúvidas frequentes e abertura de chamados diretamente com o Instituto INETRIS.</p>
      <p class="small-muted">Documentos: <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> · <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a></p>
    </div>

    <div class="card">
      <h3>Perguntas frequentes</h3>
      <details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;padding:8px 0;">Esqueci minha senha, como recuperar?</summary><p class="small-muted" style="padding:4px 0 8px;">Na tela de login, clique em "Esqueci minha senha" e siga as instruções enviadas por e-mail.</p></details>
      <details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;padding:8px 0;">Como funciona o banco de horas?</summary><p class="small-muted" style="padding:4px 0 8px;">O saldo é calculado automaticamente a partir dos registros de ponto, descontando dias abonados. Veja o card na tela de Ponto.</p></details>
      <details style="margin-bottom:8px;"><summary style="cursor:pointer;font-weight:600;padding:8px 0;">Como convido um colaborador sem e-mail?</summary><p class="small-muted" style="padding:4px 0 8px;">Em Usuários & Acesso, use a opção de gerar acesso por matrícula — ela cria um login e senha provisória, sem precisar de e-mail.</p></details>
      <details><summary style="cursor:pointer;font-weight:600;padding:8px 0;">Não encontrei minha dúvida aqui, e agora?</summary><p class="small-muted" style="padding:4px 0 8px;">Abra um chamado abaixo — nossa equipe responde diretamente por aqui.</p></details>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h3 style="margin:0;">Meus chamados</h3>
        <button class="btn btn-ghost btn-sm" onclick="abrirSolicitacaoLGPD()">Solicitar meus dados (LGPD)</button>
        <button class="btn btn-primary btn-sm" onclick="abrirNovoChamado()">Abrir novo chamado</button>
      </div>
      ${
        _novoChamadoAberto
          ? `
        <div class="card" style="background:var(--surface-2);margin-top:12px;">
          <div class="field"><label>Assunto</label><input id="cha_assunto" type="text" placeholder="Resuma o problema em poucas palavras"></div>
          <div class="field"><label>Mensagem</label><textarea id="cha_mensagem" rows="4" placeholder="Descreva o que está acontecendo, com o máximo de detalhe possível"></textarea></div>
          <button class="btn btn-primary btn-sm" onclick="enviarChamadoSuporte()">Enviar chamado</button>
          <button class="btn btn-ghost btn-sm" onclick="_novoChamadoAberto=false;render();">Cancelar</button>
        </div>`
          : ''
      }
      ${
        _chamadosEmpresa.length
          ? `<table style="margin-top:14px;"><thead><tr><th>Assunto</th><th>Status</th><th>Aberto em</th></tr></thead><tbody>
            ${_chamadosEmpresa
              .map(
                (c) => `<tr>
              <td><b>${escaparHtml(c.assunto)}</b><div class="small-muted" style="margin-top:2px;">${escaparHtml(c.mensagem)}</div>${c.resposta ? `<div style="margin-top:6px;padding:8px 10px;background:var(--surface-2);border-radius:8px;font-size:13px;"><b>Resposta do suporte:</b> ${escaparHtml(c.resposta)}</div>` : ''}</td>
              <td><span class="pill ${_corStatusChamado(c.status)}">${_labelStatusChamado(c.status)}</span></td>
              <td class="small-muted">${new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
            </tr>`
              )
              .join('')}
          </tbody></table>`
          : '<div class="empty" style="margin-top:10px;">Nenhum chamado aberto ainda.</div>'
      }
    </div>
  `;
}
