# CONTEXT.md — Calculadora de Previsão de Resultados (SEED)

Este documento existe para que qualquer pessoa (ou o Claude Code) que mexer neste projeto entenda **por que** o código funciona do jeito que funciona — muita coisa aqui é decisão de negócio, não escolha técnica arbitrária. Antes de "corrigir" um número ou uma fórmula, leia esta seção correspondente.

## 0. Atualização — migração do protótipo (chat) para o Code

O protótipo original era um HTML único (`calculadora_seed_2.html`, com Chart.js via CDN e paleta agro própria), construído no chat do claude.ai. Ele foi **reestruturado como app Next.js** aqui no "Code App", irmão do `dre-control`, mantendo **100% da lógica de negócio** descrita nas seções abaixo. Mudou só a embalagem:

- **Stack:** Next.js 16 + React 19 + Tailwind v4 + Recharts (mesmo do `dre-control`). Roda com `npm run dev` (porta 3000). Motor de cálculo puro e tipado em `lib/engine.ts`; dados de benchmark em `lib/benchmarks.ts`; formatação em `lib/format.ts`; UI componentizada em `app/components/`.
- **Design System:** decisão do usuário de **abandonar a identidade agro** (verde/dourado/areia, Fraunces) e **aplicar o DS grafite 3F** do `dre-control` — paleta grafite + fonte *Mozilla Text*, para a calculadora ficar visualmente irmã do Controle Orçamentário. Os cenários foram mapeados nos faróis 3F: **Pessimista = vermelho (`--neg`)**, **Realista = grafite (`--brand`)**, **Otimista = verde (`--pos`)**. A seção 11 abaixo descreve a identidade agro **original** — mantida como registro histórico, mas **não** é mais a identidade vigente. O conceito de "meio funil" (§11) foi preservado, apenas re-tingido pela cor do cenário ativo.
- **Chart:** Chart.js (CDN) → Recharts (`app/components/Snowball.tsx`), consistente com o `dre-control`.
- **Export PDF:** mesma abordagem `window.print()` + view print-only (`app/components/PrintReport.tsx`), sem dependência externa (mantém o espírito da §10).

## 1. O que é este projeto

Ferramenta HTML de página única (`calculadora_seed.html`) para o time comercial da SEED — agência de marketing de performance para empresas do agro — usar **ao vivo, durante a call de vendas**. O vendedor preenche dados do cliente, a calculadora projeta resultado e investimento necessário, e exporta um PDF pra encaminhar ao cliente ao final da reunião.

Existe também uma versão em Excel equivalente (`Calculadora_Previsao_Resultados_SEED.xlsx`), construída antes do HTML, com as mesmas fórmulas. Ela serve de referência cruzada — se uma mudança de lógica no HTML gerar um número diferente do Excel para os mesmos inputs, uma das duas está errada.

## 2. Modelo de funil

O funil de vendas do **cliente da SEED** (não da SEED em si) tem 5 etapas fixas:

```
Leads → Leads Atendidos → Visitas → Propostas → Vendas
```

Cada seta tem uma taxa de conversão. Essas taxas **não vêm de dado histórico medido em CRM** — a SEED ainda não tem esse histórico. Vêm da percepção empírica do time comercial da SEED, repassada em conversa, com as seguintes faixas:

| Etapa | Faixa | Sugestão (ponto médio) |
|---|---|---|
| Lead → Atendido | 30% – 50% | 40% |
| Atendido → Visita | 30% – 50% | 40% |
| Visita → Proposta | 50% – 80% | 65% |
| Proposta → Venda | 25% – 50% | 37,5% |

Essas faixas estão hardcoded em `RATE_BOUNDS` no JS. **Se o time comercial revisar essas faixas, é só atualizar esse objeto** — todo o resto (cenários, tabela de sensibilidade, bola de neve) se recalcula sozinho.

O vendedor digita o valor "real" de cada taxa na call (campo numérico, não mais slider — isso foi um ajuste explícito, ver seção 6). Esse valor digitado é o que o app trata como cenário **Realista**.

## 3. CPL por Nicho — de onde vem

O CPL médio por Nicho é benchmark real, calculado a partir da planilha `Perfis_Clientes_Seed_por_Nicho.xlsx` (aba "Base de Clientes"), com **46 clientes reais** (a linha `EX-001` é exemplo da planilha e foi excluída).

Regra importante: **18 dos 46 clientes tinham CPL = 0,00**, o que foi interpretado como dado faltante (campo não preenchido), não como "CPL zero de verdade". A média por Nicho abaixo foi calculada **excluindo esses 18 registros**:

| Nicho | CPL Médio (R$) | Base (clientes com dado) |
|---|---|---|
| Nutrição Animal | 14,35 | 5 de 9 |
| Nutrição Vegetal | 12,95 | 9 de 15 |
| Softwares | 15,00 | 1 de 2 |
| Serviços | 49,63 | 5 de 7 |
| Financeiro | 65,22 | 1 de 2 |
| Máquinas e Equipamentos | 36,64 | 7 de 11 |

Esses valores estão hardcoded em `CPL_BENCHMARK` no JS. Se a carteira de clientes crescer e uma nova análise for feita, é só atualizar os números ali — **mas repetir a mesma regra de excluir CPL=0 como dado faltante**, ou os números ficam artificialmente baixos.

Nichos com amostra pequena (1-2 clientes, como Financeiro e Softwares) são benchmarks fracos — vale um aviso verbal do vendedor ao usar esses nichos numa call.

## 4. Dois modos de cálculo

### Modo "Por investimento" (forward)
Cliente já sabe quanto quer investir por mês. Fluxo: `Investimento ÷ CPL → Leads → ... → Vendas → Receita`.

### Modo "Por meta de faturamento" (reverse)
Cliente parte de uma meta de faturamento. **Importante — isso mudou depois da primeira versão**: o campo "Meta" é um valor **total**, não mensal, e existe um campo de **prazo** (em meses, reaproveita o campo que também é "duração do contrato" no modo Investimento). A conta é:

```
metaMensal = Meta total ÷ Prazo (meses)
```

E só então essa `metaMensal` é revertida pelo funil (Vendas → Propostas → Visitas → Atendidos → Leads → Investimento necessário/mês). **Nunca reverta a Meta total direto pelo funil sem dividir pelo prazo primeiro** — foi um bug da primeira versão, corrigido.

O campo de prazo tem rótulo dinâmico: "Duração do contrato SEED (meses)" no modo Investimento, "Em quantos meses o cliente quer bater essa meta" no modo Meta. É o **mesmo campo de estado** (`state.duracao`) nos dois modos — decisão deliberada para não duplicar input, já que ele também define a duração da simulação na bola de neve (seção 5).

## 5. "Efeito bola de neve" — projeção mês a mês

A SEED vende projetos de 6 meses. Esta seção do app existe pra mostrar que **o retorno continua entrando depois que o contrato termina**, porque leads gerados perto do fim do contrato ainda levam o ciclo de venda inteiro pra fechar.

Mecânica: investimento mensal constante durante `duracao` meses. Leads gerados no mês `t` fecham como venda no mês `t + lag`, onde `lag` é o ciclo de venda em meses, arredondado pro inteiro mais próximo. A tabela roda até `duracao + lag + 1` meses (limitado a 30), acumulando investimento e receita mês a mês, até encontrar o mês de payback (primeiro mês em que receita acumulada ≥ investimento acumulado).

Esse motor (`buildSnowball`) é o mesmo nos dois modos — no modo Meta, ele recebe o `investimento necessário/mês` já calculado (resultado do modo reverse) como se fosse o investimento constante do modo forward.

## 6. Ciclo de venda — dias, não meses

Ajuste explícito do cliente: o campo que o vendedor preenche é **em dias** (`state.cicloDias`), porque é como o setor fala naturalmente ("nosso ciclo é de 60 dias"). Internamente, todo o motor de cálculo trabalha em meses — a conversão é `cicloMeses = cicloDias / 30`, feita pela função `cicloMeses()`. Isso é uma simplificação assumida (mês = 30 dias, arredondamento pro inteiro mais próximo na tabela mensal) e está documentada em texto dentro do próprio app (footnote da seção bola de neve).

**Não exponha esse campo de volta em meses na interface** — o pedido explícito foi que o vendedor só veja e digite dias.

## 7. Cenários (Pessimista / Realista / Otimista)

Isso é uma camada que se aplica em cima de qualquer um dos dois modos.

- **Realista** = as 4 taxas de conversão que o vendedor digitou na call (`state.rates`).
- **Pessimista / Otimista** = **−20% / +20%** aplicados **apenas** em `atendido` (Lead → Atendido) e `visita` (Atendido → Visita); `proposta` (Visita → Proposta) e `venda` (Proposta → Venda) ficam **iguais ao Realista**.

Travado em 0–100%. `SCENARIO_SPREAD = 0.2` em `lib/benchmarks.ts` (função `getActiveRates`, fonte única usada em funil, cards, tabela de sensibilidade e bola de neve). **Duas mudanças pedidas pelo usuário**, em sequência: (1) trocar os extremos fixos `min`/`max` da faixa de mercado por ±20% em torno do Realista; (2) restringir esse ±20% às duas primeiras conversões (topo de funil), mantendo as duas últimas iguais ao Realista. As faixas `min`/`max` da config (`rateBounds`) hoje só alimentam o hint "sugestão: X–Y%" e o botão "Usar sugestões" do campo Realista, não mais os cenários.

A aba/seletor de cenário ativo controla o funil visual, os cards de resultado e a bola de neve inteira — tudo re-renderiza junto.

## 8. Fórmula de payback (simplificação documentada)

```
payback (meses) = cicloMeses + (investimentoMensal × cicloMeses) ÷ receitaMensal
```

Lógica: tempo até a primeira leva de vendas fechar (`cicloMeses`), mais quantos meses de receita em regime são necessários pra cobrir o que foi investido durante essa espera (`investimentoMensal × cicloMeses`, dividido pela receita mensal em regime). É uma aproximação de primeira ordem, não um modelo de fluxo de caixa completo — está documentada como tal na aba "Como usar" da versão Excel e nas notas de rodapé do HTML.

## 9. Campos zerados por padrão

Ajuste explícito: nenhum campo que o vendedor preenche (Investimento, Meta, Ticket Médio, Ciclo de Venda em dias, as 4 taxas) começa com valor de exemplo pré-preenchido. Todos começam em `0`, e o Nicho começa sem seleção ("Selecione o nicho..."). Isso evita que um número de exemplo seja apresentado por engano a um cliente real sem ter sido substituído.

Por causa disso, `exportPDF()` tem uma validação mais completa que verifica se nicho, investimento/meta, ciclo e as 4 taxas foram preenchidos antes de gerar o PDF — se não, mostra um alerta listando o que falta, em vez de gerar um PDF com zeros.

## 10. Exportação de PDF

Não usa biblioteca externa (nada de jsPDF/html2canvas) — é `window.print()` com uma seção `#print-view` escondida (`display:none` fora de mídia de impressão) que é populada dinamicamente em `exportPDF()` e só fica visível via regra `@media print`. O vendedor clica em "Baixar PDF", o navegador abre o diálogo de impressão, e ele escolhe "Salvar como PDF". É deliberadamente simples e sem dependência externa — mais confiável dentro de um arquivo HTML único do que renderização via canvas.

## 11. Identidade visual (para manter consistência em ajustes de layout)

- **Paleta**: verde-floresta profundo como cor primária (`--primary:#1F4D36`), dourado trigo como destaque (`--accent:#C89B3C`), fundo areia/papel (`--bg:#F5F2E7`). Cores semânticas dos cenários: pessimista = vermelho tijolo (`--pess:#A3372E`), realista = o próprio verde primário, otimista = dourado escuro (`--otim:#8A6D1E`).
- **Tipografia**: Fraunces (serifada, para títulos/headlines — remete a colheita/agro), Inter (corpo/UI), IBM Plex Mono (números e dados — funis, tabelas, valores monetários). As três vêm do Google Fonts.
- **Conceito de assinatura visual — "meio funil"**: o funil de conversão é renderizado como um bloco centralizado na tela, mas cada barra é alinhada à esquerda e afina para a direita conforme o valor cai (Leads → Vendas) — não é um funil simétrico centralizado, é a metade dele. Foi um ajuste explícito pedido depois da primeira versão (que tinha barras centralizadas individualmente).
- Evitar o "visual genérico de IA": não usar o combo creme + terracota (`#D97757`) nem fundo quase-preto com verde-ácido — foram descartados deliberadamente na primeira versão em favor da paleta agro acima.

## 12. Pontos em aberto / cuidado ao mexer

- **Números de exemplo geram ROI irreal (~21x)** quando testados com valores de exemplo antigos (Investimento R$15k, Ticket R$8k, Nutrição Animal). Isso não é bug de fórmula — é sinal de que CPL baixo (amostra pequena, R$14,35) combinado com ticket alto de exemplo produz ROI inflado. Recomendação pendente: calibrar com 2-3 casos reais fechados antes de confiar cegamente no número em call.
- **Arredondamento do ciclo de venda** para mês inteiro na tabela de bola de neve é uma simplificação deliberada — não tentar "consertar" isso com lógica fracionária de mês sem entender que isso complica a leitura da tabela pro vendedor em call.
- **Ajustes de layout** são a próxima frente de trabalho — este documento cobre lógica de negócio e cálculo, não decisões de layout que ainda serão feitas.

## 13. Prestação SEED — precificação a partir do saldo acumulado

Botão "Aplicar valor para prestação Seed" ao final da seção bola de neve. Calcula quanto a SEED deve cobrar do cliente (contrato de **6 meses**), a partir do **saldo acumulado no mês 6** do cenário atualmente selecionado (`saldoMes6` / `computePrestacao` em `lib/engine.ts`; constantes em `PRESTACAO` em `lib/benchmarks.ts`).

Regra em três faixas, sobre `base = max(0, saldo acumulado no mês 6)`:

| Situação | Fórmula | Faixa |
|---|---|---|
| `10% × base` fica **abaixo** de R$24.000 | prestação = **R$24.000** (piso, "mínimo viável") | `minimo` |
| `10% × base` entre R$24.000 e R$30.000 | prestação = **10% × base** | `ideal` |
| `10% × base` **ultrapassa** R$30.000 | prestação = **6% × base** (recalcula tudo com % reduzido sobre a base inteira) | `reduzido` |

- **Piso** R$24.000 = R$4.000/mês × 6. **Teto de referência** R$30.000 = R$5.000/mês × 6. **MRR exibido** = prestação ÷ 6.
- Decisões travadas com o usuário: base = saldo do **mês 6** (não o fim de toda a cauda da bola de neve); % ideal = **10%** (topo da faixa 8–10%); acima de R$30k = **% reduzido fixo sobre a base inteira**.
- **Prestação embutida na bola de neve:** ao aplicar, a tabela ganha uma coluna **Prestação SEED** (= MRR = `fee/mesesBase`, cobrada nos meses 1..`duracao`) e o custo entra no **investido acumulado** (mídia + prestação), recalculando **saldo acumulado** e o **mês de payback** (`withPrestacao` em `engine.ts` → `SnowballFee`). A **receita acumulada não muda** (é receita de vendas). Importante: o **preço** (base = saldo mês 6) é calculado sobre o saldo **só-mídia**, ANTES de embutir a taxa — senão vira referência circular; só a *exibição* da tabela desconta a prestação. O PDF (`PrintReport`) usa a mesma tabela com o custo embutido + nota explicativa.
- ⚠ **A confirmar com o comercial:** o valor exato do % reduzido (implementado como **6%**, era exemplo) e o comportamento na fronteira de R$30k (com 6% sobre a base inteira, deals logo acima do gatilho podem cair abaixo de R$30k — na prática deals grandes ficam bem acima). Tudo em `PRESTACAO`, fácil de ajustar.

## 14. Login, papéis e persistência

A partir desta versão a plataforma tem **login e persistência** (padrão do dre-control: sem banco, arquivos JSON em `data/`, gitignored).

- **Auth:** cookie httpOnly assinado (HMAC-SHA256, Web Crypto — roda no middleware `proxy.ts` e em route handlers). Sessão em `lib/auth/session.ts`; usuários em `lib/auth/users.ts`; helper server `lib/auth/server.ts` (`getSession`). Segredo em `AUTH_SECRET` (fallback de dev). Dois usuários fixos: `luisfernando@3fventure.com.br` (admin) e `juliano@3fventure.com.br` (vendedor), senha `1234`. ⚠ **Senha em texto plano e "1234" servem só para uso interno; migrar para hash + env em produção.** `proxy.ts` protege tudo, manda não-logado para `/login` e bloqueia `/admin` para não-admin; as rotas de API revalidam a sessão por conta própria.
- **Config editável (banco de dados):** os antes-hardcoded (nichos/CPL, faixas de conversão, regra da prestação) viraram `AppConfig`, persistido em `data/config.json` (`lib/store.ts`; seed = `DEFAULT_CONFIG` em `lib/benchmarks.ts`). O admin edita no console `/admin/ponto-de-partida` (`ConfigEditor.tsx`, PUT `/api/config`, admin-only). A calculadora recebe a config por prop do server component (`app/(main)/page.tsx` → `getConfig()`), então `engine.ts`/`getActiveRates`/`computePrestacao` recebem `rateBounds`/`prestacao` como **parâmetro** (não importam mais constante).
- **Histórico:** cada PDF exportado grava um `SimulationRecord` (estado completo p/ reabrir + resumo) em `data/simulations.json` via POST `/api/simulations` (o vendedor é derivado da sessão, nunca do cliente). Salva **só ao exportar** (decisão do usuário). Vendedor vê as próprias em `/historico`; admin vê todas em `/admin/historico` (`HistoricoTable`, coluna Vendedor). "Reabrir" = `/?sim=<id>` → o server hidrata o estado inicial (com escopo de permissão) → editar e re-exportar.
- **Estrutura de rotas + shell:** o sistema inteiro usa **uma barra lateral única** (`components/Sidebar.tsx`, client, ativa via `usePathname`), aplicada tanto em `app/(main)/layout.tsx` quanto em `app/admin/layout.tsx` (ambos: `flex` + `<Sidebar role nome/>` + conteúdo). Layout raiz só carrega html/body/fontes; `app/login` fica fora do shell. Itens do sidebar por papel (`navFor`): vendedor = **Calculadora de Retorno** (`/`), **Cases e Projetos** (`/cases`, placeholder "em breve" — evoluir depois), **Histórico** (`/historico`); admin = Calculadora de Retorno + Cases e Projetos + seção **Administração** (Ponto de partida, Histórico geral). Logout e nome no rodapé do sidebar. O shell é de altura de tela (`h-screen overflow-hidden`): **a sidebar fica fixa e só a área de conteúdo rola** (`flex-1 overflow-y-auto`). A sidebar é **colapsável** (botão de seta «/» no fim dela → trilho de ícones de 64px); o estado fica em `useState` e **não persiste** — sempre abre expandida ao carregar.
- **Impressão:** `globals.css` esconde tudo (`body * { visibility:hidden }`) e mostra só `.print-only` (o `PrintReport`) no `@media print`, então o sidebar e a calculadora on-screen não entram no PDF.
- **Passo 3 fundido:** taxas de conversão + cenário + funil + cards de resultado ficam **no mesmo quadro** (`Calculadora.tsx`, grid `lg:grid-cols-2` — taxas à esquerda empilhadas, cenário/funil/resultado à direita), atualizando ao vivo. Passos renumerados (1 dados, 2 ponto de partida, 3 taxas+resultado, 4 sensibilidade, 5 bola de neve, 6 observações).
- **Tabela Consultiva:** item de sidebar `/consultiva` (todos os papéis) — apresentação **read-only** dos nichos (Nicho · CPL médio · Leads por venda), versão não-editável do admin (`app/(main)/consultiva/page.tsx`, lê `getConfig()`). Para isso, `NichoBenchmark` ganhou o campo **`leadsPorVenda: string`** (texto livre, ex.: "80-120"), editável no admin (`ConfigEditor` coluna "Leads / venda") e default `""`; `store.getConfig` normaliza nichos antigos sem o campo.
- **Campanhas de desconto (admin):** módulo em `/admin/campanhas` (`CampaignsManager` + `data/campaigns.json`, API `GET/PUT /api/campaigns` admin-only, store `getCampaigns`/`saveCampaigns`/`getActiveCampaignsFor`). Cada `Campaign` (ver types) é **totalmente configurada pelo admin**: alvo (todos / vendedores selecionados), **critério de encaixe** (`minimo` = prestação na faixa mínimo viável · `todos` · `nicho` · `faixa` de valor), **desconto** (`piso` = novo mínimo viável · `percentual` · `fixo`), e `ativa`. Lógica pura em `lib/campaigns.ts` (`matchCampaign` só retorna se gerar desconto real, `novaFee < fee`). Na calculadora (`app/(main)/page.tsx` passa as campanhas ativas do vendedor): quando a simulação está completa e o cliente se encaixa, aparece uma **notificação** ("Condição especial"); ao aplicar a prestação surge, ao lado de "Ocultar prestação", o botão **"Aplicar desconto: <campanha>"** → risca a prestação original e mostra a nova (`feeEfetiva`/`mrrEfetiva`), que flui para a bola de neve, formas de pagamento, PDF e histórico. Preço-base da prestação continua sendo o saldo só-mídia (sem circularidade); o desconto incide sobre o `fee` calculado.
- **Formas de pagamento:** `lib/pagamentos.ts` (`PAGAMENTOS` + `calcPagamentos`) — política fixa: Pix à vista **15%**, cartão à vista **10%**, 6x sem juros **integral**, sobre o pacote semestral (a prestação vigente, já com desconto de campanha se houver). Bloco `PagamentosBlock` abaixo do card da prestação + seção equivalente no PDF (`PrintReport`).
- **Notas (painel lateral):** as antigas "Observações acordadas com o cliente" viraram um painel **"Notas"** flutuante e fixo na direita (`NotasPanel`, `position: fixed`, acompanha o scroll, colapsável → aba vertical na borda), para o vendedor anotar a qualquer momento. Estado de aberto/fechado na `Calculadora` (`notasAbertas`), que recua o conteúdo (`xl:pr-[340px]`) quando aberto para não sobrepor. O conteúdo continua sendo o mesmo `observacoes` que vai para o PDF (seção "Observações acordadas com o cliente" no `PrintReport`).
- **Ajustes de UI (ações + alerta de campanha):** os botões **Restaurar padrões / Baixar PDF** saíram da barra sticky e ficam **ao final da calculadora** (bloco com divisória no fim do conteúdo, `no-print`). O alerta de condição especial deixou de ser banner no topo e virou um **popup chamativo abaixo da tabela da bola de neve** (`campaignMatch && !descontoAtivo`) — caixa verde com badge pulsante (`animate-ping`), valor antes→depois e CTA **"Aplicar condição especial"** (`aplicarCondicaoEspecial` = aplica prestação + desconto de uma vez). O botão redundante "Aplicar desconto" ao lado de "Ocultar prestação" foi removido; sobrou só "Remover desconto" (quando o desconto está ativo).
- **Refino do bloco de prestação:** ordem agora é card "Prestação SEED sugerida" → **popup de condição especial (abaixo do card)** → **Formas de pagamento colapsáveis** (`PagamentosBlock` com toggle "ver condições/ocultar", fechado por padrão — o vendedor abre para ver as 3 condições). O popup só renderiza com `prestacaoAplicada` (está dentro do bloco) e `campaignMatch && !descontoAtivo`.
- **Auto-save no histórico (rascunho):** o registro é criado/atualizado assim que o **Ponto de partida** está preenchido (`pontoPartidaCompleto` = nicho + investimento/meta + ticket + ciclo), via auto-save com debounce (~1,2s) em `Calculadora`. É **upsert** (POST `/api/simulations` com `id`): a MESMA simulação é atualizada, não duplicada (`simIdRef`, resetado em "Restaurar padrões" e vindo do `initialSim` ao reabrir). `SimulationRecord.exportado` (false=rascunho, true=PDF gerado) é **pegajoso** (uma vez true, auto-saves seguintes não revertem) + `updatedAt` (ordena o histórico). `HistoricoTable` mostra badge Rascunho/Exportado; legado sem o campo conta como Exportado. `upsertSimulation` no store substituiu `addSimulation`.
- **Modo Proposta (tela de negociação):** botão **"Gerar proposta"** (substitui "Aplicar valor para prestação Seed") calcula a prestação + salva + abre `/proposta/<id>` em nova aba — tela **client-facing** limpa (sem sidebar, fora do `(main)`): resultado projetado, retorno acumulado (gráfico+tabela da bola de neve), funil, e a oferta (prestação com/sem desconto + formas de pagamento). Server component recomputa tudo do `state` salvo + config; `PropostaView` (client) renderiza. `SimulationSummary.descontoCampanha` guarda o nome da campanha para a proposta. Botão "Baixar PDF" = `window.print()` da própria tela. Acesso: dono ou admin. Base para futuro link compartilhável ao cliente.
- **Comparador de investimento:** card (só no modo investimento) com 3 níveis — atual, ×1,5 e ×2 — mostrando Vendas/mês, Receita/mês, ROI e Payback lado a lado, para a conversa de "quanto investir" (`ComparadorInvestimento` em `Calculadora.tsx`). ROI/payback são constantes (modelo linear); o que escala é o volume absoluto (vendas/receita).
- **Link compartilhável da proposta:** o vendedor clica em **"Copiar link do cliente"** na proposta (`/proposta/<id>`) → `POST /api/share` gera (sob demanda, uma vez) um `shareToken` no registro e devolve; o link é `origin/p/<token>`. A rota **pública** `/p/[token]` (server, sem login — liberada no `proxy.ts`) busca por token (`getSimulationByToken`) e renderiza o mesmo `PropostaView` **sem** o botão de compartilhar (só o cliente vê Baixar PDF). Recompute compartilhado em `lib/proposta.ts` (`computePropostaData`), usado pelas duas rotas. O `shareToken` é preservado nos auto-saves (o upsert em `/api/simulations` carrega `owned?.shareToken`), então o link do cliente não quebra. Token = UUID sem hífens (não enumerável); link é "não listado" (quem tiver o link vê a proposta) — sem expiração/revogação por enquanto.
- **Comparador — ajuste:** os cards mostram só **Vendas/mês** e **Receita/mês** (que escalam); ROI e payback (constantes no modelo linear) saíram dos cards e viraram **uma nota única** abaixo ("retorno proporcional ao investimento: ROI Xx e payback Y em todos os níveis").
- **Gestão de usuários (admin) + senhas com hash:** os usuários saíram do código fixo e vivem em `data/users.json` (gitignored), com **senhas em hash PBKDF2-SHA256** (`lib/auth/hash.ts`, sem dependência). `lib/auth/users.ts` guarda só tipos + `DEFAULT_USERS` (seed); `lib/auth/users-store.ts` (server) faz seed/CRUD/`findUser` (agora async, verifica hash). Na 1ª leitura, semeia luisfernando(admin)+juliano(vendedor) com "1234" já em hash. Admin gerencia em **`/admin/usuarios`** (sidebar "Vendedores", `UserManager` + `GET/POST/PUT/DELETE /api/users`, admin-only): criar vendedor/admin, editar nome/perfil, redefinir senha, excluir. Guardas: e-mail único (409), não excluir a si mesmo, não excluir/rebaixar o último admin. Login (`/api/auth/login`) e a página de campanhas passaram a usar o store (async). **Isso resolve o item "senha em texto plano antes de produção"** — só falta `AUTH_SECRET` forte no deploy.
- **Painel (dashboard):** item de sidebar **"Painel"** (1º item; vendedor → `/painel`, admin → `/admin` — que deixou de redirecionar). Agregações em `lib/dashboard.ts` (`computeDash`/`computePorVendedor`) a partir do histórico; `DashboardView` (client) mostra KPIs (simulações, propostas geradas = com prestação, valor proposto = soma das prestações, ticket médio, exportadas, ROI médio; admin ainda: vendedores e campanhas ativas) + "Propostas por nicho" (barras HTML, não Recharts — o BarChart horizontal do Recharts 3 renderizava com largura 0) + "Desempenho por vendedor" (só admin: simulações/propostas/valor por vendedor). Vendedor vê só o próprio; admin vê todos.

## 15. Melhorias pré-deploy (batch de 7 itens)

1. **Framing do ROI na proposta:** cards reordenados (Receita → **Payback** → ROI), ROI relabelado para "Retorno projetado (por R$ 1 investido)" + ressalva de estimativa — evita o ROI alto soar "bom demais" para o cliente.
2. **Aviso de senha padrão + AUTH_SECRET:** `StoredUser.senhaPadrao` (true no seed, limpo ao trocar senha); badge "senha padrão" em Vendedores e banner no painel admin; banner também se `process.env.AUTH_SECRET` ausente.
3. **Concorrência de dados:** `lib/lock.ts` (`withLock` — fila de promessas por chave) serializa os read-modify-write (`upsertSimulation`, mutações de usuários) — evita um auto-save sobrescrever outro.
4. **Status do negócio:** `SimulationRecord.status` (aberta/ganho/perdido), `StatusSelect` no histórico (PATCH `/api/simulations`), preservado nos auto-saves. Dashboard ganhou Ganhos, Valor ganho, Conversão (e por vendedor).
5. **Rastrear abertura do link:** beacon `POST /api/share/view` (público, no proxy) na visão pública → `shareViews`/`shareLastViewedAt`; mostrado na proposta interna ("aberto N× · última DD/MM").
6. **Validade + revogar link:** `shareExpiresAt` (30 dias) na geração; rota pública mostra "proposta expirada" se vencido; botão "Revogar link" (DELETE `/api/share`) → o link vira 404.
7. **Defaults por nicho:** `NichoBenchmark.ticketPadrao`/`cicloPadrao` (editáveis no admin); ao escolher o nicho na calculadora, pré-preenche ticket/ciclo se estiverem vazios → projeção instantânea.

## 16. Cases e Projetos (prova social)

A partir dos debriefings da operação (relatórios por cliente: ROAS, faturamento, CPL, CAC, vendas, ticket, etc.), o admin cria **cases curados** — os relatórios crus têm ruído interno (errata, taxa de quebra) que NÃO vai para o cliente.

- **Modelo:** `Case` (types.ts) — nicho, `apelido` (referência interna, **não exibida**), periodo, destaque, métricas opcionais (roas/faturamento/vendas/ticketMedio/cpl/cac/investimento), publicado. Persistido em `data/cases.json` (`getCases`/`saveCases`/`getPublishedCases`).
- **Admin:** `/admin/cases` (`CaseManager`, `/api/cases` GET/PUT admin-only) — CRUD com publicar/rascunho. Item de sidebar "Cases" na Administração.
- **Vendedor:** `/cases` (antes placeholder) — `CasesShowcase`: cards **anonimizados** ("Cliente de <nicho>"), **filtráveis por nicho** (decisão do usuário), com métricas + destaque. Prova social relevante ao prospect na call.
- **Calibração (decisão do usuário):** `lib/cases.ts` `cplRealPorNicho` calcula o CPL real médio dos cases publicados por nicho; no editor `Ponto de partida`, cada nicho mostra "real: R$X (n) ↑" com clique para **aplicar** o CPL real ao benchmark — fecha o loop de dados sem sobrescrever nada automaticamente (o admin decide e salva).
- **Roadmap:** import assistido do relatório (extrair/pré-preencher) fica para v2 — formatos variam demais. Link compartilhável do case (como a proposta) é um próximo passo natural.
