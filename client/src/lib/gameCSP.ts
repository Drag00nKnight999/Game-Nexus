/**
 * Injects a strict Content Security Policy into user-submitted game HTML.
 *
 * This technically prevents:
 *  - Crypto mining   — connect-src 'none' blocks pool connections (WebSocket/HTTP)
 *  - Data exfiltration — no fetch/XHR/WebSocket to external servers
 *  - Remote script loading — script-src blocks CDN-hosted miners
 *  - Web Worker miners — worker-src 'none' blocks the worker pattern
 *
 * Games are still fully functional: inline scripts, eval, canvas, audio,
 * data: URIs, and blob: object URLs all continue to work.
 */
const GAME_CSP =
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
  "connect-src 'none'; " +
  "worker-src 'none'; " +
  "script-src 'unsafe-inline' 'unsafe-eval';";

const CSP_TAG = `<meta http-equiv="Content-Security-Policy" content="${GAME_CSP}">`;

export function injectGameCSP(html: string): string {
  if (!html) return html;

  // Inject right after <head> (with optional attributes) if present
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${CSP_TAG}`);
  }

  // No <head> tag — inject right after <html> if present
  if (/<html(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(\s[^>]*)?>/i, (m) => `${m}\n${CSP_TAG}`);
  }

  // No structural tags — prepend to the raw HTML
  return `${CSP_TAG}\n${html}`;
}
