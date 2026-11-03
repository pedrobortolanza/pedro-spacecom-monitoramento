import { detectarEncontros } from "./detector";
import { lerDataset } from "./leitor";
import { Encontro, Monitorado } from "./tipos";

export async function processarDataset(caminho: string): Promise<Encontro[]> {
  const monitorados = new Map<number, Monitorado>();
  const encontros: Encontro[] = [];
  await lerDataset(caminho, monitorados, (grupo) => detectarEncontros(grupo, monitorados, encontros));
  return encontros;
}
