const STOP_WORDS = new Set(
  `a an and are as at be been being by can could did do does for from had has have he her here him his how i if in into is it its may me might more most my no not of on or our out over she should so than that the their them then there these they this those through to under up us was we were what when where which who will with would you your`.split(
    " "
  )
);
const SHORT_TECH_TERMS = new Set(["ai", "ml", "qa", "ux", "ui", "bi", "c#", "c++"]);

export function contentTerms(value) {
  const tokens = value.toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) || [];
  return tokens.filter(
    (term) => !STOP_WORDS.has(term) && (term.length > 2 || SHORT_TECH_TERMS.has(term))
  );
}
