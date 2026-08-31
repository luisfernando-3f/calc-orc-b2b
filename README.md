# Calculadora de Previsão de Resultados — SEED

Ferramenta comercial da **SEED** (marketing de performance para o agro, BU da 3F Venture),
usada **ao vivo na call de vendas**: o vendedor preenche os dados do cliente, a calculadora
projeta resultado e investimento por cenário, e exporta um PDF para encaminhar ao cliente.

App Next.js irmão do `dre-control`, com o **Design System grafite 3F**.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`.

## Estrutura

```
app/
  layout.tsx              cabeçalho 3F/SEED (grafite)
  page.tsx                → <Calculadora />
  globals.css             tokens do DS 3F + cenários + estilos de impressão
  components/
    Calculadora.tsx       orquestrador: estado, seções, export
    ui.tsx                Card, Field, NumberInput, TextInput, PillTabs
    Funnel.tsx            "meio funil" tingido pelo cenário
    Snowball.tsx          gráfico (Recharts) + tabela mês a mês
    PrintReport.tsx       documento print-only (PDF)
lib/
  types.ts                tipos centrais
  benchmarks.ts           CPL por nicho, faixas de conversão (dados de negócio)
  engine.ts               motor de cálculo puro (forward/reverse/payback/bola de neve)
  format.ts               formatação pt-BR
```

## Regras de negócio

Toda a lógica (funil, cenários, dois modos de cálculo, ciclo em dias, bola de neve,
payback, campos zerados por padrão, validação do PDF) está documentada em
[`CONTEXT.md`](./CONTEXT.md). **Leia a seção correspondente antes de alterar um número
ou fórmula** — quase tudo ali é decisão de negócio, não escolha técnica.
