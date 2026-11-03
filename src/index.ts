import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { processarDataset } from "./processador";

const PASTA_DATASETS = process.argv[2] ?? "datasets";
const PASTA_SAIDA = process.argv[3] ?? "output";

async function main() {
  if (!existsSync(PASTA_DATASETS)) {
    console.error(`Pasta não encontrada: ${PASTA_DATASETS}`);
    process.exit(1);
  }
  mkdirSync(PASTA_SAIDA, { recursive: true });

  const arquivos = readdirSync(PASTA_DATASETS)
    .filter((nome) => /^dataset\d+\.txt$/.test(nome))
    .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")));

  let tempoTotal = 0;
  for (const arquivo of arquivos) {
    const inicio = performance.now();
    const encontros = await processarDataset(join(PASTA_DATASETS, arquivo));
    const tempo = performance.now() - inicio;
    tempoTotal += tempo;

    const numero = basename(arquivo, ".txt").replace("dataset", "");
    writeFileSync(join(PASTA_SAIDA, `respostas${numero}.json`), JSON.stringify(encontros, null, 2));

    const porTipo = { generico: 0, faccao: 0, protetiva: 0 };
    for (const e of encontros) porTipo[e.tipo]++;
    console.log(
      `${arquivo}: ${encontros.length} encontros ` +
        `(generico ${porTipo.generico}, faccao ${porTipo.faccao}, protetiva ${porTipo.protetiva}) ` +
        `em ${tempo.toFixed(0)} ms`
    );
  }
  console.log(`Tempo total: ${tempoTotal.toFixed(0)} ms`);
}

main();
