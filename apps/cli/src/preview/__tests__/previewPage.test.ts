import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { buildPreviewPage } from "../previewPage";

/** Stand-ins for the built page, so these tests do not need a build. */
const ASSETS = {
	script: "console.log(1);",
	style: ".x{color:red}",
	images: {},
};

/**
 * A document as JSON rather than an object literal: what matters here is the
 * text travelling through the page intact, not the model's types.
 */
const docWithText = (text: string): CanvasDoc =>
	JSON.parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "t",
					type: "text",
					x: 0,
					y: 0,
					width: 100,
					height: 20,
					text,
				},
			],
		}),
	) as CanvasDoc;

/** The payload expression as it stands in the page, before any parsing. */
const payloadSourceOf = (page: string): string => {
	const match = /window\.\w+ = (\{.*\});/.exec(page);
	if (match === null) {
		throw new Error("the page carries no payload");
	}
	return match[1];
};

/** What the page publishes on `window`, read back out of the HTML. */
const payloadOf = (page: string): { doc: unknown; images: unknown } =>
	// The page's own escapes (< and friends) are JSON escapes too, so what
	// the browser reads is what JSON.parse reads.
	JSON.parse(payloadSourceOf(page)) as { doc: unknown; images: unknown };

describe("buildPreviewPage", () => {
	const page = buildPreviewPage({
		...ASSETS,
		doc: docWithText("hello"),
		title: "diagram.jis.json",
	});

	it("is a standards-mode document, named after the file", () => {
		expect(page.startsWith("<!doctype html>")).toBe(true);
		expect(page).toContain("<title>diagram.jis.json</title>");
	});

	it("carries the document itself, not a path to one", () => {
		expect(payloadOf(page).doc).toEqual(docWithText("hello"));
	});

	it("carries the document's images, keyed by the src that names them", () => {
		const illustrated = buildPreviewPage({
			...ASSETS,
			images: { "logo.png": "data:image/png;base64,AA==" },
			doc: docWithText("hello"),
			title: "x.jis.json",
		});
		expect(payloadOf(illustrated).images).toEqual({
			"logo.png": "data:image/png;base64,AA==",
		});
	});

	it("inlines the script and the stylesheet", () => {
		expect(page).toContain(ASSETS.script);
		expect(page).toContain(ASSETS.style);
	});

	it("asks the network for nothing but the fonts", () => {
		const urls = page.match(/https?:\/\/[^"' )]+/g) ?? [];
		expect(urls.length).toBeGreaterThan(0);
		for (const url of urls) {
			expect(url).toMatch(/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/);
		}
	});

	it("keeps a document that contains </script> inside the script", () => {
		const hostile = buildPreviewPage({
			...ASSETS,
			doc: docWithText("</script><img src=x onerror=alert(1)>"),
			title: "x.jis.json",
		});
		// The payload's own closing tag is the only one before the bundle.
		expect(hostile).not.toContain("</script><img");
		expect(hostile).toContain("\\u003c/script");
		expect(payloadOf(hostile).doc).toEqual(
			docWithText("</script><img src=x onerror=alert(1)>"),
		);
	});

	it("keeps an image src that contains </script> inside the script", () => {
		const src = "</script><img src=x onerror=alert(1)>.png";
		const hostile = buildPreviewPage({
			...ASSETS,
			images: { [src]: "data:image/png;base64,AA==" },
			doc: docWithText("hello"),
			title: "x.jis.json",
		});
		// The keys of the image table are as much attacker-shaped text as the
		// document's own, being whatever the .jis named its pictures with.
		expect(payloadSourceOf(hostile)).not.toContain("</script");
		expect(payloadOf(hostile).images).toEqual({
			[src]: "data:image/png;base64,AA==",
		});
	});

	it("escapes a title that would otherwise carry markup", () => {
		const titled = buildPreviewPage({
			...ASSETS,
			doc: docWithText("hello"),
			title: '<img src=x>&"',
		});
		expect(titled).toContain("<title>&lt;img src=x&gt;&amp;&quot;</title>");
	});

	it("keeps a stylesheet that contains </style> inside the style element", () => {
		const styled = buildPreviewPage({
			...ASSETS,
			style: '.x::after{content:"</style>"}',
			doc: docWithText("hello"),
			title: "x.jis.json",
		});
		expect(styled).toContain('content:"<\\/style>"');
	});
});
