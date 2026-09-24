// =========================================================================
// NORTE — Edge Function "rs"
// =========================================================================
// Duas categorias de ação:
//  - PÚBLICAS (sem login): 'vaga_publica' e 'candidatura_criar' — quem
//    chama é um visitante qualquer, na página pública de candidatura.
//  - AUTENTICADAS (RH/owner): publicar/desativar a vaga pública, listar e
//    importar candidaturas pro pipeline, listar banco de talentos, baixar
//    currículo.
//
// As tabelas rs_vagas_publicas / rs_candidaturas_publicas /
// rs_banco_talentos não têm nenhuma política de acesso direto — só esta
// função (com a chave de serviço) toca nelas. Isso é o que permite receber
// candidatura de gente sem login SEM abrir o resto do banco pra internet.
//
// Implantação: veja as instruções no final deste arquivo.
// =========================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function validarRecaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secret || !token) return false;
  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await resp.json();
    return !!data.success;
  } catch {
    return false;
  }
}

const ACOES_PUBLICAS = ['vaga_publica', 'candidatura_criar'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ---------------------------------------------------------------------
    // AÇÕES PÚBLICAS — sem exigir sessão logada.
    // ---------------------------------------------------------------------
    if (action === 'vaga_publica') {
      const { data, error } = await admin
        .from('rs_vagas_publicas')
        .select('id, titulo, descricao, requisitos, local, modalidade, mostrar_salario, faixa_salarial, mostrar_empresa, nome_empresa_exibicao, ativa')
        .eq('id', body.vagaPublicaId)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data || !data.ativa) return jsonResponse({ error: 'Vaga não encontrada ou encerrada.' }, 404);
      return jsonResponse({ vaga: data });
    }

    if (action === 'candidatura_criar') {
      const recaptchaOk = await validarRecaptcha(body.recaptchaToken);
      if (!recaptchaOk) {
        return jsonResponse({ error: 'Não foi possível confirmar que você não é um robô. Tente novamente.' }, 400);
      }
      if (!body.nome || !body.email) {
        return jsonResponse({ error: 'Nome e e-mail são obrigatórios.' }, 400);
      }
      if (!body.aceitePrivacidade) {
        return jsonResponse({ error: 'É necessário aceitar o aviso de privacidade.' }, 400);
      }
      const { data: vaga } = await admin.from('rs_vagas_publicas').select('id, empresa_id, ativa').eq('id', body.vagaPublicaId).maybeSingle();
      if (!vaga || !vaga.ativa) return jsonResponse({ error: 'Esta vaga não está mais recebendo candidaturas.' }, 409);

      // Currículo: obrigatório, PDF, limite de tamanho (5MB em base64 ~ 6.7MB de texto).
      let curriculoPath: string | null = null;
      if (body.curriculoBase64) {
        try {
          const base64 = String(body.curriculoBase64).split(',').pop() || '';
          if (base64.length > 7_000_000) {
            return jsonResponse({ error: 'Currículo muito grande (máximo 5MB).' }, 400);
          }
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const nome = `${vaga.empresa_id}/${vaga.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
          const up = await admin.storage.from('curriculos-rs').upload(nome, bytes, { contentType: 'application/pdf', upsert: false });
          if (!up.error) curriculoPath = nome;
        } catch (e) {
          console.error('Falha ao subir currículo', e);
        }
      }

      const { data: candidatura, error: erroCand } = await admin
        .from('rs_candidaturas_publicas')
        .insert({
          vaga_publica_id: body.vagaPublicaId,
          empresa_id: vaga.empresa_id,
          nome: body.nome,
          email: body.email,
          telefone: body.telefone || null,
          curriculo_path: curriculoPath,
          aceite_privacidade: true,
          aceite_banco_talentos: !!body.aceiteBancoTalentos,
        })
        .select('id')
        .single();
      if (erroCand) return jsonResponse({ error: erroCand.message }, 500);

      if (body.aceiteBancoTalentos) {
        await admin.from('rs_banco_talentos').insert({
          empresa_id: vaga.empresa_id,
          candidatura_id: candidatura.id,
          nome: body.nome,
          email: body.email,
          telefone: body.telefone || null,
          curriculo_path: curriculoPath,
        });
      }

      return jsonResponse({ protocolo: candidatura.id });
    }

    // ---------------------------------------------------------------------
    // A partir daqui, todas as ações exigem sessão logada (RH/owner).
    // ---------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') || '';
    const principal = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: erroAuth,
    } = await principal.auth.getUser();
    if (erroAuth || !user) return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
    const { data: perfil, error: erroPerfil } = await principal.from('perfis').select('id, empresa_id, papel').eq('id', user.id).single();
    if (erroPerfil || !perfil) return jsonResponse({ error: 'Perfil não encontrado.' }, 403);
    if (!['owner', 'rh'].includes(perfil.papel)) return jsonResponse({ error: 'Sem permissão.' }, 403);

    if (action === 'sync_vaga_publica') {
      // Cria (ou atualiza, se já existir uma para essa requisição) o
      // espelho público da vaga.
      const { data: existente } = await admin
        .from('rs_vagas_publicas')
        .select('id')
        .eq('requisicao_id', body.requisicaoId)
        .eq('empresa_id', perfil.empresa_id)
        .maybeSingle();
      const payload = {
        requisicao_id: body.requisicaoId,
        empresa_id: perfil.empresa_id,
        titulo: body.titulo,
        descricao: body.descricao || '',
        requisitos: body.requisitos || '',
        local: body.local || '',
        modalidade: body.modalidade || '',
        mostrar_salario: !!body.mostrarSalario,
        faixa_salarial: body.faixaSalarial || null,
        mostrar_empresa: body.mostrarEmpresa !== false,
        nome_empresa_exibicao: body.nomeEmpresaExibicao || null,
        ativa: true,
        atualizado_em: new Date().toISOString(),
      };
      if (existente) {
        const { error } = await admin.from('rs_vagas_publicas').update(payload).eq('id', existente.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ vagaPublicaId: existente.id });
      }
      const { data, error } = await admin.from('rs_vagas_publicas').insert(payload).select('id').single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ vagaPublicaId: data.id });
    }

    if (action === 'desativar_vaga_publica') {
      const { error } = await admin
        .from('rs_vagas_publicas')
        .update({ ativa: false })
        .eq('requisicao_id', body.requisicaoId)
        .eq('empresa_id', perfil.empresa_id);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    if (action === 'listar_candidaturas_pendentes') {
      const { data: vagaPub } = await admin
        .from('rs_vagas_publicas')
        .select('id')
        .eq('requisicao_id', body.requisicaoId)
        .eq('empresa_id', perfil.empresa_id)
        .maybeSingle();
      if (!vagaPub) return jsonResponse({ candidaturas: [] });
      const { data, error } = await admin
        .from('rs_candidaturas_publicas')
        .select('id, nome, email, telefone, curriculo_path, aceite_banco_talentos, criado_em')
        .eq('vaga_publica_id', vagaPub.id)
        .eq('importada', false)
        .order('criado_em', { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      const comLink = await Promise.all(
        (data || []).map(async (c) => {
          let curriculoUrl = null;
          if (c.curriculo_path) {
            const { data: assinada } = await admin.storage.from('curriculos-rs').createSignedUrl(c.curriculo_path, 3600);
            curriculoUrl = assinada?.signedUrl || null;
          }
          return { ...c, curriculoUrl };
        })
      );
      return jsonResponse({ candidaturas: comLink, vagaPublicaId: vagaPub.id });
    }

    if (action === 'importar_candidatura') {
      const { data: cand, error } = await admin
        .from('rs_candidaturas_publicas')
        .select('id, nome, email, telefone, empresa_id')
        .eq('id', body.candidaturaId)
        .eq('empresa_id', perfil.empresa_id)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      if (!cand) return jsonResponse({ error: 'Candidatura não encontrada.' }, 404);
      await admin.from('rs_candidaturas_publicas').update({ importada: true, importada_em: new Date().toISOString() }).eq('id', cand.id);
      return jsonResponse({ candidato: cand });
    }

    if (action === 'listar_banco_talentos') {
      const { data, error } = await admin
        .from('rs_banco_talentos')
        .select('id, nome, email, telefone, curriculo_path, criado_em')
        .eq('empresa_id', perfil.empresa_id)
        .order('criado_em', { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ talentos: data || [] });
    }

    if (action === 'baixar_curriculo') {
      const path = body.curriculoPath;
      if (!path || !path.startsWith(`${perfil.empresa_id}/`)) return jsonResponse({ error: 'Acesso negado.' }, 403);
      const { data, error } = await admin.storage.from('curriculos-rs').createSignedUrl(path, 3600);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ url: data.signedUrl });
    }

    return jsonResponse({ error: `Ação desconhecida: "${action}".` }, 400);
  } catch (e) {
    console.error('Erro na função rs:', e);
    return jsonResponse({ error: 'Erro interno: ' + String(e) }, 500);
  }
});

// =========================================================================
// COMO IMPLANTAR
// =========================================================================
// 1) Rode antes o sql/28-rs-pagina-publica.sql no projeto PRINCIPAL, e crie
//    o bucket privado "curriculos-rs" (Storage → New bucket).
// 2) No Supabase, projeto PRINCIPAL: Edge Functions → New Function → nome
//    exato: rs → cole este código → Deploy.
// 3) Configure o secret RECAPTCHA_SECRET_KEY (Edge Functions → rs →
//    Settings/Secrets) com a "Secret Key" que você pegou no Google
//    reCAPTCHA. Sem isso, toda candidatura será rejeitada (mensagem de
//    "não foi possível confirmar que você não é um robô").
// =========================================================================
