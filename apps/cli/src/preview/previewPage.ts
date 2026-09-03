import type { CanvasDoc } from "@jiscribe/doc";

import type { PreviewAssets } from "./previewAssets";
import {
	PREVIEW_FONTS_HREF,
	PREVIEW_GLOBAL,
} from "../../preview/previewBridge";

/** Everything one preview file is written from. */
export type PreviewPageParts = PreviewAssets & {
	/** The validated document the page mounts. */
	doc: CanvasDoc;
	/** What the browser tab is called; the input file name, as given. */
	title: string;
};

const HTML_ESCAPES: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
};

const escapeHtml = (text: string): string =>
	text.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);

/**
 * The document as a JavaScript expression that cannot end the script it sits in.
 *
 * `</script` inside a string literal closes the element as far as the HTML parser
 * is concerned, whatever JavaScript thinks, so the `<` is written as its escape;
 * U+2028 / U+2029 are legal in JSON and were line terminators to older parsers.
 */
const toScriptJson = (value: unknown): string =>
	JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");

/**
 * The same guard for text that is already JavaScript or CSS: only the sequence
 * that would close the element is touched, and `<\/script` / `<\/style` mean the
 * same thing to both languages inside a string.
 */
const escapeClosingTag = (text: string, tag: "script" | "style"): string =>
	text.split(`</${tag}`).join(`<\\/${tag}`);

/**
 * Writes one document, the canvas and everything the canvas needs into a single
 * HTML file.
 *
 * A complete document rather than a fragment: the file is opened directly as
 * often as it is served, and quirks mode is not a thing to hand someone. The
 * only request it makes of the network is the Google Fonts stylesheet, and a
 * machine that cannot reach it still gets the drawing, on fallback faces.
 *
 * @param parts - The built page, plus the document to mount and the name to give the tab
 * @returns The whole file, ending in a newline
 */
export const buildPreviewPage = (
	parts: PreviewPageParts,
): string => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(parts.title)}</title>
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link rel="stylesheet" href="${PREVIEW_FONTS_HREF}" />
		<style>
			html,
			body {
				margin: 0;
				height: 100%;
			}
			#preview-root {
				position: fixed;
				inset: 0;
			}
		</style>
		<style>${escapeClosingTag(parts.style, "style")}</style>
	</head>
	<body>
		<div id="preview-root"></div>
		<script>
			window.${PREVIEW_GLOBAL} = { doc: ${toScriptJson(parts.doc)} };
		</script>
		<script>${escapeClosingTag(parts.script, "script")}</script>
	</body>
</html>
`;
