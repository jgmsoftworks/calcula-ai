/** Group thousands without rounding or dropping an unfinished decimal entry. */
export function formatQuantityInput(input: string, cursor = input.length, groupSeparator = '.') {
  const clean = input.replace(/[^\d,]/g, '');
  const [integer, fraction] = clean.split(',');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  const text = grouped + (fraction === undefined ? '' : `,${fraction}`);
  const charactersBeforeCursor = input.slice(0, cursor).replace(/[^\d,]/g, '').length;
  let caret = 0;
  let seen = 0;
  while (caret < text.length && seen < charactersBeforeCursor) {
    if (/[\d,]/.test(text[caret])) seen++;
    caret++;
  }
  return { text, caret };
}
