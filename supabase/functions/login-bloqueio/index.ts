// =========================================================================
// NORTE — Edge Function "login-bloqueio"
// =========================================================================
// Pública (sem login, já que roda ANTES do login acontecer de verdade) —
// move o bloqueio de "5 tentativas erradas" do localStorage (só no
// navegador de quem tentou, fácil de contornar limpando o navegador) pra
// uma tabela real no banco (chave = e-mail), reaproveitando o mesmo
// rate_limit_log já usado pros outros limites de taxa do sistema.
//
// Limitação honesta: isso bloqueia quem usa a TELA de login do sistema.
// Alguém que chamasse a API de autenticação do Supabase diretamente, por
// fora do nosso site, não passaria por aqui — pra fechar essa brecha de
// vez, precisaria configurar um "Auth Hook" (Password Verification Hook)
// direto no painel do Supabase, apontando pra esta mesma lógica.
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

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

function chavePara(email: string): string {
  return `login:${String(email || '').trim().toLowerCase()}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action;
    const email = String(body.email || '').trim();
    if (!email) return jsonResponse({ error: 'E-mail é obrigatório.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const chave = chavePara(email);

    if (action === 'checar') {
      const desde = new Date(Date.now() - JANELA_MINUTOS * 60000).toISOString();
      const { count } = await admin
        .from('rate_limit_log')
        .select('*', { count: 'exact', head: true })
        .eq('chave', chave)
        .eq('acao', 'login_falho')
        .gte('criado_em', desde);
      const bloqueado = (count || 0) >= MAX_TENTATIVAS;
      return jsonResponse({ bloqueado, minutosRestantes: bloqueado ? JANELA_MINUTOS : 0 });
    }

    if (action === 'registrar_falha') {
      await admin.from('rate_limit_log').insert({ chave, acao: 'login_falho' });
      return jsonResponse({ ok: true });
    }

    if (action === 'limpar') {
      // Login deu certo — limpa o histórico de falhas desse e-mail, pra não
      // carregar tentativas antigas pra próxima janela.
      await admin.from('rate_limit_log').delete().eq('chave', chave).eq('acao', 'login_falho');
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: `Ação desconhecida: "${action}".` }, 400);
  } catch (e) {
    console.error('Erro na função login-bloqueio:', e);
    return jsonResponse({ error: 'Erro interno: ' + String(e) }, 500);
  }
});

// =========================================================================
// COMO IMPLANTAR
// =========================================================================
// No Supabase, projeto PRINCIPAL: Edge Functions → New Function → nome
// exato: login-bloqueio → cole este código → Deploy. Não precisa de
// nenhum secret novo (só usa as credenciais automáticas do projeto).
// =========================================================================
