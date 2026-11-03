export type TipoEncontro = "generico" | "faccao" | "protetiva";

export interface Monitorado {
  faccao: string;
  restricoes: Set<number>;
}

export interface Posicao {
  lat: number;
  lon: number;
}

export interface Encontro {
  tipo: TipoEncontro;
  monitoradosEncontro: [number, number];
  timestamp: string;
  posicoes: Record<string, Posicao>;
  distanciaMetros: number;
}

export interface GrupoTimestamp {
  timestamp: string;
  ids: number[];
  lats: number[];
  lons: number[];
}
