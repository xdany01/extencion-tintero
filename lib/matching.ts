import { diceCoefficient, normalize } from './normalize';
import type { Snippet } from './types';

export interface InputContext {
  /** Todo el texto del contexto, normalizado. */
  normalized: string;
  /** Palabras únicas del contexto (normalizadas). */
  tokens: string[];
  /** Fragmentos originales, útil para depurar. */
  sources: string[];
}

export interface MatchResult {
  snippet: Snippet;
  /** Afinidad combinada 0..1. */
  score: number;
  /** Afinidad en porcentaje, para mostrar en la UI. */
  percent: number;
  /** Badges que han coincidido con el contexto. */
  matchedBadges: string[];
}

const MIN_FUZZY = 0.75;

/**
 * Ordena los textos por afinidad con el campo.
 *
 * Cada evidencia se combina de forma "probabilística" (1 - Π(1 - w)), de modo
 * que varias pistas débiles suman sin llegar a desbordar el 100 %:
 *
 *  - Badge exacta dentro del contexto ............ 0.62
 *  - Badge como subcadena (>= 5 letras) .......... 0.55
 *  - Palabras de la badge presentes .............. 0.20 + 0.22 * proporción
 *  - Badge parecida (Dice >= 0.75) ............... hasta 0.28
 *  - Título exacto ............................... 0.30
 *  - Palabras del título ......................... hasta 0.18
 *  - Palabras del texto .......................... hasta 0.18
 *  - Uso previo y recencia ....................... hasta 0.15
 */
export function rankSnippets(snippets: Snippet[], context: InputContext): MatchResult[] {
  const haystack = ` ${context.normalized} `;
  const tokens = new Set(context.tokens);

  const results = snippets.map((snippet) => scoreSnippet(snippet, haystack, tokens));
  results.sort((a, b) => b.score - a.score || b.snippet.title.localeCompare(a.snippet.title, 'es'));
  return results;
}

function scoreSnippet(snippet: Snippet, haystack: string, tokens: Set<string>): MatchResult {
  let evidence = 0;
  const add = (weight: number) => {
    if (weight <= 0) return;
    evidence = 1 - (1 - evidence) * (1 - Math.min(weight, 0.95));
  };

  const matched = new Set<string>();

  for (const badge of snippet.badges) {
    const normalized = normalize(badge);
    if (!normalized) continue;

    if (haystack.includes(` ${normalized} `)) {
      add(0.62);
      matched.add(badge);
      continue;
    }
    if (normalized.length >= 5 && haystack.includes(normalized)) {
      add(0.55);
      matched.add(badge);
      continue;
    }

    const badgeTokens = normalized.split(' ').filter((token) => token.length > 1);
    if (badgeTokens.length === 0) continue;

    const hits = badgeTokens.filter((token) => tokens.has(token)).length;
    if (hits > 0) {
      add(0.2 + 0.22 * (hits / badgeTokens.length));
      matched.add(badge);
      continue;
    }

    let best = 0;
    for (const token of tokens) {
      if (Math.abs(token.length - normalized.length) > 6) continue;
      const similarity = diceCoefficient(token, normalized);
      if (similarity > best) best = similarity;
    }
    if (best >= MIN_FUZZY) {
      add(0.28 * best);
      matched.add(badge);
    }
  }

  const title = normalize(snippet.title);
  if (title) {
    if (haystack.includes(` ${title} `)) {
      add(0.3);
    } else {
      const titleTokens = title.split(' ').filter((token) => token.length > 2);
      if (titleTokens.length > 0) {
        const hits = titleTokens.filter((token) => tokens.has(token)).length;
        if (hits > 0) add(0.14 * (hits / titleTokens.length) + 0.04 * hits);
      }
    }
  }

  const textTokens = new Set(normalize(snippet.text).split(' ').filter((token) => token.length > 3));
  let overlap = 0;
  for (const token of tokens) {
    if (textTokens.has(token)) overlap++;
  }
  if (overlap > 0) add(Math.min(0.18, 0.03 * overlap));

  if (snippet.uses > 0) add(Math.min(0.1, 0.02 * snippet.uses));
  if (snippet.lastUsedAt && Date.now() - snippet.lastUsedAt < 7 * 24 * 60 * 60 * 1000) {
    add(0.05);
  }

  return {
    snippet,
    score: evidence,
    percent: Math.round(evidence * 100),
    matchedBadges: [...matched],
  };
}

export function filterMatches(matches: MatchResult[], query: string): MatchResult[] {
  const normalized = normalize(query);
  if (!normalized) return matches;
  return matches.filter((match) =>
    normalize(`${match.snippet.title} ${match.snippet.text} ${match.snippet.badges.join(' ')}`).includes(
      normalized,
    ),
  );
}

export function filterSnippets(snippets: Snippet[], query: string): Snippet[] {
  const normalized = normalize(query);
  if (!normalized) return snippets;
  return snippets.filter((snippet) =>
    normalize(`${snippet.title} ${snippet.text} ${snippet.badges.join(' ')}`).includes(normalized),
  );
}
