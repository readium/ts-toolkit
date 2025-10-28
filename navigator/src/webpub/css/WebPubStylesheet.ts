// WebPubCSS is equivalent to ReadiumCSS for WebPub

export const webPubStylesheet = `
/* FontFamily */

:root[style*="--USER__fontFamily"] {
  font-family: var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] * {
  font-family: revert !important;
}

/* FontWeight */

:root[style*="--USER__fontWeight"] body {
  font-weight: var(--USER__fontWeight) !important;
}

/* Attempt to handle known bolds */
:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong {
  font-weight: bolder;
}

/* Hyphens */

:root[style*="--USER__bodyHyphens"] {
  -webkit-hyphens: var(--USER__bodyHyphens) !important;
  -moz-hyphens: var(--USER__bodyHyphens) !important;
  -ms-hyphens: var(--USER__bodyHyphens) !important;
  -epub-hyphens: var(--USER__bodyHyphens) !important;
  hyphens: var(--USER__bodyHyphens) !important;
}

:root[style*="--USER__bodyHyphens"] body,
:root[style*="--USER__bodyHyphens"] p,
:root[style*="--USER__bodyHyphens"] li,
:root[style*="--USER__bodyHyphens"] div,
:root[style*="--USER__bodyHyphens"] dd {
  -webkit-hyphens: inherit;
  -moz-hyphens: inherit;
  -ms-hyphens: inherit;
  -epub-hyphens: inherit;
  hyphens: inherit;
}

/* LetterSpacing */

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd {
  letter-spacing: var(--USER__letterSpacing);
  font-variant: none;
}

/* Ligatures */

:root[style*="--USER__ligatures"] {
  font-variant-ligatures: var(--USER__ligatures) !important;
}

:root[style*="--USER__ligatures"] * {
  font-variant-ligatures: inherit !important;
}

/* LineHeight */

:root[style*="--USER__lineHeight"] {
  line-height: var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div {
  line-height: inherit;
}

/* ParagraphIndent */

:root[style*="--USER__paraIndent"] p {
  text-indent: var(--USER__paraIndent) !important;
}

:root[style*="--USER__paraIndent"] p *,
:root[style*="--USER__paraIndent"] p:first-letter {
  text-indent: 0 !important;
}

/* ParagraphSpacing */

:root[style*="--USER__paraSpacing"] p {
  margin-block: var(--USER__paraSpacing) !important;
}

/* Ruby */

:root[style*="readium-noRuby-on"] body rt,
:root[style*="readium-noRuby-on"] body rp {
  display: none;
}

/* TextAlign */

:root[style*="--USER__textAlign"] {
  text-align: var(--USER__textAlign);
}

:root[style*="--USER__textAlign"] body,
:root[style*="--USER__textAlign"] p:not(blockquote p):not(figcaption p):not(hgroup p),
:root[style*="--USER__textAlign"] li,
:root[style*="--USER__textAlign"] dd {
  text-align: var(--USER__textAlign) !important;
  -moz-text-align-last: auto !important;
  -epub-text-align-last: auto !important;
  text-align-last: auto !important;
}

/* TextNormalize */

:root[style*="readium-a11y-on"] {
  font-weight: normal !important;
  font-style: normal !important;
}

:root[style*="readium-a11y-on"] *:not(code):not(var):not(kbd):not(samp) {
  font-family: inherit !important;
  font-weight: inherit !important;
  font-style: inherit !important;
}

:root[style*="readium-a11y-on"] * {
  text-decoration: none !important;
  font-variant-caps: normal !important;
  font-variant-position: normal !important;
  font-variant-numeric: normal !important;
}

:root[style*="readium-a11y-on"] sup,
:root[style*="readium-a11y-on"] sub {
  font-size: 1rem !important;
  vertical-align: baseline !important;
}

/* Word Spacing */

:root[style*="--USER__wordSpacing"] h1,
:root[style*="--USER__wordSpacing"] h2,
:root[style*="--USER__wordSpacing"] h3,
:root[style*="--USER__wordSpacing"] h4,
:root[style*="--USER__wordSpacing"] h5,
:root[style*="--USER__wordSpacing"] h6,
:root[style*="--USER__wordSpacing"] p,
:root[style*="--USER__wordSpacing"] li,
:root[style*="--USER__wordSpacing"] div,
:root[style*="--USER__wordSpacing"] dt,
:root[style*="--USER__wordSpacing"] dd {
  word-spacing: var(--USER__wordSpacing);
}

/* Zoom */

:root {
  --USER__zoom: 1;
}

:root[style*="--USER__zoom"] body {
  zoom: var(--USER__zoom) !important;
}

@supports selector(figure:has(> img)) {
  :root[style*="--USER__zoom"] figure:has(> img),
  :root[style*="--USER__zoom"] figure:has(> video),
  :root[style*="--USER__zoom"] figure:has(> svg),
  :root[style*="--USER__zoom"] figure:has(> canvas),
  :root[style*="--USER__zoom"] figure:has(> iframe),
  :root[style*="--USER__zoom"] figure:has(> audio),
  :root[style*="--USER__zoom"] div:has(> img),
  :root[style*="--USER__zoom"] div:has(> video),
  :root[style*="--USER__zoom"] div:has(> svg),
  :root[style*="--USER__zoom"] div:has(> canvas),
  :root[style*="--USER__zoom"] div:has(> iframe),
  :root[style*="--USER__zoom"] div:has(> audio),
  :root[style*="--USER__zoom"] table {
    zoom: calc(100% / var(--USER__zoom)) !important;
  }

  :root[style*="--USER__zoom"] figcaption,
  :root[style*="--USER__zoom"] caption,
  :root[style*="--USER__zoom"] td,
  :root[style*="--USER__zoom"] th {
    zoom: var(--USER__zoom) !important;
  }
}
`;