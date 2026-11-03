import { haversine, RAIO_TERRA } from "./haversine";
import { Encontro, GrupoTimestamp, Monitorado, TipoEncontro } from "./tipos";

export const DISTANCIA_LIMITE = 20;

const MARGEM_ARREDONDAMENTO = 1.000001;
const LIMITE_LATITUDE = (((DISTANCIA_LIMITE / RAIO_TERRA) * 180) / Math.PI) * MARGEM_ARREDONDAMENTO;

export function classificar(a: number, b: number, monitorados: Map<number, Monitorado>): TipoEncontro {
  const ma = monitorados.get(a)!;
  const mb = monitorados.get(b)!;
  if (ma.restricoes.has(b) || mb.restricoes.has(a)) return "protetiva";
  if (ma.faccao !== "" && ma.faccao === mb.faccao) return "faccao";
  return "generico";
}

export function detectarEncontros(
  grupo: GrupoTimestamp,
  monitorados: Map<number, Monitorado>,
  saida: Encontro[]
): void {
  const { ids, lats, lons, timestamp } = grupo;
  const n = ids.length;
  if (n < 2) return;

  const ordem = new Array<number>(n);
  for (let i = 0; i < n; i++) ordem[i] = i;
  ordem.sort((x, y) => lats[x] - lats[y]);

  const registrados = new Set<string>();

  for (let i = 0; i < n; i++) {
    const pi = ordem[i];
    const latI = lats[pi];

    for (let j = i + 1; j < n; j++) {
      const pj = ordem[j];
      if (lats[pj] - latI > LIMITE_LATITUDE) break;

      if (ids[pi] === ids[pj]) continue;

      const [menor, maior] = ids[pi] < ids[pj] ? [pi, pj] : [pj, pi];
      const distancia = haversine(lats[menor], lons[menor], lats[maior], lons[maior]);
      if (distancia >= DISTANCIA_LIMITE) continue;

      const chave = ids[menor] + "-" + ids[maior];
      if (registrados.has(chave)) continue;
      registrados.add(chave);

      saida.push({
        tipo: classificar(ids[menor], ids[maior], monitorados),
        monitoradosEncontro: [ids[menor], ids[maior]],
        timestamp,
        posicoes: {
          [ids[menor]]: { lat: lats[menor], lon: lons[menor] },
          [ids[maior]]: { lat: lats[maior], lon: lons[maior] },
        },
        distanciaMetros: distancia,
      });
    }
  }
}
