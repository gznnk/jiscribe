/**
 * The Content-Security-Policy of the Canvas editor's Webview, kept free of the
 * VSCode API so the unit tests can pin it.
 *
 * default-src 'none' and only what the bundle needs. img-src carries no https:
 * or data:, so a document cannot make the Webview fetch anything (a markdown
 * image would otherwise leak that the file was opened, #28); doc images arrive
 * as base64 over postMessage (resolveDocImage) and the PNG export rasterizes
 * its SVG through a blob: URL, whose nested data: URIs are inline to the SVG
 * rather than fetched by the page.
 *
 * @param cspSource The Webview's own origin (`webview.cspSource`), the only
 *   source the bundle's script, styles, fonts and images may come from.
 * @param nonce The single-use nonce the bundle's script tag carries; no other
 *   script source is allowed.
 */
export const buildCanvasWebviewCsp = (
	cspSource: string,
	nonce: string,
): string =>
	`${[
		"default-src 'none'",
		`img-src ${cspSource} blob:`,
		`style-src ${cspSource} 'unsafe-inline'`,
		`font-src ${cspSource}`,
		`script-src 'nonce-${nonce}'`,
	].join("; ")};`;
