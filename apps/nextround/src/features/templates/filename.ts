export function workoutFilename(name: string): string {
  const clean = name
    .replace(/[\p{Cc}\p{Cf}/\\:*?"<>|.]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  let stem = '';
  for (const character of clean) {
    if (new TextEncoder().encode(stem + character).length > 180) break;
    stem += character;
  }
  return `${stem.trim() || 'NextRound-workout'}.json`;
}
