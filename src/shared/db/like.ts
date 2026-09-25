/**
 * Escapes `%`, `_` and `\` so user search text is matched literally inside
 * an ILIKE pattern (the old code passed raw input to a Mongo $regex).
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
