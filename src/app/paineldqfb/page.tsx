'use client';

/**
 * /paineldqfb — Painel admin de IA (custo + revisar respostas da Mel).
 *
 * Página client self-contained: fala com a Edge Function `admin-painel` do Supabase
 * (API JSON + HTTP Basic Auth + CORS). 1ª vez pede a senha (usuário `dqfb`) e guarda
 * no navegador. Os dados ficam atrás do login na função; a página em si é pública.
 *
 * Abas: CUSTO (lê app.vw_custo_ia) · REVISAR RESPOSTAS (fila da Mel: revisar/descartar/
 * promover ao acervo). Estilo na paleta DQFB (wine/magenta/cream), inline para não
 * depender do design system do site.
 */
import { useCallback, useEffect, useState } from 'react';

const BASE = 'https://xwiomidydfappnrrsjqh.supabase.co/functions/v1/admin-painel';
const USER = 'dqfb';

const fmt = (n: number) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// (saldo por provedor) linha vinda do edge — âncora − gasto rastreado desde a âncora.
interface SaldoLinha {
  provedor: string;
  saldo_usd: number;
  gasto_desde_usd: number;
  saldo_estimado_usd: number;
  saldo_estimado_brl: number;
  ancora_em: string;
}
interface Custo {
  dias_grafico: number;
  usd_brl: number;
  total_brl: number;
  // (3 KPIs de tempo) aditivos — Completo (=total_*) · Este ano · Este mês.
  total_usd?: number;
  total_ano_brl?: number;
  total_ano_usd?: number;
  total_mes_brl?: number;
  total_mes_usd?: number;
  chamadas: number;
  usuarias: number;
  custo_medio_brl: number;
  algum_estimado: boolean;
  desde: string | null;
  // (Story 12.B2) card "Custo IA do dia" — consumo de hoje (USD) vs teto/dia (USD).
  // Opcionais: campos ADITIVOS do edge admin-painel; ausentes se o painel (Vercel)
  // deployar ANTES do edge (rollout) → o card se esconde em vez de quebrar.
  custo_hoje_usd?: number;
  teto_usd_dia?: number;
  provedor: { provedor: string; brl: number; usd?: number; chamadas: number }[];
  provedor_ano?: { provedor: string; brl: number; usd?: number; chamadas: number }[];
  provedor_mes?: { provedor: string; brl: number; usd?: number; chamadas: number }[];
  feature: { feature: string; brl: number; chamadas: number }[];
  feature_ano?: { feature: string; brl: number; chamadas: number }[];
  feature_mes?: { feature: string; brl: number; chamadas: number }[];
  // (origem do gasto) produto = aluna usando Lu/Mel/Avaliador/Localizador;
  // painel = curadoria feita aqui dentro; terminal = scripts do dono. Tudo sai da
  // MESMA API key, então tudo conta no total — o card só separa de onde veio.
  origem?: { origem: string; brl: number; usd?: number; chamadas: number }[];
  origem_ano?: { origem: string; brl: number; usd?: number; chamadas: number }[];
  origem_mes?: { origem: string; brl: number; usd?: number; chamadas: number }[];
  mes: { mes: string; brl: number; chamadas: number }[];
  dia: { dia: string; brl: number }[];
  usuaria: { usuaria: string; email?: string; brl: number; chamadas: number }[];
  // (Top usuárias por período) recortes aditivos — ausentes no rollout caem no completo.
  usuaria_ano?: { usuaria: string; email?: string; brl: number; chamadas: number }[];
  usuaria_mes?: { usuaria: string; email?: string; brl: number; chamadas: number }[];
  // (saldo por provedor) card "Saldo dos provedores" — aditivo; ausente no rollout.
  saldo?: SaldoLinha[];
}
interface Fonte {
  tipo?: string;
  doi?: string | null;
  id?: string | null;
  url?: string | null;
}
interface FilaItem {
  id: string;
  pergunta: string;
  resposta: string;
  tier_usado: string;
  fontes_citadas: Fonte[] | null;
  feedback: string | null;
  review_status?: string; // presente na aba "Já revisadas" (revisada/descartada/promovida_acervo)
  created_at: string;
}
interface AvaliadorItem {
  fatos_hash: string;
  produto: string;
  ingredientes: string;
  veredito_ia: string;
  porque_ia: string;
  fonte: string;
  n_avaliacoes: number;
  marcada_aluna: boolean;
  n_marcacoes: number;
  curado_status: string | null;
  curado_validado: boolean;
  curado_veredito: string | null;
  curado_porque: string | null;
  curado_em: string | null;
  usar_como_fewshot: boolean;
  ultima: string;
}
// (Story 12.B2) Uma linha do card "%Confiar por semana" (aba Avaliador).
interface ConfiarSemana {
  semana: string; // segunda-feira YYYY-MM-DD
  n_curadas: number;
  n_confiou: number;
  n_corrigiu: number;
  pct_confiar_sem_edicao: number | null;
}
interface AvaliadorResp {
  itens: AvaliadorItem[];
  total: number;
  marcadas: number;
  curados: number;
  arquivados?: number; // aba própria — não poluem "Não curado".
  pendentes?: number; // reais (nem curado nem arquivado).
  /**
   * Contagem das TRÊS ABAS — particiona `total` por construção (todo produto é
   * exatamente um dos três). Existe separado de `curados` porque aquele campo conta
   * `status==='curado'` sem exigir `validado_por_nutri`, e a aba exige os dois: no dia
   * em que divergirem, três números que não somam o total leem como painel quebrado.
   * Opcional para o painel não quebrar contra uma edge mais antiga.
   */
  abas?: { nao_curado: number; curado: number; arquivado: number };
  confiar_semana?: ConfiarSemana[]; // (Story 12.B2) aditivo — métrica global do Avaliador.
}

// Lu — Dúvidas Receitas (Story 10.10 do app-dqfb). Payload da ?fila=lu.
interface LuItem {
  id: string;
  conversa_id: string | null;
  tipo: string; // 'faq' | 'geracao' | 'abstencao' | ...
  pergunta: string;
  resposta: string;
  thumbs: number | null; // -1 | 1 | null
  review_status: string;
  fontes: { fonte_tipo?: string; id?: string }[] | null;
  receita_titulo?: string | null;
  scores: {
    qaScore?: number | string | null;
    // Score de CONFIANÇA da resposta (pedido do dono 2026-07-12) — determinístico por rota de
    // decisão, gravado pela edge `tutor` (curadoria pura 90-95 · adaptação 80 · composição 70-75).
    confianca_resposta?: number | string | null;
    confianca_rota?: string | null;
    curadoria_lu?: {
      modo?: string;
      em?: string;
      resposta_nova?: string | null;
      resposta_anterior?: string | null;
    } | null;
    // (dono 2026-07-14) Bastidores de uma abstenção: o que a Lu TENTOU dizer (gen) + por que o
    // guard barrou (guardOut). A aluna recebe só a abstenção; aqui a Fran vê o que foi cortado.
    onde?: string | null; // etapa onde parou (ex.: 'guard_2x')
    gen?: string[] | null; // tentativas de geração reprovadas
    guardOut?: string[] | null; // saída do guard por tentativa (JSON com "motivo")
  } | null;
  created_at: string;
}
// Lu do CURSO — o que as alunas perguntam dentro da área de membros da Hotmart.
interface LuCursoRow {
  id: string;
  sessao_id: string | null;
  pergunta: string;
  resposta: string;
  resposta_barrada: string | null;
  rota: 'verbatim' | 'gerada' | 'abstencao';
  motivo: string | null;
  fonte_topo: string | null;
  fonte_id: string | null;
  score_topo: number | null;
  revisada_em: string | null;
  created_at: string;
}
interface LuCursoResp {
  rows: LuCursoRow[];
  resumo: {
    total_7d: number;
    abstencoes_7d: number;
    taxa_abstencao_7d: number;
    usd_dia: number;
    usd_mes: number;
    teto_dia: number;
  };
}

interface LuResp {
  itens: LuItem[];
  pendentes: number; // total REAL da janela (não o tamanho da página)
  pagina: number;
  por_pagina: number;
  tem_proxima: boolean;
  resumo: {
    total_7d: number;
    abstencoes_7d: number;
    taxa_abstencao_7d: number;
    usd_dia: number;
    usd_mes: number;
  };
}

// Lu — Curadoria PROPONENTE (Story 16.2). Payload da ?fila=lu-proposta.
interface LuPropostaItem {
  id: string;
  pergunta: string; // canônica (desidratada — sem a pessoa, com o referente)
  proposta: string;
  classe: 'nova' | 'enriquecimento';
  fonte: 'abstencao' | 'conflito_runtime' | 'thumbs' | 'ima' | null;
  ancora_id: string | null;
  ancora_titulo: string | null;
  alvo_id: string | null; // vizinha a enriquecer (quando classe='enriquecimento')
  alvo_pergunta: string | null;
  alvo_resposta_atual: string | null;
  created_at: string;
}
interface LuPropostaResp {
  itens: LuPropostaItem[];
  pendentes: number;
}
interface MineracaoResp {
  ok?: boolean;
  lote?: number;
  geradas?: number;
  motivos?: Record<string, number>;
  skips?: number;
  descartes?: number;
}

function usePainelApi() {
  // A senha é coletada pela tela de login (LoginGate) e guardada em localStorage
  // ANTES de o painel montar — aqui só lemos. Sem window.prompt.
  const getPass = useCallback(() => localStorage.getItem('dqfb_pass') || '', []);

  const api = useCallback(
    async (path: string, opts?: RequestInit) => {
      for (let t = 0; t < 3; t++) {
        const r = await fetch(BASE + path, {
          ...opts,
          headers: { authorization: 'Basic ' + btoa(`${USER}:${getPass()}`), 'content-type': 'application/json' },
        });
        if (r.status === 401) {
          localStorage.removeItem('dqfb_pass');
          throw new Error('Senha incorreta — recarregue a página.');
        }
        if (r.status >= 500 && t < 2) {
          await sleep(1500);
          continue;
        }
        if (!r.ok) throw new Error('Erro ' + r.status);
        return r.json();
      }
    },
    [getPass],
  );

  return api;
}

function PainelDqfb({ onSair }: { onSair: () => void }) {
  const api = usePainelApi();
  const [tab, setTab] = useState<'custo' | 'revisar' | 'avaliador' | 'lu' | 'lu-proposta' | 'lu-curso'>('custo');
  const [custo, setCusto] = useState<Custo | null>(null);
  const [fila, setFila] = useState<FilaItem[] | null>(null);
  const [melStatus, setMelStatus] = useState<'pendente' | 'revisadas'>('pendente');
  const [avaliador, setAvaliador] = useState<AvaliadorResp | null>(null);
  const [lu, setLu] = useState<LuResp | null>(null);
  const [luProp, setLuProp] = useState<LuPropostaResp | null>(null);
  const [minerando, setMinerando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const loadCusto = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      setCusto((await api('?data=1')) as Custo);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  // (saldo por provedor) grava a âncora de saldo e recarrega o custo (que traz o saldo).
  const setSaldoAncora = useCallback(
    async (provedor: string, saldoUsd: number) => {
      await api('', { method: 'POST', body: JSON.stringify({ action: 'saldo_set', provedor, saldo_usd: saldoUsd }) });
      await loadCusto();
    },
    [api, loadCusto],
  );

  const loadFila = useCallback(async (st?: 'pendente' | 'revisadas') => {
    setErro('');
    setCarregando(true);
    try {
      const d = (await api('?fila=mel&status=' + (st ?? melStatus))) as { itens: FilaItem[] };
      setFila(d.itens ?? []);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api, melStatus]);

  // (Story 12.B1) aba de status da fila do Avaliador — mirror de `luStatus`/`loadLu`.
  // Persiste no estado do componente pai: trocar de aba principal e voltar NÃO reseta.
  const [avaliadorStatus, setAvaliadorStatus] = useState<'nao_curado' | 'curado' | 'arquivado'>('nao_curado');
  const loadAvaliador = useCallback(async (st?: 'nao_curado' | 'curado' | 'arquivado') => {
    setErro('');
    setCarregando(true);
    try {
      setAvaliador((await api('?fila=avaliador&status=' + (st ?? avaliadorStatus))) as AvaliadorResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api, avaliadorStatus]);

  // Lu do CURSO (iframe Hotmart) — 🔴 aba SEPARADA da Lu do app por decisão do dono
  // (30/07). Estado próprio, endpoint próprio: nada aqui cruza com a fila da Lu do app.
  const [luCurso, setLuCurso] = useState<LuCursoResp | null>(null);
  const [luCursoStatus, setLuCursoStatus] = useState<'pendente' | 'abstencao' | 'revisadas' | 'tudo'>('pendente');
  const loadLuCurso = useCallback(async (st?: 'pendente' | 'abstencao' | 'revisadas' | 'tudo') => {
    setErro('');
    setCarregando(true);
    try {
      setLuCurso((await api('?fila=lu-curso&status=' + (st ?? luCursoStatus))) as LuCursoResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api, luCursoStatus]);

  const [luStatus, setLuStatus] = useState<'pendente' | 'revisadas'>('pendente');
  const loadLu = useCallback(async (st?: 'pendente' | 'revisadas', pagina = 0) => {
    setErro('');
    setCarregando(true);
    try {
      setLu((await api(`?fila=lu&status=${st ?? luStatus}&pagina=${pagina}`)) as LuResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api, luStatus]);

  const loadLuProp = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      setLuProp((await api('?fila=lu-proposta')) as LuPropostaResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCusto();
  }, [loadCusto]);

  const trocarTab = (t: 'custo' | 'revisar' | 'avaliador' | 'lu' | 'lu-proposta' | 'lu-curso') => {
    setTab(t);
    if (t === 'custo') void loadCusto();
    else if (t === 'revisar') void loadFila();
    else if (t === 'lu') void loadLu();
    else if (t === 'lu-proposta') void loadLuProp();
    else if (t === 'lu-curso') void loadLuCurso();
    else void loadAvaliador();
  };

  const atualizarTab = () => {
    if (tab === 'custo') void loadCusto();
    else if (tab === 'revisar') void loadFila();
    else if (tab === 'lu') void loadLu();
    else if (tab === 'lu-proposta') void loadLuProp();
    else if (tab === 'lu-curso') void loadLuCurso();
    else void loadAvaliador();
  };

  // Lu do CURSO — curar SEM tocar no acervo do app. A edge decide o destino pela
  // origem da conversa (override quando a resposta veio do app); o front só manda
  // a intenção e o texto. Ver acaoLuCurso em admin-painel/index.ts.
  const acaoLuCurso = async (
    action: 'lu_curso_corrigir' | 'lu_curso_ensinar' | 'lu_curso_ok' | 'lu_curso_ao_app',
    id: string,
    resposta?: string,
    pergunta?: string,
  ): Promise<boolean> => {
    setErro('');
    try {
      const r = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action, id, resposta, pergunta }),
      })) as { sem_embedding?: boolean };
      // Sem embedding a entrada existe mas não é encontrável pela busca — avisar em
      // vez de deixar o dono achar que resolveu.
      if (r?.sem_embedding) {
        setErro('Salvo, mas SEM embedding (a chave da OpenAI falhou). A Lu ainda não vai encontrar essa resposta — me avise para reindexar.');
      }
      await loadLuCurso();
      return true;
    } catch (e) {
      setErro(String(e));
      return false;
    }
  };

  // Lu — Curadoria proponente (Story 16.2): botão "Minerar" + 3 ações na fila.
  const minerar = async () => {
    setMinerando(true);
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'lu_minerar' }),
      })) as MineracaoResp;
      window.alert(
        `Mineração concluída.\n\nPropostas novas: ${res?.geradas ?? 0}\n` +
        (res?.motivos && Object.keys(res.motivos).length
          ? Object.entries(res.motivos).map(([m, n]) => `  · ${m}: ${n}`).join('\n') + '\n'
          : '') +
          `Sem material suficiente (puladas): ${res?.skips ?? 0}\n` +
          `Barradas nos guards: ${res?.descartes ?? 0}`,
      );
      await loadLuProp();
    } catch (e) {
      window.alert(String(e));
    } finally {
      setMinerando(false);
    }
  };

  const acaoProposta = async (
    action: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ): Promise<boolean> => {
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action, id, ...(resposta ? { resposta } : {}) }),
      })) as { ok?: boolean; error?: string };
      if (res?.error) {
        window.alert(res.error);
        return false;
      }
      setLuProp((d) =>
        d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d,
      );
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  const removerDaFila = (id: string) => setFila((f) => (f ? f.filter((x) => x.id !== id) : f));

  const acao = async (id: string, action: 'revisar' | 'descartar') => {
    let nota: string | null = null;
    if (action === 'descartar') nota = window.prompt('Motivo do descarte (opcional):') || null;
    try {
      await api('', { method: 'POST', body: JSON.stringify({ action, id, nota }) });
      removerDaFila(id);
    } catch (e) {
      window.alert(String(e));
    }
  };

  const promover = async (
    id: string,
    p: { titulo: string; resumo: string; lente: string | null; doi: string },
  ) => {
    if (!p.titulo.trim() || !p.resumo.trim()) {
      window.alert('Título e resumo são obrigatórios.');
      return;
    }
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'promover', id, ...p }),
      })) as { embedded?: boolean };
      removerDaFila(id);
      window.alert(
        res?.embedded
          ? 'Adicionado ao acervo! ✅ Já está pesquisável pela Mel.'
          : 'Adicionado ao acervo! ⚠️ Ficou sem busca por ora — avise o suporte técnico para indexar.',
      );
    } catch (e) {
      window.alert(String(e));
    }
  };

  // Avaliador (Cozinha da Fran) — curar/ignorar/exemplo. Retorna true no sucesso
  // (a tela fecha o editor); erros de voz voltam 200 c/ {error, detalhes}.
  const acaoAvaliador = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify(body) })) as {
        error?: string;
        detalhes?: string;
        warnings?: string[];
      };
      if (res?.error) {
        window.alert(res.detalhes || res.error);
        return false;
      }
      if (res?.warnings?.length) {
        window.alert('Salvo com avisos:\n• ' + res.warnings.join('\n• '));
      }
      await loadAvaliador();
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  // Lu — Dúvidas Receitas: Confiar/Ignorar/Exemplo são diretas; Corrigir tem o fluxo
  // preview-then-confirm (quando o backend detecta vizinha ≥0,90, a 1ª chamada volta
  // requer_confirmacao com o alvo — mostramos e reenviamos com confirmar:true).
  const acaoLuSimples = async (action: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify({ action, id }) })) as {
        ensinou?: boolean;
      } | undefined;
      // AC-9: Confiar em resposta GERADA sem parecida no acervo → virou FAQ (a Lu aprendeu).
      if (action === 'lu_confiar' && res?.ensinou) {
        window.alert('Além de confiar, guardei essa resposta no acervo — a próxima aluna recebe na hora. ✅');
      }
      setLu((d) => (d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d));
    } catch (e) {
      window.alert(String(e));
    }
  };

  const reabrirLu = async (id: string) => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify({ action: 'lu_reabrir', id }) })) as {
        desfeito?: string;
      };
      if (res?.desfeito === 'faq-criada-rejeitada') {
        window.alert('Reaberta — e a resposta que tinha entrado no acervo foi removida. ↩️');
      } else if (res?.desfeito === 'resposta-anterior-restaurada') {
        window.alert('Reaberta — e a resposta do acervo voltou ao texto anterior. ↩️');
      }
      void loadLu();
    } catch (e) {
      window.alert(String(e));
    }
  };

  const corrigirLu = async (id: string, resposta: string): Promise<boolean> => {
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'lu_corrigir', id, resposta }),
      })) as {
        ok?: boolean;
        requer_confirmacao?: boolean;
        modo?: string;
        modo_previsto?: string;
        vizinha_pergunta?: string;
        vizinha_resposta_atual?: string | null;
        score?: number;
        error?: string;
      };
      if (res?.error) {
        window.alert(res.error);
        return false;
      }
      if (res?.requer_confirmacao) {
        const okSubstituir = window.confirm(
          'Já existe uma resposta MUITO parecida no acervo (' +
            Math.round((res.score ?? 0) * 100) +
            '% igual):\n\nPergunta dela: ' +
            (res.vizinha_pergunta ?? '') +
            '\n\nResposta atual dela: ' +
            (res.vizinha_resposta_atual ?? '') +
            '\n\nSubstituir o texto dessa resposta pelo seu? (Cancelar = não mexe em nada)',
        );
        if (!okSubstituir) return false;
        const res2 = (await api('', {
          method: 'POST',
          body: JSON.stringify({ action: 'lu_corrigir', id, resposta, confirmar: true }),
        })) as { ok?: boolean; modo?: string; error?: string };
        if (res2?.error) {
          window.alert(res2.error);
          return false;
        }
        window.alert('Atualizei a resposta que já existia — a Lu vai responder com o seu texto. ✅');
      } else if (res?.modo === 'faq-atualizada') {
        window.alert('Atualizei a resposta que a Lu tinha usado — já vale na próxima pergunta. ✅');
      } else if (res?.modo === 'faq-nova') {
        window.alert('Criei uma resposta nova no acervo com a sua correção — já pesquisável. ✅');
      } else {
        window.alert('Correção salva. ✅');
      }
      setLu((d) => (d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d));
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  return (
    <>
      <meta name="robots" content="noindex" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pdqfb-wrap">
        <div className="pdqfb-top">
          <div>
            <div className="pdqfb-eyebrow">DQFB · Admin</div>
            <h1 className="pdqfb-h1">
              Painel <span>DQFB</span>
            </h1>
            <div className="pdqfb-tools">
              <button onClick={atualizarTab}>Atualizar</button>
              <button
                onClick={() => {
                  localStorage.removeItem('dqfb_pass');
                  location.reload();
                }}
              >
                Trocar senha
              </button>
              <button onClick={onSair}>Sair</button>
            </div>
          </div>
          <div className="pdqfb-note">
            {custo?.desde ? `histórico desde ${custo.desde} · US$ ${custo.usd_brl}` : ''}
          </div>
        </div>

        <div className="pdqfb-tabs">
          <button className={tab === 'custo' ? 'on' : ''} onClick={() => trocarTab('custo')}>
            Custo de IA
          </button>
          <button className={tab === 'revisar' ? 'on' : ''} onClick={() => trocarTab('revisar')}>
            Mel respostas
          </button>
          <button className={tab === 'avaliador' ? 'on' : ''} onClick={() => trocarTab('avaliador')}>
            Avaliador
          </button>
          <button className={tab === 'lu' ? 'on' : ''} onClick={() => trocarTab('lu')}>
            Lu · Dúvidas Receitas
          </button>
          <button className={tab === 'lu-proposta' ? 'on' : ''} onClick={() => trocarTab('lu-proposta')}>
            Lu · Propostas
          </button>
          <button className={tab === 'lu-curso' ? 'on' : ''} onClick={() => trocarTab('lu-curso')}>
            Lu · Curso
          </button>
        </div>

        {erro ? <div className="pdqfb-err">{erro}</div> : null}
        {carregando ? <div className="pdqfb-loading">Carregando…</div> : null}

        {!carregando && tab === 'custo' && custo ? <CustoView d={custo} onSetSaldo={setSaldoAncora} /> : null}
        {!carregando && tab === 'revisar' && fila ? (
          <RevisarView
            itens={fila}
            status={melStatus}
            onStatus={(st) => {
              setMelStatus(st);
              void loadFila(st);
            }}
            onAcao={acao}
            onPromover={promover}
          />
        ) : null}
        {!carregando && tab === 'avaliador' && avaliador ? (
          <AvaliadorView
            d={avaliador}
            status={avaliadorStatus}
            onStatus={(st) => {
              setAvaliadorStatus(st);
              void loadAvaliador(st);
            }}
            onAcao={acaoAvaliador}
          />
        ) : null}
        {!carregando && tab === 'lu' && lu ? (
          <LuView
            d={lu}
            status={luStatus}
            onStatus={(st) => {
              setLuStatus(st);
              void loadLu(st);
            }}
            onSimples={acaoLuSimples}
            onCorrigir={corrigirLu}
            onReabrir={reabrirLu}
            onPagina={(p) => void loadLu(luStatus, p)}
          />
        ) : null}
        {!carregando && tab === 'lu-proposta' && luProp ? (
          <LuPropostaView d={luProp} minerando={minerando} onMinerar={minerar} onAcao={acaoProposta} />
        ) : null}
        {!carregando && tab === 'lu-curso' && luCurso ? (
          <LuCursoView
            d={luCurso}
            status={luCursoStatus}
            onStatus={(st) => {
              setLuCursoStatus(st);
              void loadLuCurso(st);
            }}
            onAcao={acaoLuCurso}
          />
        ) : null}
      </div>
    </>
  );
}

// (saldo por provedor) Card "Saldo dos provedores": o dono digita o saldo que o console
// mostra e o painel desconta o gasto rastreado desde então. Estimativa — reancorar recalibra.
const SALDO_PROVEDORES = ['Anthropic', 'OpenAI'];
// Rótulo amigável das features no card "Por feature" (o valor cru fica no banco).
// tutor = motor da Lu (Dúvidas Receitas / Cozinha DQFB).
const FEATURE_LABEL: Record<string, string> = {
  tutor: 'Lu · tutor',
  lu_compor: 'Curadoria · compositor',
  lu_guard_saida: 'Curadoria · guard',
  lu_embed: 'Curadoria · embedding',
};

// (origem do gasto) De onde veio o custo. Tudo sai da mesma API key do console —
// isto separa o que a ALUNA consumiu do que é ferramenta nossa (curadoria no painel
// e scripts no terminal), que antes de 29/07/2026 não era registrado em lugar nenhum.
const ORIGEM_LABEL: Record<string, string> = {
  produto: 'Produto · alunas',
  painel: 'Curadoria · painel',
  terminal: 'Terminal · scripts',
};

// (recorte de tempo) toggle reutilizado por Top usuárias / Por provedor / Por feature.
type Periodo = 'completo' | 'ano' | 'mes';
function PeriodoTabs({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  return (
    <div className="pdqfb-tabs" style={{ margin: 0, borderBottom: 'none' }}>
      <button className={value === 'completo' ? 'on' : ''} onClick={() => onChange('completo')}>Completo</button>
      <button className={value === 'ano' ? 'on' : ''} onClick={() => onChange('ano')}>Este ano</button>
      <button className={value === 'mes' ? 'on' : ''} onClick={() => onChange('mes')}>Este mês</button>
    </div>
  );
}
function pickPeriodo<T>(p: Periodo, completo: T, ano?: T, mes?: T): T {
  return p === 'ano' ? (ano ?? completo) : p === 'mes' ? (mes ?? completo) : completo;
}
function SaldoProvedores(
  { saldo, onSet }: { saldo: SaldoLinha[]; onSet: (provedor: string, saldoUsd: number) => Promise<void> },
) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const byProv = new Map(saldo.map((s) => [s.provedor, s]));
  const submit = async (prov: string) => {
    const v = parseFloat((draft[prov] ?? '').replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) {
      window.alert('Digite um valor válido (o saldo em US$ que o console mostra).');
      return;
    }
    setSaving(prov);
    try {
      await onSet(prov, v);
      setDraft((dd) => ({ ...dd, [prov]: '' }));
    } catch (e) {
      window.alert(String(e));
    } finally {
      setSaving(null);
    }
  };
  return (
    <div className="pdqfb-panel" style={{ marginBottom: 18 }}>
      <h2>Saldo dos provedores</h2>
      <small style={{ display: 'block', marginBottom: 12, color: 'var(--ink-3)' }}>
        Digite o saldo que o console mostra (Anthropic/OpenAI); o painel desconta o gasto rastreado
        desde então. É estimativa — reancore quando quiser recalibrar.
      </small>
      {SALDO_PROVEDORES.map((prov, i) => {
        const s = byProv.get(prov);
        return (
          <div
            key={prov}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: i === 0 ? 0 : 12,
              paddingTop: i === 0 ? 0 : 12,
              borderTop: i === 0 ? 'none' : '1px solid rgba(128,128,128,0.25)',
            }}
          >
            <strong style={{ minWidth: 74 }}>{prov}</strong>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              {s ? `${fmt(s.saldo_estimado_brl)} · US$ ${s.saldo_estimado_usd.toFixed(2)}` : '— não configurado'}
            </span>
            {s ? (
              <small style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                gasto US$ {s.gasto_desde_usd.toFixed(2)} · âncora{' '}
                {new Date(s.ancora_em).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            ) : null}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ color: 'var(--ink-3)' }}>US$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="saldo no console"
                value={draft[prov] ?? ''}
                onChange={(e) => setDraft((dd) => ({ ...dd, [prov]: e.target.value }))}
                style={{ width: 130, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit' }}
              />
              <button className="b" onClick={() => submit(prov)} disabled={saving === prov}>
                {saving === prov ? 'Salvando…' : 'Atualizar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustoView({ d, onSetSaldo }: { d: Custo; onSetSaldo: (provedor: string, saldoUsd: number) => Promise<void> }) {
  const maxDia = Math.max(1, ...d.dia.map((x) => x.brl));
  // (recorte de tempo) toggles independentes: Top usuárias / Por provedor / Por feature / Por origem.
  const [pU, setPU] = useState<Periodo>('completo');
  const [pP, setPP] = useState<Periodo>('completo');
  const [pF, setPF] = useState<Periodo>('completo');
  const [pO, setPO] = useState<Periodo>('completo');
  const usuariaSel = pickPeriodo(pU, d.usuaria, d.usuaria_ano, d.usuaria_mes);
  const provedorSel = pickPeriodo(pP, d.provedor, d.provedor_ano, d.provedor_mes);
  // (origem) aditivo: edge antigo não manda o campo → o card inteiro se esconde.
  const origemSel = pickPeriodo(pO, d.origem, d.origem_ano, d.origem_mes);
  const maxOrigem = Math.max(1, ...(origemSel ?? []).map((x) => x.brl));
  const featureSel = pickPeriodo(pF, d.feature, d.feature_ano, d.feature_mes);
  const maxProv = Math.max(1, ...provedorSel.map((x) => x.brl));
  // (Story 12.B2 / AC-1) Campos aditivos do edge — ausentes no rollout (painel antes do
  // edge). Só mostra o card quando ambos vieram; senão esconde (sem quebrar o resto).
  const temCustoDia = d.custo_hoje_usd != null && d.teto_usd_dia != null;
  const custoHoje = d.custo_hoje_usd ?? 0;
  const tetoDia = d.teto_usd_dia ?? 0;
  const pctHoje = tetoDia > 0 ? Math.round((custoHoje / tetoDia) * 100) : 0;
  return (
    <>
      <div className="pdqfb-kpis">
        {/* (3 KPIs de tempo) Completo · Este ano · Este mês — R$ grande + US$ pequeno. */}
        <div className="pdqfb-kpi dark">
          <div className="lbl">Completo · desde sempre</div>
          <div className="val">
            {fmt(d.total_brl)}
            <small>US$ {(d.total_usd ?? d.total_brl / d.usd_brl).toFixed(2)}</small>
          </div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Este ano</div>
          <div className="val">
            {fmt(d.total_ano_brl ?? 0)}
            <small>US$ {(d.total_ano_usd ?? 0).toFixed(2)}</small>
          </div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Este mês</div>
          <div className="val">
            {fmt(d.total_mes_brl ?? 0)}
            <small>US$ {(d.total_mes_usd ?? 0).toFixed(2)}</small>
          </div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Chamadas de IA</div>
          <div className="val">{d.chamadas.toLocaleString('pt-BR')}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Usuárias</div>
          <div className="val">{d.usuarias}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Custo médio</div>
          <div className="val">
            {fmt(d.custo_medio_brl)}
            <small>/chamada</small>
          </div>
        </div>
      </div>

      {/* (saldo por provedor) Card "Saldo dos provedores" — âncora − gasto rastreado. */}
      <SaldoProvedores saldo={d.saldo ?? []} onSet={onSetSaldo} />

      {/* (Story 12.B2 / AC-1) Card "Custo IA do dia": consumo de hoje (dia BR) vs teto. */}
      {temCustoDia ? (
        <div className="pdqfb-panel" style={{ marginBottom: 18 }}>
          <h2>Custo IA do dia</h2>
          <div className="pdqfb-row">
            <div className="name">
              US$ {custoHoje.toFixed(2)} de US$ {tetoDia.toFixed(2)} consumidos hoje{' '}
              <small>(dia BR)</small>
            </div>
            <div className="v">{pctHoje}%</div>
          </div>
          <div className="pdqfb-bar">
            <span style={{ width: `${Math.min(100, pctHoje)}%` }} />
          </div>
          <small style={{ display: 'block', marginTop: 8, color: 'var(--ink-3)' }}>
            Teto exibido = env AVALIADOR_KILL_SWITCH_USD_DIA (default 50). ⚠️ Para mudar o teto
            hoje é preciso setar OS DOIS envs — AVALIADOR_KILL_SWITCH_USD_DIA (Avaliador) E
            IA_KILL_SWITCH_GLOBAL_USD_DIA (o teto global que governa Mel/Tutor/Localizador desde
            a 12.B3). Este card lê a cópia do admin-painel; pode divergir do teto real se um dos
            envs ficar para trás.
          </small>
        </div>
      ) : null}

      <div className="pdqfb-grid">
        <div className="pdqfb-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Por provedor</h2>
            <PeriodoTabs value={pP} onChange={setPP} />
          </div>
          {provedorSel.map((p) => (
            <div key={p.provedor}>
              <div className="pdqfb-row">
                <div className="name">
                  {p.provedor} <small>{p.chamadas} chamadas</small>
                </div>
                <div className="v">
                  {fmt(p.brl)} <small>· US$ {(p.usd ?? p.brl / d.usd_brl).toFixed(2)}</small>
                </div>
              </div>
              <div className="pdqfb-bar">
                <span style={{ width: `${Math.round((p.brl / maxProv) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="pdqfb-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Por feature</h2>
            <PeriodoTabs value={pF} onChange={setPF} />
          </div>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th className="num">Chamadas</th>
                <th className="num">Custo</th>
              </tr>
            </thead>
            <tbody>
              {featureSel.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--ink-3)', padding: '12px 0' }}>Sem uso no período.</td>
                </tr>
              ) : null}
              {featureSel.map((f) => (
                <tr key={f.feature}>
                  <td>{FEATURE_LABEL[f.feature] ?? f.feature}</td>
                  <td className="num">{f.chamadas}</td>
                  <td className="num">{fmt(f.brl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {origemSel && origemSel.length > 0 ? (
        <div className="pdqfb-panel" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>
              Por origem <small>de onde veio o gasto</small>
            </h2>
            <PeriodoTabs value={pO} onChange={setPO} />
          </div>
          {origemSel.map((o) => (
            <div key={o.origem} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>
                  {ORIGEM_LABEL[o.origem] ?? o.origem} <small>{o.chamadas} chamadas</small>
                </span>
                <strong>{fmt(o.brl)}</strong>
              </div>
              <div className="pdqfb-bar">
                <span style={{ width: `${Math.round((o.brl / maxOrigem) * 100)}%` }} />
              </div>
            </div>
          ))}
          <p style={{ color: 'var(--ink-3)', margin: '10px 0 0', fontSize: 13 }}>
            Tudo sai da mesma chave da API — o total e o saldo somam as três. Curadoria e
            terminal são ferramenta nossa, não consumo da aluna.
          </p>
        </div>
      ) : null}

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <h2>
          Por mês <small>histórico completo</small>
        </h2>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Chamadas</th>
              <th className="num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {d.mes.map((m) => (
              <tr key={m.mes}>
                <td>{m.mes}</td>
                <td className="num">{m.chamadas}</td>
                <td className="num">{fmt(m.brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <h2>
          Por dia <small>últimos {d.dias_grafico}d</small>
        </h2>
        <div className="pdqfb-spark">
          {d.dia.map((x) => (
            <div key={x.dia} className="d" style={{ height: `${Math.round((x.brl / maxDia) * 100)}%` }}>
              <span className="t">
                {x.dia.slice(5)} · {fmt(x.brl)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>
            Top usuárias <small>por custo</small>
          </h2>
          <PeriodoTabs value={pU} onChange={setPU} />
        </div>
        <table>
          <thead>
            <tr>
              <th>Usuária</th>
              <th className="num">Chamadas</th>
              <th className="num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {usuariaSel.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ color: 'var(--ink-3)', padding: '12px 0' }}>Sem uso no período.</td>
              </tr>
            ) : null}
            {usuariaSel.map((u, i) => (
              <tr key={u.email || u.usuaria || i}>
                <td>
                  {u.usuaria}
                  {u.email ? (
                    <>
                      <br />
                      <small style={{ color: 'var(--ink-3)' }}>{u.email}</small>
                    </>
                  ) : null}
                </td>
                <td className="num">{u.chamadas}</td>
                <td className="num">{fmt(u.brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RevisarView({
  itens,
  status,
  onStatus,
  onAcao,
  onPromover,
}: {
  itens: FilaItem[];
  status: 'pendente' | 'revisadas';
  onStatus: (st: 'pendente' | 'revisadas') => void;
  onAcao: (id: string, a: 'revisar' | 'descartar') => void;
  onPromover: (id: string, p: { titulo: string; resumo: string; lente: string | null; doi: string }) => void;
}) {
  const revisadas = status === 'revisadas';
  const filtro = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className={status === 'pendente' ? 'on' : ''} onClick={() => onStatus('pendente')}>
        Pendentes
      </button>
      <button className={status === 'revisadas' ? 'on' : ''} onClick={() => onStatus('revisadas')}>
        Já revisadas
      </button>
    </div>
  );
  if (itens.length === 0) {
    return (
      <>
        {filtro}
        <div className="pdqfb-loading">
          {revisadas ? 'Nada revisado ainda.' : 'Nenhuma resposta pendente. 🎉'}
        </div>
      </>
    );
  }
  return (
    <>
      {filtro}
      <div className="pdqfb-filahead">
        {itens.length} resposta(s) {revisadas ? 'já revisada(s)' : 'pendente(s)'}
      </div>
      {itens.map((it) => (
        <ReviewCard key={it.id} it={it} readOnly={revisadas} onAcao={onAcao} onPromover={onPromover} />
      ))}
    </>
  );
}

const MEL_STATUS_LABEL: Record<string, string> = {
  revisada: '✓ Revisada',
  descartada: '🗑 Descartada',
  promovida_acervo: '⭐ No acervo',
};

function ReviewCard({
  it,
  readOnly = false,
  onAcao,
  onPromover,
}: {
  it: FilaItem;
  readOnly?: boolean;
  onAcao: (id: string, a: 'revisar' | 'descartar') => void;
  onPromover: (id: string, p: { titulo: string; resumo: string; lente: string | null; doi: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [lente, setLente] = useState<string | null>(null);
  const [doi, setDoi] = useState('');
  const fb = it.feedback === 'positivo' ? '👍' : it.feedback === 'negativo' ? '👎' : '';
  const fontes = it.fontes_citadas ?? [];

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier">{it.tier_usado}</span>
        {fb ? <span>{fb}</span> : null}
        {readOnly && it.review_status ? (
          <span className="tier" style={{ background: '#EEE9F5', color: '#5B4B7A' }}>
            {MEL_STATUS_LABEL[it.review_status] ?? it.review_status}
          </span>
        ) : null}
        <span className="rdata">{(it.created_at || '').slice(0, 10)}</span>
      </div>
      <div className="rperg">{it.pergunta}</div>
      <div className="rresp">{it.resposta}</div>
      {fontes.length > 0 ? (
        <div className="rfontes">
          {fontes.map((f, i) => (
            <span key={i} className="fchip">
              {(f.tipo || 'fonte') + (f.doi ? ` · ${f.doi}` : f.id ? ` · ${f.id}` : '')}
            </span>
          ))}
        </div>
      ) : null}
      {readOnly ? null : (
        <div className="racoes">
          <button className="b ok" onClick={() => onAcao(it.id, 'revisar')}>
            Revisada
          </button>
          <button className="b" onClick={() => onAcao(it.id, 'descartar')}>
            Descartar
          </button>
          <button className="b pink" onClick={() => setAberto((v) => !v)}>
            Ao acervo
          </button>
        </div>
      )}
      {!readOnly && aberto ? (
        <div className="promform">
          <div className="hint">
            Escreva a versão CERTA — vira fonte das próximas respostas (não copie a conversa)
          </div>
          <input className="pi" placeholder="Título do artigo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <textarea
            className="pi"
            placeholder="Resumo curado e citável"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
          <div className="lentes">
            {(['alinhado', 'ressalva', 'contra'] as const).map((l) => (
              <button
                key={l}
                className={`lb${lente === l ? ' on' : ''}`}
                onClick={() => setLente((cur) => (cur === l ? null : l))}
              >
                {l === 'alinhado' ? 'Alinhado' : l === 'ressalva' ? 'Com ressalva' : 'Contra'}
              </button>
            ))}
          </div>
          <input className="pi" placeholder="DOI (opcional)" value={doi} onChange={(e) => setDoi(e.target.value)} />
          <button className="b pink" onClick={() => onPromover(it.id, { titulo, resumo, lente, doi })}>
            Adicionar ao acervo
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Avaliador (Cozinha da Fran) — fatia read-only: lista por produto ─────────
// Suporta as escalas de 3 (combina/depende/nao_combina) e 5/8 níveis (12.Q5.1).
const VEREDITO_LABEL: Record<string, string> = {
  combina: 'Combina',
  depende: 'Depende',
  nao_combina: 'Não combina',
  gosto: 'Gosto',
  rotina: 'Rotina',
  excecao: 'Exceção',
  prateleira: 'Prateleira',
  nao_entra: 'Não entra',
};
const FONTE_LABEL: Record<string, string> = {
  ia: 'IA',
  cache: 'cache',
  curado: 'curado',
  deterministico: 'regra',
};

function vereditoTom(v: string): 'ok' | 'no' | 'mid' {
  if (v === 'combina' || v === 'rotina') return 'ok';
  if (v === 'nao_combina' || v === 'nao_entra' || v === 'prateleira') return 'no';
  return 'mid';
}

function estadoCuradoria(it: AvaliadorItem): string {
  if (it.curado_status === 'curado' && it.curado_validado) {
    return it.usar_como_fewshot ? '✓ curado · exemplo' : '✓ curado';
  }
  if (it.curado_status === 'arquivado') return 'arquivado';
  if (it.curado_status) return it.curado_status;
  return 'pendente';
}

// Data em fuso BR (America/Sao_Paulo) — o dia bate com o calendário da Fran.
function fmtData(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Os 5 níveis oficiais (12.Q5.1) — usados no <select> do editor de curadoria.
const NIVEIS: ReadonlyArray<{ v: string; label: string }> = [
  { v: 'gosto', label: 'Dessa eu gosto (1)' },
  { v: 'rotina', label: 'Uso, mas fico de olho (2)' },
  { v: 'excecao', label: 'Somente como exceção (3)' },
  { v: 'prateleira', label: 'Deixo na prateleira (4)' },
  { v: 'nao_entra', label: 'Não entra de jeito nenhum (5)' },
];

type AcaoAvaliador = (body: Record<string, unknown>) => Promise<boolean>;

function AvaliadorCard({ it, onAcao }: { it: AvaliadorItem; onAcao: AcaoAvaliador }) {
  const [editor, setEditor] = useState<null | 'confiar' | 'corrigir'>(null);
  const [veredito, setVeredito] = useState('');
  const [porque, setPorque] = useState('');
  const [salvando, setSalvando] = useState(false);

  const jaCurado = it.curado_status === 'curado' && it.curado_validado;
  // Quando curado, o card mostra a decisão da FRAN (veredito + texto); a IA vira "base".
  const vExibido = jaCurado && it.curado_veredito ? it.curado_veredito : it.veredito_ia;

  const abrir = (modo: 'confiar' | 'corrigir') => {
    if (modo === 'confiar') {
      // decisão B: traz o veredito + o texto da IA para a Fran revisar e assinar.
      setVeredito(it.veredito_ia);
      setPorque(it.porque_ia || '');
    } else {
      setVeredito(it.curado_veredito || it.veredito_ia);
      setPorque(it.curado_porque || '');
    }
    setEditor(modo);
  };

  const salvar = async () => {
    if (!veredito || !porque.trim()) {
      window.alert('Escolha o veredito e escreva o porquê.');
      return;
    }
    setSalvando(true);
    const ok = await onAcao({
      action: 'curar',
      fatos_hash: it.fatos_hash,
      veredito,
      porque,
      produto_nome: it.produto,
    });
    setSalvando(false);
    if (ok) setEditor(null);
  };

  const ignorar = async () => {
    if (!window.confirm('Arquivar este produto? Sai da fila e não entra no treino da IA.')) return;
    await onAcao({ action: 'ignorar', fatos_hash: it.fatos_hash });
  };

  const toggleExemplo = () => onAcao({ action: 'exemplo', fatos_hash: it.fatos_hash, on: !it.usar_como_fewshot });

  // Mantém o veredito atual como opção se ele for um dos 3 antigos (backward-compat).
  const opcoes = !veredito || NIVEIS.some((n) => n.v === veredito)
    ? NIVEIS
    : [{ v: veredito, label: `${VEREDITO_LABEL[veredito] ?? veredito} (atual)` }, ...NIVEIS];

  return (
    <div className="pdqfb-acard">
      <div className="ahead">
        {it.marcada_aluna ? (
          <span className="star" title={`${it.n_marcacoes} reporte(s) de aluna`}>⭐</span>
        ) : null}
        <span className="prod">{it.produto}</span>
        <span className={`vchip ${vereditoTom(vExibido)}`}>
          {VEREDITO_LABEL[vExibido] ?? vExibido}
        </span>
        <span className="meta">
          {it.n_avaliacoes}× · {FONTE_LABEL[it.fonte] ?? it.fonte}
        </span>
        <span className="estado">{estadoCuradoria(it)}</span>
      </div>
      {it.ingredientes ? <div className="aingr">{it.ingredientes}</div> : null}
      {jaCurado && it.curado_porque ? (
        <>
          <div className="aporque curado">
            <span className="tag fran">Fran</span>“{it.curado_porque}”
          </div>
          {it.porque_ia ? (
            <div className="aporque ia-base">
              <span className="tag ia">IA base</span>“{it.porque_ia}”
            </div>
          ) : null}
        </>
      ) : it.porque_ia ? (
        <div className="aporque">“{it.porque_ia}”</div>
      ) : null}

      <div className="adatas">
        Avaliado em {fmtData(it.ultima)}
        {jaCurado && it.curado_em ? ` · Curado em ${fmtData(it.curado_em)}` : ''}
      </div>

      {editor === null ? (
        <div className="aacts">
          <button className="act ok" onClick={() => abrir('confiar')}>✅ Confiar</button>
          <button className="act" onClick={() => abrir('corrigir')}>✏️ Corrigir</button>
          <button className="act" onClick={ignorar}>🗄️ Ignorar</button>
          <button
            className={`act ${it.usar_como_fewshot ? 'on' : ''}`}
            disabled={!jaCurado}
            onClick={toggleExemplo}
            title={
              jaCurado
                ? 'Guarda este caso para o treino futuro da IA. Ainda NÃO muda a avaliação — a marcação fica salva para quando o treino for ligado.'
                : 'Confie ou corrija o veredito antes de guardar como exemplo de treino.'
            }
          >
            ⭐ Exemplo{it.usar_como_fewshot ? ' ✓ guardado' : ''}
          </button>
        </div>
      ) : (
        <div className="aedit">
          <div className="ehint">
            {editor === 'confiar'
              ? 'Confiar: revise o texto da IA e assine como a sua opinião.'
              : 'Corrigir: escolha o veredito e escreva o porquê na sua voz.'}
          </div>
          <label className="elbl">Veredito</label>
          <select value={veredito} onChange={(e) => setVeredito(e.target.value)}>
            {opcoes.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
          <label className="elbl">Porquê — vira o texto curado que a aluna vê</label>
          <textarea
            rows={4}
            value={porque}
            onChange={(e) => setPorque(e.target.value)}
            placeholder="Ex.: Esse produto usa maltitol e eritritol…"
          />
          <div className="ebtns">
            <button className="act ok" disabled={salvando} onClick={salvar}>
              {salvando ? 'Salvando…' : 'Salvar curadoria'}
            </button>
            <button className="act" disabled={salvando} onClick={() => setEditor(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AvaliadorView(
  { d, status, onStatus, onAcao }: {
    d: AvaliadorResp;
    status: 'nao_curado' | 'curado' | 'arquivado';
    onStatus: (st: 'nao_curado' | 'curado' | 'arquivado') => void;
    onAcao: AcaoAvaliador;
  },
) {
  // (Story 12.B1) Sub-filtro de abas — mesma classe/estrutura do `filtro` da LuView.
  const filtro = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className={status === 'nao_curado' ? 'on' : ''} onClick={() => onStatus('nao_curado')}>
        Não curado
      </button>
      <button className={status === 'curado' ? 'on' : ''} onClick={() => onStatus('curado')}>
        Curado
      </button>
      <button className={status === 'arquivado' ? 'on' : ''} onClick={() => onStatus('arquivado')}>
        Arquivado
      </button>
    </div>
  );
  // `total` é GLOBAL (AC-2): total 0 = nenhum produto avaliado no universo inteiro.
  if (d.total === 0) {
    return (
      <>
        {filtro}
        <div className="pdqfb-loading">Nenhum produto avaliado ainda.</div>
      </>
    );
  }
  return (
    <>
      {filtro}
      {/* (dono, 2026-08-04) Um card por ABA, na mesma ordem das abas acima.
          A primeira versão colocou os três números pequenos dentro do card escuro, e o
          resultado ficou pior: "Já curados" e "Pendentes" passaram a repetir dois deles,
          enquanto "arquivados" seguia sem card. Agora cada estado tem o mesmo peso
          visual, e os três somam o total à vista.
          "Marcados por aluna" fica no fim da MESMA linha. A tentativa de descê-lo para
          uma segunda linha deixou um card sozinho ocupando um quarto da largura — órfão,
          pior que a duplicação que eu tinha ido corrigir. O grid virou auto-fit: os cinco
          cabem lado a lado e quebram sozinhos em tela estreita. */}
      <div className="pdqfb-kpis pdqfb-kpis-5">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Produtos avaliados</div>
          <div className="val">{d.total}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Não curados</div>
          <div className="val">{d.abas?.nao_curado ?? d.pendentes ?? 0}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Curados</div>
          <div className="val">{d.abas?.curado ?? d.curados ?? 0}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Arquivados</div>
          <div className="val">{d.abas?.arquivado ?? d.arquivados ?? 0}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">⭐ Marcados por aluna</div>
          <div className="val">{d.marcadas}</div>
        </div>
      </div>
      {/* (Story 12.B2 / AC-2) Card "%Confiar por semana" — de tudo que a Fran curou,
          quanto ela CONFIOU no texto da IA sem editar. Métrica global (não muda por aba). */}
      {d.confiar_semana && d.confiar_semana.length > 0 ? (
        <div className="pdqfb-panel" style={{ marginBottom: 18 }}>
          <h2>%Confiar por semana</h2>
          <table>
            <thead>
              <tr>
                <th>Semana</th>
                <th className="num">Curadas</th>
                <th className="num">Confiou</th>
                <th className="num">Corrigiu</th>
                <th className="num">%Confiar</th>
              </tr>
            </thead>
            <tbody>
              {d.confiar_semana.map((s) => (
                <tr key={s.semana}>
                  <td>{s.semana}</td>
                  <td className="num">{s.n_curadas}</td>
                  <td className="num">{s.n_confiou}</td>
                  <td className="num">{s.n_corrigiu}</td>
                  <td className="num">
                    {s.pct_confiar_sem_edicao != null ? `${s.pct_confiar_sem_edicao}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="pdqfb-filahead">
        {d.itens.length} produto(s) · ⭐ = aluna reportou · ✅ confiar · ✏️ corrigir · 🗄️ ignorar · ⭐ exemplo (guarda p/ treino futuro da IA)
      </div>
      {d.itens.length === 0 ? (
        <div className="pdqfb-loading">
          {status === 'curado'
            ? 'Nenhum produto curado ainda.'
            : 'Nenhum produto pendente — tudo curado por aqui. 💛'}
        </div>
      ) : (
        d.itens.map((it) => <AvaliadorCard key={it.fatos_hash} it={it} onAcao={onAcao} />)
      )}
    </>
  );
}

// ─── Lu — Dúvidas Receitas (Story 10.10) ──────────────────────────────────────
// Fila já vem ordenada do backend (👎 primeiro, depois recentes). As 4 ações espelham
// a UX do Avaliador que a Fran já conhece; Corrigir abre editor com o texto da Lu.
function LuView({
  d,
  status,
  onStatus,
  onSimples,
  onCorrigir,
  onReabrir,
  onPagina,
}: {
  d: LuResp;
  status: 'pendente' | 'revisadas';
  onStatus: (st: 'pendente' | 'revisadas') => void;
  onSimples: (a: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => Promise<void>;
  onCorrigir: (id: string, resposta: string) => Promise<boolean>;
  onReabrir: (id: string) => void;
  onPagina?: (p: number) => void;
}) {
  const filtro = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className={status === 'pendente' ? 'on' : ''} onClick={() => onStatus('pendente')}>
        Pendentes
      </button>
      <button className={status === 'revisadas' ? 'on' : ''} onClick={() => onStatus('revisadas')}>
        Já avaliadas
      </button>
    </div>
  );
  if (d.itens.length === 0) {
    return (
      <>
        {filtro}
        <div className="pdqfb-loading">
          {status === 'pendente' ? 'Nenhuma resposta pendente — a Lu está em dia. 💛' : 'Nenhuma resposta avaliada ainda.'}
        </div>
      </>
    );
  }
  const negativas = d.itens.filter((x) => x.thumbs === -1).length;
  return (
    <>
      {filtro}
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          {/* total REAL da janela. Antes mostrava itens.length — sempre o teto da página — e com
              304 pendentes o painel dizia "200" sem caminho para as outras 104. */}
          <div className="lbl">{status === 'pendente' ? 'Respostas pendentes' : 'Já avaliadas'}</div>
          <div className="val">{d.pendentes}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">👎 da aluna (olhar primeiro)</div>
          <div className="val">{negativas}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">👍 da aluna</div>
          <div className="val">{d.itens.filter((x) => x.thumbs === 1).length}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Sem feedback</div>
          <div className="val">{d.itens.filter((x) => x.thumbs == null).length}</div>
        </div>
      </div>

      {/* Saúde da Lu do APP em 7 dias — os mesmos números da aba do Curso. O que importa não é o
          volume: é a TAXA DE ABSTENÇÃO, porque cada pergunta que ela não soube responder é um
          buraco do acervo esperando virar FAQ. */}
      {d.resumo ? (
        <div className="pdqfb-kpis" style={{ marginTop: 12 }}>
          <div className="pdqfb-kpi">
            <div className="lbl">Perguntas (7 dias)</div>
            <div className="val">{d.resumo.total_7d}</div>
          </div>
          <div className="pdqfb-kpi">
            <div className="lbl">Não soube responder</div>
            <div className="val">
              {d.resumo.abstencoes_7d}{' '}
              <span style={{ fontSize: '0.6em', opacity: 0.7 }}>
                ({(d.resumo.taxa_abstencao_7d * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="pdqfb-kpi">
            <div className="lbl">Gasto hoje</div>
            <div className="val">US$ {d.resumo.usd_dia.toFixed(2)}</div>
          </div>
          <div className="pdqfb-kpi">
            <div className="lbl">Gasto no mês</div>
            <div className="val">US$ {d.resumo.usd_mes.toFixed(2)}</div>
          </div>
        </div>
      ) : null}

      <div className="pdqfb-filahead">
        {d.pendentes} resposta(s)
        {d.pendentes > d.itens.length
          ? ` · mostrando ${d.pagina * d.por_pagina + 1}–${d.pagina * d.por_pagina + d.itens.length}`
          : ''}{' '}
        · 👎 aparecem primeiro · ✅ confiar · ✏️ corrigir (ensina a Lu) · 🗄️ ignorar · ⭐ exemplo
      </div>
      {d.itens.map((it) => (
        <LuCard key={it.id} it={it} onSimples={onSimples} onCorrigir={onCorrigir} onReabrir={onReabrir} />
      ))}
      {(d.pagina > 0 || d.tem_proxima) && onPagina ? (
        <div className="pdqfb-tabs" style={{ justifyContent: 'center', margin: '18px 0 0', borderBottom: 'none' }}>
          <button disabled={d.pagina === 0} onClick={() => onPagina(d.pagina - 1)}>
            ← anteriores
          </button>
          <button disabled={!d.tem_proxima} onClick={() => onPagina(d.pagina + 1)}>
            próximas {d.por_pagina} →
          </button>
        </div>
      ) : null}
    </>
  );
}

function LuCard({
  it,
  onSimples,
  onCorrigir,
  onReabrir,
}: {
  it: LuItem;
  onSimples: (a: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => Promise<void>;
  onCorrigir: (id: string, resposta: string) => Promise<boolean>;
  onReabrir: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(it.resposta);
  const [salvando, setSalvando] = useState(false);

  const qa = it.scores?.qaScore != null ? Number(it.scores.qaScore) : null;
  // Confiança da resposta (rota de decisão da Lu) — tooltip mostra a rota por extenso.
  const confPct = it.scores?.confianca_resposta != null ? Number(it.scores.confianca_resposta) : null;
  const confRota = it.scores?.confianca_rota ?? null;
  const tipoLabel = it.tipo === 'faq' ? 'FAQ curada' : it.tipo === 'geracao' ? 'Gerada' : it.tipo;
  const trilha = it.scores?.curadoria_lu ?? null;
  const respostaNova = trilha?.resposta_nova && trilha.resposta_nova !== it.resposta ? trilha.resposta_nova : null;
  // (dono 2026-07-14) Bastidores da abstenção: o que a Lu tentou dizer + por que o guard barrou.
  const genTent = Array.isArray(it.scores?.gen) ? (it.scores!.gen as string[]) : null;
  const guardOut = Array.isArray(it.scores?.guardOut) ? (it.scores!.guardOut as string[]) : null;
  const ondeParou = typeof it.scores?.onde === 'string' ? it.scores!.onde : null;
  const nTent = Math.max(genTent?.length ?? 0, guardOut?.length ?? 0);

  const salvar = async () => {
    if (!texto.trim()) {
      window.alert('Escreva a resposta corrigida.');
      return;
    }
    setSalvando(true);
    const ok = await onCorrigir(it.id, texto.trim());
    setSalvando(false);
    if (ok) setEditando(false);
  };

  const ignorar = () => {
    if (!window.confirm('Arquivar esta resposta? Ela sai da fila e não muda nada no acervo.')) return;
    void onSimples('lu_ignorar', it.id);
  };

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier">{tipoLabel}</span>
        {it.receita_titulo ? (
          <span className="tier" style={{ background: '#EAF2EE', color: '#2F5A46' }}>🍰 {it.receita_titulo}</span>
        ) : (
          <span className="tier" style={{ background: '#FBEEDC', color: '#8A5A18' }}>sem receita identificada</span>
        )}
        {it.thumbs === -1 ? <span className="tier" style={{ background: '#F8E2E4', color: '#881D28' }}>👎 aluna</span> : null}
        {it.thumbs === 1 ? <span className="tier" style={{ background: '#E3F0E9', color: '#2F7A5A' }}>👍 aluna</span> : null}
        {qa != null && Number.isFinite(qa) ? <span className="tier">match {Math.round(qa * 100)}%</span> : null}
        {confPct != null && Number.isFinite(confPct) ? (
          <span
            className="tier"
            title={confRota ?? undefined}
            style={{
              background: confPct >= 90 ? '#E3F0E9' : confPct >= 75 ? '#FBF3DC' : '#F8E2E4',
              color: confPct >= 90 ? '#2F7A5A' : confPct >= 75 ? '#8A5A18' : '#881D28',
            }}
          >
            confiança {Math.round(confPct)}%
          </span>
        ) : null}
        {it.review_status !== 'pendente' ? (
          <span className="tier" style={{ background: '#EEE9F5', color: '#5B4B7A' }}>
            {it.review_status === 'revisada' ? '✅ confiada' : it.review_status === 'promovida_faq' ? '✏️ corrigida' : it.review_status === 'descartada' ? '🗄️ ignorada' : '⭐ exemplo'}
          </span>
        ) : null}
        <span className="rdata">
          aluna {fmtData(it.created_at)}
          {trilha?.em ? ' · curada ' + fmtData(trilha.em) : ''}
        </span>
      </div>
      <div className="rperg">{it.pergunta}</div>
      {editando ? (
        <div className="promform">
          <div className="hint">Sua correção vira a resposta oficial da Lu (na hora, sem retreino)</div>
          <textarea
            className="pi"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
          />
          <div className="racoes">
            <button className="b pink" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar correção'}
            </button>
            <button className="b" onClick={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </div>
      ) : it.review_status !== 'pendente' ? (
        <>
          {respostaNova ? (
            <>
              <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pinky)', margin: '4px 0 6px' }}>
                Resposta nova — vale a partir de agora
              </div>
              <div className="rresp" style={{ borderLeft: '3px solid var(--pinky)' }}>{respostaNova}</div>
              <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '10px 0 6px' }}>
                O que a aluna recebeu na época
              </div>
              <div className="rresp" style={{ opacity: 0.7 }}>{it.resposta}</div>
            </>
          ) : (
            <div className="rresp">{it.resposta}</div>
          )}
          <div className="racoes">
            <button
              className="b"
              onClick={() => {
                if (window.confirm('Reabrir esta resposta? Ela volta para a fila — e se a ação tinha guardado algo no acervo, o desfazer é automático.')) {
                  onReabrir(it.id);
                }
              }}
            >
              ↩️ Reabrir
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rresp">{it.resposta}</div>
          <div className="racoes">
            <button className="b ok" onClick={() => void onSimples('lu_confiar', it.id)}>
              ✅ Confiar
            </button>
            <button className="b pink" onClick={() => { setTexto(it.resposta); setEditando(true); }}>
              ✏️ Corrigir
            </button>
            <button className="b" onClick={ignorar}>
              🗄️ Ignorar
            </button>
            <button
              className="b"
              onClick={() => {
                if (window.confirm('Marcar como EXEMPLO? Guarda esta resposta para o treino futuro da Lu.')) {
                  void onSimples('lu_exemplo', it.id);
                }
              }}
            >
              ⭐ Exemplo
            </button>
          </div>
        </>
      )}
      {nTent > 0 ? (
        <details className="lu-bastidores">
          <summary>
            🛡️ O que a Lu tentou dizer — barrado pelo guard
            {ondeParou ? <span className="lu-onde">{ondeParou}</span> : null}
          </summary>
          {Array.from({ length: nTent }).map((_, i) => (
            <div className="lu-tent" key={i}>
              <div className="lu-tent-cab">Tentativa {i + 1}</div>
              {genTent?.[i] ? <div className="lu-tent-gen">{genTent[i]}</div> : null}
              {guardOut?.[i] ? <div className="lu-tent-motivo">Guard reprovou: {motivoGuard(guardOut[i])}</div> : null}
            </div>
          ))}
          <div className="lu-bast-nota">A aluna recebeu só a abstenção — nada disto vazou para ela.</div>
        </details>
      ) : null}
    </div>
  );
}

/** Extrai o "motivo" do JSON de saída do guard (pode vir embrulhado em ```json … ``` ou truncado). */
function motivoGuard(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const m = raw.match(/"motivo"\s*:\s*"([^"]{0,400})/);
  if (m) return m[1];
  return raw.replace(/```json|```/g, '').replace(/\s+/g, ' ').trim().slice(0, 280);
}

// ─── Lu — Curadoria PROPONENTE (Story 16.2) ────────────────────────────────────
// A Lu minera os próprios pontos-cegos e traz PROPOSTAS já redigidas (âncora + números
// conferidos + guards). A Fran decide em 1 clique: Confiar / Corrigir / Ignorar — nunca
// redige do zero. Mesma UX/visual da aba "Lu · Dúvidas Receitas".
function LuPropostaView({
  d,
  minerando,
  onMinerar,
  onAcao,
}: {
  d: LuPropostaResp;
  minerando: boolean;
  onMinerar: () => void;
  onAcao: (
    a: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ) => Promise<boolean>;
}) {
  const botao = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className="pdqfb-minerar" onClick={onMinerar} disabled={minerando}>
        {minerando ? '⛏️ Minerando…' : '🔍 Minerar pontos-cegos'}
      </button>
    </div>
  );
  const novas = d.itens.filter((x) => x.classe === 'nova').length;
  const enriq = d.itens.filter((x) => x.classe === 'enriquecimento').length;
  return (
    <>
      {botao}
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Propostas na fila</div>
          <div className="val">{d.pendentes}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Perguntas novas</div>
          <div className="val">{novas}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Enriquecer resposta curta</div>
          <div className="val">{enriq}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Ações</div>
          <div className="val" style={{ fontSize: 15 }}>✅ ✏️ 🗄️</div>
        </div>
      </div>
      {d.itens.length === 0 ? (
        <div className="pdqfb-loading">
          Nenhuma proposta na fila. Clique em “Minerar pontos-cegos” para a Lu buscar lacunas e trazer rascunhos. 💛
        </div>
      ) : (
        <>
          <div className="pdqfb-filahead">
            {d.pendentes} proposta(s) · ✅ confiar (publica) · ✏️ corrigir (seu texto) · 🗄️ ignorar
          </div>
          {d.itens.map((it) => (
            <LuPropostaCard key={it.id} it={it} onAcao={onAcao} />
          ))}
        </>
      )}
    </>
  );
}

const FONTE_PROP_LABEL: Record<string, string> = {
  abstencao: 'ficou sem resposta',
  conflito_runtime: 'respostas em conflito',
  thumbs: '👎 da aluna',
  ima: 'resposta curta demais',
};

function LuPropostaCard({
  it,
  onAcao,
}: {
  it: LuPropostaItem;
  onAcao: (
    a: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ) => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(it.proposta);
  const [salvando, setSalvando] = useState(false);
  const enriquecimento = it.classe === 'enriquecimento';

  const confiar = async () => {
    setSalvando(true);
    await onAcao('lu_prop_confiar', it.id);
    setSalvando(false);
  };
  const salvar = async () => {
    if (!texto.trim()) {
      window.alert('Escreva a resposta.');
      return;
    }
    setSalvando(true);
    const ok = await onAcao('lu_prop_corrigir', it.id, texto.trim());
    setSalvando(false);
    if (ok) setEditando(false);
  };
  const ignorar = () => {
    if (!window.confirm('Descartar esta proposta? Ela sai da fila e nada é publicado.')) return;
    void onAcao('lu_prop_ignorar', it.id);
  };

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier" style={enriquecimento
          ? { background: '#EEE9F5', color: '#5B4B7A' }
          : { background: '#E3F0E9', color: '#2F7A5A' }}>
          {enriquecimento ? '➕ enriquecer resposta' : '🆕 pergunta nova'}
        </span>
        {it.ancora_titulo ? (
          <span className="tier" style={{ background: '#EAF2EE', color: '#2F5A46' }}>🍰 {it.ancora_titulo}</span>
        ) : (
          <span className="tier" style={{ background: '#FBEEDC', color: '#8A5A18' }}>sem receita amarrada</span>
        )}
        {it.fonte ? <span className="tier">{FONTE_PROP_LABEL[it.fonte] ?? it.fonte}</span> : null}
        <span className="rdata">minerada {fmtData(it.created_at)}</span>
      </div>
      <div className="rperg">{it.pergunta}</div>

      {enriquecimento && it.alvo_resposta_atual ? (
        <>
          <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '4px 0 6px' }}>
            Resposta curta de hoje
          </div>
          <div className="rresp" style={{ opacity: 0.7 }}>{it.alvo_resposta_atual}</div>
          <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pinky)', margin: '10px 0 6px' }}>
            Proposta da Lu — auto-contida
          </div>
        </>
      ) : null}

      {editando ? (
        <div className="promform">
          <div className="hint">Seu texto entra no lugar da proposta — publica ao salvar</div>
          <textarea className="pi" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={salvando} />
          <div className="racoes">
            <button className="b pink" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar e publicar'}
            </button>
            <button className="b" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rresp" style={{ borderLeft: '3px solid var(--pinky)' }}>{it.proposta}</div>
          <div className="racoes">
            <button className="b ok" onClick={() => void confiar()} disabled={salvando}>✅ Confiar</button>
            <button className="b pink" onClick={() => { setTexto(it.proposta); setEditando(true); }} disabled={salvando}>✏️ Corrigir</button>
            <button className="b" onClick={ignorar} disabled={salvando}>🗄️ Ignorar</button>
          </div>
        </>
      )}
    </div>
  );
}

const CSS = `
.pdqfb-wrap{--pinky:#CE3B87;--velvet:#881D28;--cream-200:#F5E6E8;--off:#F8F4F3;--paper:#FFFFFF;--ink:#1A1416;--ink-2:#4E3F44;--ink-3:#8E7E83;--ink-4:#C9BDC0;--hairline:rgba(26,20,22,0.08);--success:#2F7A5A;--pink-300:#E07AAE;
  max-width:1100px;margin:0 auto;padding:28px 24px 64px;color:var(--ink);background:var(--off);min-height:100vh;font-family:var(--font-manrope),-apple-system,Helvetica,Arial,sans-serif;}
.pdqfb-wrap *{box-sizing:border-box;}
.pdqfb-top{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:4px;}
.pdqfb-eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-h1{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:40px;line-height:0.95;margin:6px 0 0;}
.pdqfb-h1 span{color:var(--pinky);}
.pdqfb-note{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;color:var(--ink-3);text-transform:uppercase;}
.pdqfb-tools{display:flex;gap:8px;margin-top:8px;}
.pdqfb-tools button{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;background:var(--paper);border:1px solid var(--ink-4);color:var(--ink-2);border-radius:999px;padding:6px 12px;cursor:pointer;}
.pdqfb-tabs{display:flex;gap:8px;margin:18px 0 22px;border-bottom:1px solid var(--hairline);}
.pdqfb-tabs button{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-3);background:none;border:none;border-bottom:2px solid transparent;padding:10px 6px;cursor:pointer;}
.pdqfb-tabs button.on{color:var(--pinky);border-bottom-color:var(--pinky);}
.pdqfb-minerar{font-family:inherit;font-size:13px;font-weight:600;letter-spacing:0.01em;text-transform:none;background:var(--pinky);color:#fff;border:1px solid var(--pinky);border-bottom:1px solid var(--pinky);border-radius:999px;padding:9px 18px;cursor:pointer;}
.pdqfb-minerar:disabled{opacity:0.55;cursor:not-allowed;}
.pdqfb-err{color:var(--velvet);font-size:13px;margin:8px 0;}
.pdqfb-loading{color:var(--ink-3);font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:20px 0;}
.pdqfb-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:4px 0 22px;}
@media(max-width:760px){.pdqfb-kpis{grid-template-columns:repeat(2,1fr);}}
.pdqfb-kpi{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:16px 18px;}
.pdqfb-kpi.dark{background:var(--ink);color:var(--off);border-color:transparent;position:relative;overflow:hidden;}
.pdqfb-kpi.dark::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--pinky);}
.pdqfb-kpi .lbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-kpi.dark .lbl{color:var(--cream-200);}
.pdqfb-kpi .val{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:34px;line-height:1;margin-top:8px;}
.pdqfb-kpi.dark .val{color:#fff;}
.pdqfb-kpi .val small{font-family:ui-monospace,monospace;font-size:11px;color:var(--ink-3);letter-spacing:0.1em;margin-left:3px;}
.pdqfb-kpis.pdqfb-kpis-5{grid-template-columns:repeat(auto-fit,minmax(148px,1fr));}
.pdqfb-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
@media(max-width:760px){.pdqfb-grid{grid-template-columns:1fr;}}
.pdqfb-panel{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:20px;}
.pdqfb-panel h2{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:20px;margin:0 0 14px;}
.pdqfb-panel h2 small{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.14em;color:var(--ink-3);text-transform:uppercase;}
.pdqfb-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}
.pdqfb-row .name{font-size:13px;color:var(--ink);}
.pdqfb-row .name small{font-family:ui-monospace,monospace;font-size:9px;color:var(--ink-3);letter-spacing:0.1em;text-transform:uppercase;margin-left:6px;}
.pdqfb-row .v{font-family:var(--font-fraunces),Georgia,serif;font-size:16px;}
.pdqfb-bar{height:5px;background:var(--cream-200);border-radius:999px;overflow:hidden;margin-bottom:12px;}
.pdqfb-bar>span{display:block;height:100%;border-radius:999px;background:var(--pinky);}
.pdqfb-panel table{width:100%;border-collapse:collapse;font-size:13px;}
.pdqfb-panel th{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);text-align:left;font-weight:500;padding:8px 6px;border-bottom:1px solid var(--hairline);}
.pdqfb-panel td{padding:9px 6px;border-bottom:1px solid var(--hairline);}
.pdqfb-panel td.num,.pdqfb-panel th.num{text-align:right;font-family:ui-monospace,monospace;}
.pdqfb-spark{display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:8px;}
.pdqfb-spark .d{flex:1;background:var(--pink-300);border-radius:3px 3px 0 0;min-height:3px;position:relative;}
.pdqfb-spark .d:hover{background:var(--pinky);}
.pdqfb-spark .d .t{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-family:ui-monospace,monospace;font-size:8px;color:var(--ink-3);white-space:nowrap;margin-bottom:2px;opacity:0;}
.pdqfb-spark .d:hover .t{opacity:1;}
.pdqfb-filahead{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px;}
.pdqfb-rcard{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:18px 20px;margin-bottom:16px;}
.pdqfb-rcard .rhead{display:flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;}
.pdqfb-rcard .rhead .tier{background:var(--cream-200);color:var(--ink-2);padding:2px 8px;border-radius:999px;}
.pdqfb-rcard .rhead .rdata{margin-left:auto;}
.pdqfb-rcard .rperg{font-family:var(--font-fraunces),Georgia,serif;font-style:italic;font-size:18px;color:var(--ink);margin-bottom:8px;}
.pdqfb-rcard .rresp{font-size:14px;line-height:1.55;color:var(--ink-2);white-space:pre-wrap;max-height:240px;overflow:auto;background:var(--off);border-radius:10px;padding:12px;}
.pdqfb-rcard .rfontes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.pdqfb-rcard .fchip{font-family:ui-monospace,monospace;font-size:9px;color:var(--ink-3);background:var(--cream-200);padding:2px 7px;border-radius:999px;}
.pdqfb-rcard .racoes{display:flex;gap:8px;margin-top:14px;}
.pdqfb-rcard .b{font-family:inherit;font-size:13px;font-weight:500;border:1px solid var(--ink-4);background:var(--paper);color:var(--ink-2);border-radius:10px;padding:8px 16px;cursor:pointer;}
.pdqfb-rcard .b.ok{border-color:var(--success);color:var(--success);}
.pdqfb-rcard .b.pink{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-rcard .promform{margin-top:14px;border-top:1px dashed var(--hairline);padding-top:14px;display:flex;flex-direction:column;gap:10px;}
.pdqfb-rcard .promform .hint{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-rcard .pi{font-family:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--hairline);border-radius:10px;padding:10px 12px;width:100%;}
.pdqfb-rcard textarea.pi{min-height:90px;resize:vertical;}
.pdqfb-rcard .lentes{display:flex;gap:8px;}
.pdqfb-rcard .lb{font-family:inherit;font-size:12px;border:1px solid var(--hairline);background:var(--paper);color:var(--ink-2);border-radius:999px;padding:6px 14px;cursor:pointer;}
.pdqfb-rcard .lb.on{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-rcard .lu-bastidores{margin-top:12px;border-top:1px dashed var(--hairline);padding-top:10px;}
.pdqfb-rcard .lu-bastidores>summary{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;gap:8px;list-style:none;}
.pdqfb-rcard .lu-bastidores>summary::-webkit-details-marker{display:none;}
.pdqfb-rcard .lu-bastidores .lu-onde{font-family:ui-monospace,monospace;font-size:9px;background:#F8E2E4;color:#881D28;padding:2px 7px;border-radius:999px;letter-spacing:0.06em;}
.pdqfb-rcard .lu-tent{margin-top:10px;background:var(--off);border-radius:10px;padding:10px 12px;border-left:3px solid #D9A3A9;}
.pdqfb-rcard .lu-tent-cab{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px;}
.pdqfb-rcard .lu-tent-gen{font-size:13px;line-height:1.5;color:var(--ink-2);white-space:pre-wrap;max-height:160px;overflow:auto;}
.pdqfb-rcard .lu-tent-motivo{margin-top:8px;font-size:12px;line-height:1.45;color:#8A2A32;background:#FBEEF0;border-radius:8px;padding:7px 10px;}
/* ── Lu · Curso: contornos mais firmes ───────────────────────────────────────
   O painel inteiro usa --hairline, que é discreto de propósito. Nesta aba a
   leitura é comparativa (resposta que saiu × resposta que vai substituir) e o
   traço fino sumia no branco: o dono não distinguia onde um bloco terminava e
   o outro começava. Escopado em .lu-curso para não escurecer as outras abas. */
.pdqfb-rcard.lu-curso{border-color:var(--ink-4);box-shadow:0 1px 2px rgba(28,27,27,0.04);}
.pdqfb-rcard.lu-curso .rresp{border:1px solid var(--hairline);}
.pdqfb-rcard.lu-curso .promform{border-top:1px solid var(--ink-4);}
.pdqfb-rcard.lu-curso .pi{border-color:var(--ink-4);}
.pdqfb-rcard.lu-curso .pi:focus{border-color:var(--pinky);outline:none;}
.pdqfb-rcard.lu-curso .lu-tent-motivo{border:1px solid #E9C3C8;}
.pdqfb-rcard.lu-curso.revisada{opacity:0.72;border-style:dashed;}
.pdqfb-rcard .lu-bast-nota{margin-top:10px;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.06em;color:var(--ink-3);font-style:italic;}
.pdqfb-acard{background:var(--paper);border:1px solid var(--hairline);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.pdqfb-acard .ahead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.pdqfb-acard .star{font-size:14px;line-height:1;}
.pdqfb-acard .prod{font-family:var(--font-fraunces),Georgia,serif;font-size:16px;font-weight:600;color:var(--ink);}
.pdqfb-acard .meta{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-acard .estado{margin-left:auto;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-2);background:var(--cream-200);padding:3px 9px;border-radius:999px;}
.pdqfb-acard .aingr{font-size:12px;color:var(--ink-3);margin-top:6px;line-height:1.45;}
.pdqfb-acard .vchip{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:999px;}
.pdqfb-acard .vchip.ok{background:rgba(47,122,90,0.12);color:var(--success);}
.pdqfb-acard .vchip.no{background:rgba(136,29,40,0.10);color:var(--velvet);}
.pdqfb-acard .vchip.mid{background:var(--cream-200);color:var(--ink-2);}
.pdqfb-acard .aporque{font-size:12.5px;color:var(--ink-2);margin-top:8px;line-height:1.5;font-style:italic;border-left:2px solid var(--cream-200);padding-left:10px;}
.pdqfb-acard .aporque.curado{color:var(--ink);border-left-color:var(--pinky);font-style:normal;}
.pdqfb-acard .aporque.ia-base{opacity:0.6;font-size:11.5px;margin-top:6px;}
.pdqfb-acard .aporque .tag{display:inline-block;font-family:ui-monospace,monospace;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 6px;border-radius:999px;margin-right:8px;vertical-align:middle;font-style:normal;}
.pdqfb-acard .aporque .tag.fran{background:var(--pinky);color:#fff;}
.pdqfb-acard .aporque .tag.ia{background:var(--cream-200);color:var(--ink-3);}
.pdqfb-acard .adatas{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-top:10px;}
.pdqfb-acard .aacts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.pdqfb-acard .act{font-family:inherit;font-size:12.5px;font-weight:500;border:1px solid var(--ink-4);background:var(--paper);color:var(--ink-2);border-radius:10px;padding:7px 13px;cursor:pointer;}
.pdqfb-acard .act:hover:not(:disabled){border-color:var(--ink-3);}
.pdqfb-acard .act.ok{border-color:var(--success);color:var(--success);}
.pdqfb-acard .act.on{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-acard .act:disabled{opacity:0.45;cursor:not-allowed;}
.pdqfb-acard .aedit{margin-top:12px;border-top:1px dashed var(--hairline);padding-top:12px;display:flex;flex-direction:column;gap:8px;}
.pdqfb-acard .aedit .ehint{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-acard .aedit .elbl{font-size:11px;color:var(--ink-3);margin-top:2px;}
.pdqfb-acard .aedit select,.pdqfb-acard .aedit textarea{font-family:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--hairline);border-radius:10px;padding:9px 12px;width:100%;}
.pdqfb-acard .aedit textarea{resize:vertical;line-height:1.5;}
.pdqfb-acard .aedit .ebtns{display:flex;gap:8px;margin-top:4px;}

/* ── Tela de login ─────────────────────────────────────────────── */
.pdqfb-login{position:fixed;inset:0;background:var(--off);display:flex;align-items:center;justify-content:center;padding:24px;z-index:50;}
.pdqfb-login-card{width:100%;max-width:380px;background:var(--paper);border:1px solid var(--hairline);border-radius:20px;padding:36px 32px;box-shadow:0 12px 40px rgba(26,20,22,0.08);}
.pdqfb-login-eyebrow{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-login-h1{font-family:var(--font-display);font-size:38px;font-weight:600;line-height:1.05;color:var(--ink);margin:6px 0 4px;}
.pdqfb-login-h1 span{color:var(--pinky);}
.pdqfb-login-sub{font-size:13px;color:var(--ink-3);margin-bottom:24px;}
.pdqfb-login label{display:block;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:var(--ink-3);margin:14px 0 6px;}
.pdqfb-login input{width:100%;font-family:inherit;font-size:15px;color:var(--ink);background:var(--paper);border:1px solid var(--hairline);border-radius:11px;padding:11px 13px;transition:border-color 0.15s;}
.pdqfb-login input:focus{outline:none;border-color:var(--pinky);}
.pdqfb-login input:disabled{opacity:0.5;}
.pdqfb-login button{width:100%;margin-top:22px;font-family:inherit;font-size:15px;font-weight:600;color:#fff;background:var(--pinky);border:none;border-radius:11px;padding:13px;cursor:pointer;transition:opacity 0.15s;}
.pdqfb-login button:hover{opacity:0.92;}
.pdqfb-login button:disabled{opacity:0.5;cursor:not-allowed;}
.pdqfb-login-err{margin-top:14px;font-size:13px;color:var(--velvet);}
`;

/** Tela de login — coleta a senha (usuário fixo `dqfb`), valida na API e a
 *  guarda em localStorage antes de o painel montar. Substitui o window.prompt. */
function LoginGate({ onOk }: { onOk: () => void }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = useCallback(async () => {
    if (!senha || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const r = await fetch(BASE + '?data=1', {
        headers: { authorization: 'Basic ' + btoa(`${USER}:${senha}`) },
      });
      if (r.status === 401) {
        setErro('Senha incorreta.');
        setEnviando(false);
        return;
      }
      if (!r.ok) {
        setErro('Erro ao entrar. Tente de novo.');
        setEnviando(false);
        return;
      }
      localStorage.setItem('dqfb_pass', senha);
      onOk();
    } catch {
      setErro('Sem conexão. Tente de novo.');
      setEnviando(false);
    }
  }, [senha, enviando, onOk]);

  return (
    <>
      <meta name="robots" content="noindex" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pdqfb-login">
        <form
          className="pdqfb-login-card"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          <div className="pdqfb-login-eyebrow">DQFB · Admin</div>
          <h1 className="pdqfb-login-h1">
            Painel <span>DQFB</span>
          </h1>
          <div className="pdqfb-login-sub">Acesso restrito.</div>
          <label htmlFor="pdqfb-user">Usuário</label>
          <input id="pdqfb-user" value={USER} readOnly disabled />
          <label htmlFor="pdqfb-pass">Senha</label>
          <input
            id="pdqfb-pass"
            type="password"
            autoFocus
            value={senha}
            disabled={enviando}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro ? <div className="pdqfb-login-err">{erro}</div> : null}
          <button type="submit" disabled={enviando || !senha}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </>
  );
}

export default function Page() {
  const [logado, setLogado] = useState<boolean | null>(null);
  useEffect(() => {
    setLogado(!!localStorage.getItem('dqfb_pass'));
  }, []);
  if (logado === null) return null; // evita flash no SSR/hydration
  if (!logado) return <LoginGate onOk={() => setLogado(true)} />;
  return (
    <PainelDqfb
      onSair={() => {
        localStorage.removeItem('dqfb_pass');
        setLogado(false);
      }}
    />
  );
}

// ─── Lu · Curso ───────────────────────────────────────────────────────────────
// 🔴 REGRA MASTER (dono, 30/07): aba SEPARADA da Lu do app, de ponta a ponta.
// O que ela responde, em ordem de importância:
//   1. o que a Lu NÃO soube (abstenção = buraco do acervo)
//   2. quanto o curso gastou contra o teto próprio de US$1,50/dia
//   3. o histórico, para o dono ler as alunas com as próprias palavras
//
// CURAR AQUI NUNCA ESCREVE NO ACERVO DO APP. Quando a resposta errada veio do
// acervo do app, a correção nasce como versão-curso e a busca DO CURSO passa a
// ignorar a original — no aplicativo, nada muda. Ver acaoLuCurso na edge.
function LuCursoView({
  d,
  status,
  onStatus,
  onAcao,
}: {
  d: LuCursoResp;
  status: 'pendente' | 'abstencao' | 'revisadas' | 'tudo';
  onStatus: (st: 'pendente' | 'abstencao' | 'revisadas' | 'tudo') => void;
  onAcao: (
    a: 'lu_curso_corrigir' | 'lu_curso_ensinar' | 'lu_curso_ok' | 'lu_curso_ao_app',
    id: string,
    resposta?: string,
    pergunta?: string,
  ) => Promise<boolean>;
}) {
  const r = d.resumo;
  const pct = (r.taxa_abstencao_7d * 100).toFixed(1);
  // teto é do DIA: passar de 80% dele merece aviso antes de a Lu emudecer no ar.
  const perto = r.teto_dia > 0 && r.usd_dia >= r.teto_dia * 0.8;

  return (
    <>
      <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
        <button className={status === 'pendente' ? 'on' : ''} onClick={() => onStatus('pendente')}>
          A revisar
        </button>
        <button className={status === 'abstencao' ? 'on' : ''} onClick={() => onStatus('abstencao')}>
          Só o que ela não soube
        </button>
        <button className={status === 'revisadas' ? 'on' : ''} onClick={() => onStatus('revisadas')}>
          Já revisadas
        </button>
        <button className={status === 'tudo' ? 'on' : ''} onClick={() => onStatus('tudo')}>
          Tudo
        </button>
      </div>

      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Perguntas (7 dias)</div>
          <div className="val">{r.total_7d}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Não soube responder</div>
          <div className="val">
            {r.abstencoes_7d} <span style={{ fontSize: '0.6em', opacity: 0.7 }}>({pct}%)</span>
          </div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Gasto hoje</div>
          <div className="val" style={perto ? { color: '#b3261e' } : undefined}>
            US$ {r.usd_dia.toFixed(2)}
            <span style={{ fontSize: '0.55em', opacity: 0.7 }}> / {r.teto_dia.toFixed(2)}</span>
          </div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Gasto no mês</div>
          <div className="val">US$ {r.usd_mes.toFixed(2)}</div>
        </div>
      </div>

      {perto ? (
        <div className="pdqfb-err">
          Perto do teto do dia. Ao encostar, a Lu do Curso passa a encaminhar para a Mi em vez de
          responder — e volta sozinha amanhã. A Lu do app não é afetada.
        </div>
      ) : null}

      <div className="pdqfb-filahead">
        {d.rows.length} conversa(s) ·{' '}
        {status === 'abstencao'
          ? 'cada uma aqui é uma resposta que falta no acervo do curso'
          : '📗 acervo do curso · 📘 acervo do app · ⚠️ não soube'}
      </div>

      {d.rows.length === 0 ? (
        <div className="pdqfb-loading">
          {status === 'pendente'
            ? 'Nada a revisar — tudo em dia por aqui. 💛'
            : status === 'abstencao'
              ? 'Nenhuma abstenção no período. 💛'
              : status === 'revisadas'
                ? 'Nenhuma revisada ainda — o que você aprovar ou corrigir aparece aqui.'
                : 'Nenhuma conversa ainda — a Lu do Curso ainda não foi usada.'}
        </div>
      ) : (
        d.rows.map((c) => <LuCursoCard key={c.id} c={c} onAcao={onAcao} />)
      )}
    </>
  );
}

const LU_CURSO_MOTIVO: Record<string, string> = {
  sem_fonte: 'nada parecido no acervo',
  guard_reprovou: 'o guard barrou a resposta',
  guard_indisponivel: 'guard fora do ar (barra por segurança)',
  geracao_falhou: 'falha ao gerar',
  geracao_vazia: 'o modelo voltou vazio',
  embed_falhou: 'falha ao interpretar a pergunta',
  busca_falhou: 'falha na busca',
  teto: 'teto de custo do dia',
};

function LuCursoCard({
  c,
  onAcao,
}: {
  c: LuCursoRow;
  onAcao: (
    a: 'lu_curso_corrigir' | 'lu_curso_ensinar' | 'lu_curso_ok' | 'lu_curso_ao_app',
    id: string,
    resposta?: string,
    pergunta?: string,
  ) => Promise<boolean>;
}) {
  const abst = c.rota === 'abstencao';
  const doApp = c.fonte_topo === 'app';
  const [editando, setEditando] = useState(false);
  // Corrigir começa do texto que saiu — quase sempre o conserto é um ajuste, não
  // uma reescrita. Ensinar começa vazio: não havia resposta nenhuma.
  const [texto, setTexto] = useState(abst ? '' : c.resposta);
  const [chave, setChave] = useState(c.pergunta);
  const [salvando, setSalvando] = useState(false);
  // "levar ao app" é outro destino, não outro botão de salvar: por isso o modo
  // é próprio e a confirmação é explícita.
  const [aoApp, setAoApp] = useState(false);

  const selo = abst ? '⚠️' : doApp ? '📘' : '📗';
  const acervo = doApp ? 'acervo do app' : 'acervo do curso';
  const quando = new Date(c.created_at).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', // dia BR, nunca UTC — regra da casa
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    const ok = await onAcao(
      aoApp ? 'lu_curso_ao_app' : abst ? 'lu_curso_ensinar' : 'lu_curso_corrigir',
      c.id,
      texto.trim(),
      chave.trim(),
    );
    setSalvando(false);
    if (ok) {
      setEditando(false);
      setAoApp(false);
    }
  };

  return (
    <div className={`pdqfb-rcard lu-curso${c.revisada_em ? ' revisada' : ''}`}>
      {/* mesma anatomia dos outros cards do painel: tarja de contexto, pergunta
          em serifa, resposta em bloco recuado, ações no rodapé */}
      <div className="rhead">
        <span className="tier">
          {selo} {abst ? 'não soube' : acervo}
        </span>
        {c.score_topo != null ? <span>proximidade {c.score_topo.toFixed(2)}</span> : null}
        {c.revisada_em ? <span>✓ revisada</span> : null}
        <span className="rdata">{quando}</span>
      </div>

      <div className="rperg">{c.pergunta}</div>
      <div className="rresp">{c.resposta}</div>

      <div className="pdqfb-note" style={{ marginTop: 10 }}>
        {abst
          ? `não respondeu — ${LU_CURSO_MOTIVO[(c.motivo ?? '').split(':')[0]] ?? c.motivo ?? 'motivo não registrado'}`
          : c.rota === 'verbatim'
            ? `resposta curada, entregue como está (${acervo})`
            : `gerada e aprovada pelo guard (${acervo})`}
      </div>

      {/* O que o guard barrou: a aluna não viu, mas é o que explica a abstenção. */}
      {c.resposta_barrada ? (
        <details className="lu-bastidores">
          <summary>
            <span className="lu-onde">barrado pelo guard</span> ver o texto que a aluna não recebeu
          </summary>
          <div className="lu-tent">
            <div className="lu-tent-gen">{c.resposta_barrada}</div>
          </div>
        </details>
      ) : null}

      {editando ? (
        <div className="promform">
          <div>
            <div className="hint">Pergunta que a Lu vai reconhecer</div>
            <input className="pi" value={chave} onChange={(e) => setChave(e.target.value)} />
            <div className="lu-bast-nota" style={{ marginTop: 4 }}>
              a redação da aluna costuma ser a melhor chave — mude só se estiver confusa
            </div>
          </div>
          <div>
            <div className="hint">Resposta que a aluna do CURSO deve receber</div>
            <textarea
              className="pi"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              style={{ minHeight: 320, lineHeight: 1.55 }}
            />
          </div>
          <div className="lu-tent-motivo" style={aoApp ? { background: '#FFF4E5', borderColor: '#E8C48A' } : undefined}>
            {aoApp
              ? '📲 VAI PARA O APP TAMBÉM — como PROPOSTA pendente, não como verdade. A aluna do app NÃO recebe nada até você aprovar em "Lu · Propostas". O curso não é alterado por este botão.'
              : doApp && !abst
                ? '📘 Esta resposta veio do acervo do APP. Salvar cria uma versão-curso: a Lu do curso passa a usar a sua, e a Lu do app continua com a original, intacta.'
                : abst
                  ? '⚠️ Vira resposta nova no acervo do CURSO. Só o curso passa a saber respondê-la.'
                  : '📗 Edita a entrada do acervo do CURSO. O app não é afetado.'}
          </div>
          <div className="racoes">
            <button className="b pink" onClick={salvar} disabled={salvando || !texto.trim()}>
              {salvando ? 'Salvando…' : aoApp ? 'Enviar como proposta ao app' : 'Salvar para o curso'}
            </button>
            <button
              className="b"
              onClick={() => setAoApp((v) => !v)}
              disabled={salvando}
              title="Quando a correção vale para as duas Lus, não só para o curso"
            >
              {aoApp ? '↩︎ Voltar a salvar só no curso' : '📲 Levar ao app também'}
            </button>
            <button className="b" onClick={() => { setEditando(false); setAoApp(false); }} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="racoes">
          <button className="b pink" onClick={() => setEditando(true)}>
            {abst ? 'Ensinar a resposta' : doApp ? 'Corrigir para o curso' : 'Corrigir'}
          </button>
          {/* Sem isto, levar ao app exigia entrar em "Corrigir" — e quem quer
              propor uma resposta que já está BOA não tem nada a corrigir. Abre a
              tela já no modo ao-app: o dono confere o texto exato antes de enviar,
              porque este é o único botão cuja consequência sai do curso. */}
          {!abst ? (
            <button
              className="b"
              onClick={() => {
                setTexto(c.resposta);
                setAoApp(true);
                setEditando(true);
              }}
              title="Propor esta resposta também para a Lu do app (entra como pendente)"
            >
              📲 Levar ao app
            </button>
          ) : null}
          {!c.revisada_em ? (
            <button className="b ok" onClick={() => onAcao('lu_curso_ok', c.id)}>
              Está boa
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
