/**
 * Normaliza texto para comparar: minúsculas, sin acentos, sin signos.
 * "Correo Electrónico" -> "correo electronico"
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalize(input);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(' ').filter((token) => token.length > 1)));
}

/**
 * Coeficiente de Sørensen–Dice sobre bigramas. 1 = idéntico, 0 = nada en común.
 * Sirve para tolerar erratas y variantes ("telefono" ~ "telephono").
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const gram = a.slice(i, i + 2);
    bigrams.set(gram, (bigrams.get(gram) ?? 0) + 1);
  }

  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const gram = b.slice(i, i + 2);
    const count = bigrams.get(gram);
    if (!count) continue;
    hits++;
    if (count === 1) bigrams.delete(gram);
    else bigrams.set(gram, count - 1);
  }

  return (2 * hits) / (a.length - 1 + b.length - 1);
}
