/**
 * The Content-Security-Policy of the Canvas editor's Webview, kept free of the
 * VSCode API so the unit tests can pin it.
 *
 * default-src 'none' and only what the bundle needs. img-src carries no https:,
 * so a document cannot make the Webview fetch anything (a markdown image would
 * otherwise leak that the file was opened, #28); doc images arrive as base64
 * over postMessage (resolveDocImage). data: is allowed because the PNG export
 * hands an SVG holding a markdown card to an `<img>` as a data URL, and any
 * other through a blob: URL (rasterizeSvgToPng); a data URL carries its bytes
 * in itself, so it reaches no network either.
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
		`img-src ${cspSource} blob: data:`,
		`style-src ${cspSource} 'unsafe-inline'`,
		`font-src ${cspSource}`,
		`script-src 'nonce-${nonce}'`,
	].join("; ")};`;
