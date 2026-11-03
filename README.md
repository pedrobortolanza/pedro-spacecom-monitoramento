# Detecção de Encontros - Pedro Bortolanza

Solução em TypeScript (Node.js) para detectar encontros físicos entre monitorados com tornozeleira eletrônica e vítimas com medida protetiva, a partir dos arquivos de geolocalização.

São detectados três tipos de encontro:

- `protetiva`: agressor a menos de 20 m da sua vítima
- `faccao`: dois monitorados da mesma facção a menos de 20 m
- `generico`: quaisquer outros dois monitorados a menos de 20 m

## Como executar

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm run build
```

Coloque os arquivos `dataset1.txt` ... `dataset7.txt` na pasta `datasets/` e rode:

```bash
npm start
```

Os resultados são gravados em `output/respostasN.json`. Também é possível informar outras pastas:

```bash
node dist/index.js <pasta-dos-datasets> <pasta-de-saida>
```

Para validar contra os gabaritos fornecidos (`respostas1.json` e `respostas2.json` dentro de `datasets/`):

```bash
npm test
```

## Estrutura

```
src/
  index.ts        lê todos os datasets da pasta, mede o tempo e grava os JSONs
  processador.ts  liga a leitura do arquivo à detecção
  leitor.ts       leitura do arquivo em streaming, agrupando as linhas por timestamp
  detector.ts     busca dos pares próximos e classificação do encontro
  haversine.ts    cálculo da distância
  tipos.ts        tipos compartilhados
  validar.ts      compara a saída com os gabaritos
```

## Lógica

### 1. Leitura em streaming agrupada por timestamp

Os arquivos chegam a centenas de MB (o dataset 7 tem 12 milhões de linhas), então carregar tudo em memória não é uma boa opção. O arquivo é lido em blocos de 1 MB com `createReadStream`, e cada linha é quebrada manualmente com `indexOf(";")`, o que é mais rápido do que `split` ou `readline`.

Como só podem ser comparadas posições com o mesmo timestamp, e os arquivos já vêm ordenados por timestamp, as linhas são acumuladas em um grupo enquanto o timestamp é o mesmo. Quando ele muda, o grupo anterior é processado e descartado. Assim, a memória usada é a de um único instante (algumas dezenas de pontos), independentemente do tamanho do arquivo.

Os dados fixos de cada pessoa (facção e lista de agressores) são guardados uma única vez em um `Map`, na primeira vez em que o id aparece.

### 2. Busca dos pares próximos

A forma direta seria comparar todos os pontos de cada timestamp entre si. Com 120 pessoas isso dá 7.140 pares por timestamp e, no dataset 7, cerca de 700 milhões de cálculos de distância.

Para evitar isso, os pontos de cada timestamp são ordenados por latitude. Para cada ponto, só são comparados os pontos seguintes enquanto a diferença de latitude for menor que o equivalente a 20 m (aprox. 0,00018°). Quando essa diferença passa do limite, o laço é interrompido, porque todos os pontos seguintes estão ainda mais distantes.

Isso é seguro porque a distância de Haversine entre dois pontos nunca é menor do que `R × Δlatitude` (em radianos): se só a diferença de latitude já soma 20 m ou mais, a distância real também soma. Uma pequena margem (`MARGEM_ARREDONDAMENTO`) evita perder um par exatamente na borda por erro de ponto flutuante.

Na prática, quase nenhum par passa pelo cálculo completo de distância, e o custo fica dominado pela ordenação (`O(n log n)` por timestamp).

### 3. Distância

Fórmula de Haversine com raio da Terra de 6.371.000 m. A diferença de coordenadas é calculada em graus e depois convertida para radianos, nessa ordem, o que reproduz exatamente os valores de `distanciaMetros` dos gabaritos. Um encontro exige distância estritamente menor que 20 m.

### 4. Classificação

Cada par é registrado uma única vez por timestamp, com o tipo mais específico:

1. `protetiva` se um dos dois consta em `idsRestricaoMedida` do outro
2. `faccao` se os dois têm a mesma facção preenchida
3. `generico` nos demais casos

Os ids em `monitoradosEncontro` saem em ordem crescente, e um `Set` por timestamp garante que o mesmo par não seja registrado duas vezes.

## Resultados

| Dataset | Linhas | Encontros | generico | faccao | protetiva | Tempo |
|---|---|---|---|---|---|---|
| 1 | 5 mil | 4 | 2 | 1 | 1 | 5 ms |
| 2 | 25 mil | 6 | 3 | 2 | 1 | 7 ms |
| 3 | 100 mil | 10 | 5 | 3 | 2 | 23 ms |
| 4 | 400 mil | 15 | 7 | 5 | 3 | 88 ms |
| 5 | 1 milhão | 21 | 10 | 7 | 4 | 213 ms |
| 6 | 8 milhões | 27 | 12 | 9 | 6 | 1,8 s |
| 7 | 12 milhões | 35 | 15 | 12 | 8 | 2,8 s |

Tempos medidos em um MacBook com Node.js 23. As saídas dos datasets 1 e 2 são idênticas aos gabaritos, inclusive nas casas decimais da distância. As saídas dos datasets 3, 4 e 5 também foram conferidas com uma comparação de todos os pares contra todos.

## Por que esta abordagem

- **Correta**: segue as regras do enunciado e bate com os gabaritos; a interrupção da busca pela latitude é uma garantia matemática, não uma aproximação, então não perde encontros nem gera falsos positivos.
- **Rápida**: leitura em blocos com parsing manual e busca ordenada por latitude evitam o custo de comparar todos os pares.
- **Pouca memória**: processa um timestamp por vez, então arquivos maiores não exigem mais memória.
- **Sem dependências** em tempo de execução: apenas Node.js; TypeScript é usado só na compilação.
