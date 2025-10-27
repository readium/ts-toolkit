// WebPubCSS is equivalent to ReadiumCSS for WebPub

export const webPubStylesheet = `
:root {
  --USER__zoom: 1;
}

:root[style*="--USER__zoom"] body {
  zoom: var(--USER__zoom) !important;
}
`;