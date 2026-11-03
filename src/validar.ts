import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { processarDataset } from "./processador";
import { Encontro } from "./tipos";

const PASTA_DATASETS = process.argv[2] ?? "datasets";

function chave(e: Encontro): string {
  const [a, b] = [...e.monitoradosEncontro].sort((x, y) => x - y);
  return `${e.timestamp}|${a}|${b}|${e.tipo}`;
}

async function validar(numero: number): Promise<boolean> {
  const esperadoPath = join(PASTA_DATASETS, `respostas${numero}.json`);
  if (!existsSync(esperadoPath)) {
    console.log(`dataset${numero}: sem gabarito`);
    return true;
  }

  const esperado: Encontro[] = JSON.parse(readFileSync(esperadoPath, "utf8"));
  const obtido = await processarDataset(join(PASTA_DATASETS, `dataset${numero}.txt`));

  const chavesEsperadas = new Set(esperado.map(chave));
  const chavesObtidas = new Set(obtido.map(chave));

  const faltando = [...chavesEsperadas].filter((k) => !chavesObtidas.has(k));
  const sobrando = [...chavesObtidas].filter((k) => !chavesEsperadas.has(k));
  const ok = faltando.length === 0 && sobrando.length === 0;

  console.log(
    `dataset${numero}: ${ok ? "OK" : "FALHOU"} ` +
      `(esperado ${esperado.length}, obtido ${obtido.length}, faltando ${faltando.length}, sobrando ${sobrando.length})`
  );
  for (const k of faltando) console.log(`  faltando: ${k}`);
  for (const k of sobrando) console.log(`  sobrando: ${k}`);
  return ok;
}

async function main() {
  const resultados = [await validar(1), await validar(2)];
  process.exit(resultados.every(Boolean) ? 0 : 1);
}

main();
