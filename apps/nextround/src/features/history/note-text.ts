// Keep this explicit set in sync with blank_note in native history.rs.
export function normalizeNote(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: tab and line endings are intentionally blank-note whitespace.
  return /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$/u.test(
    text,
  )
    ? ''
    : text;
}
