import { createReadStream } from "fs";
import { GrupoTimestamp, Monitorado } from "./tipos";

function novoGrupo(timestamp: string): GrupoTimestamp {
  return { timestamp, ids: [], lats: [], lons: [] };
}

export async function lerDataset(
  caminho: string,
  monitorados: Map<number, Monitorado>,
  aoFecharGrupo: (grupo: GrupoTimestamp) => void
): Promise<void> {
  const stream = createReadStream(caminho, { encoding: "latin1", highWaterMark: 1 << 20 });

  let resto = "";
  let cabecalhoLido = false;
  let grupo: GrupoTimestamp | null = null;

  const processarLinha = (linha: string) => {
    if (linha.length === 0) return;
    if (!cabecalhoLido) {
      cabecalhoLido = true;
      return;
    }

    const c1 = linha.indexOf(";");
    const c2 = linha.indexOf(";", c1 + 1);
    const c3 = linha.indexOf(";", c2 + 1);
    const c4 = linha.indexOf(";", c3 + 1);
    const c5 = linha.indexOf(";", c4 + 1);
    const c6 = linha.indexOf(";", c5 + 1);

    const id = +linha.slice(0, c1);
    const timestamp = linha.charCodeAt(c2 + 1) === 34 ? linha.slice(c2 + 2, c3 - 1) : linha.slice(c2 + 1, c3);
    const lat = +linha.slice(c3 + 1, c4);
    const lon = +linha.slice(c4 + 1, c5);

    if (!monitorados.has(id)) {
      const faccao = linha.slice(c1 + 1, c2);
      const restricoes = new Set<number>();
      if (linha.slice(c5 + 1, c6) === "true") {
        const lista = linha.slice(c6 + 1).replace(/["\r\s]/g, "");
        for (const r of lista.split(",")) {
          if (r.length > 0) restricoes.add(+r);
        }
      }
      monitorados.set(id, { faccao, restricoes });
    }

    if (grupo === null || grupo.timestamp !== timestamp) {
      if (grupo !== null) aoFecharGrupo(grupo);
      grupo = novoGrupo(timestamp);
    }
    grupo.ids.push(id);
    grupo.lats.push(lat);
    grupo.lons.push(lon);
  };

  for await (const pedaco of stream) {
    const texto = resto + (pedaco as string);
    let inicio = 0;
    let fim = texto.indexOf("\n", inicio);
    while (fim !== -1) {
      const final = texto.charCodeAt(fim - 1) === 13 ? fim - 1 : fim;
      processarLinha(texto.slice(inicio, final));
      inicio = fim + 1;
      fim = texto.indexOf("\n", inicio);
    }
    resto = texto.slice(inicio);
  }
  processarLinha(resto.replace(/\r$/, ""));

  if (grupo !== null) aoFecharGrupo(grupo);
}
