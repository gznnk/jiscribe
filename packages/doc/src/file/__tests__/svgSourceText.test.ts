import { describe, expect, it } from "vitest";

import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "../svgSourceText";

/**
 * SVG text mimicking what embedCanvasSource + XMLSerializer produces.
 * Serializing a text node escapes & < >.
 */
const buildExportedSvg = (escapedSourceContent: string): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
	`<metadata><jiscribe:source xmlns:jiscribe="https://jiscribe.dev/ns/canvas" ` +
	`data-jiscribe-version="1">${escapedSourceContent}</jiscribe:source></metadata>` +
	`<rect x="0" y="0" width="100" height="100"/></svg>`;

describe("extractCanvasSourceFromSvgText", () => {
	it("extracts the embedded source JSON", () => {
		const svgText = buildExportedSvg('{"version":1,"root":[]}');
		expect(extractCanvasSourceFromSvgText(svgText)).toBe(
			'{"version":1,"root":[]}',
		);
	});

	it("restores XML-escaped characters (& < > and character references)", () => {
		const svgText = buildExportedSvg(
			'{"text":"a &lt;b&gt; &amp; \'quo\' &quot;dq&quot; &#x1F600; &#65;"}',
		);
		expect(extractCanvasSourceFromSvgText(svgText)).toBe(
			'{"text":"a <b> & \'quo\' "dq" 😀 A"}',
		);
	});

	it("does not over-restore double-escaped sequences (&amp;lt;)", () => {
		const svgText = buildExportedSvg('{"text":"&amp;lt;"}');
		expect(extractCanvasSourceFromSvgText(svgText)).toBe('{"text":"&lt;"}');
	});

	it("returns null for an SVG with no embedded source", () => {
		expect(
			extractCanvasSourceFromSvgText(
				`<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
			),
		).toBeNull();
	});

	it("returns null when the embedded element is empty", () => {
		expect(extractCanvasSourceFromSvgText(buildExportedSvg("  "))).toBeNull();
	});

	it("keeps a character reference past U+10FFFF as written instead of throwing", () => {
		const svgText = buildExportedSvg(
			'{"text":"&#x110000; &#99999999999; &#65;"}',
		);
		expect(extractCanvasSourceFromSvgText(svgText)).toBe(
			'{"text":"&#x110000; &#99999999999; A"}',
		);
	});

	it("does not take an element whose name merely starts with jiscribe:source", () => {
		const svgText =
			`<svg xmlns="http://www.w3.org/2000/svg"><jiscribe:sourcex>{}</jiscribe:sourcex>` +
			`<jiscribe:source>{"a":1}</jiscribe:source></svg>`;
		expect(extractCanvasSourceFromSvgText(svgText)).toBe('{"a":1}');
	});

	it("returns null for an open tag with no close tag", () => {
		expect(
			extractCanvasSourceFromSvgText(
				`<svg xmlns="http://www.w3.org/2000/svg"><jiscribe:source>{}</svg>`,
			),
		).toBeNull();
	});

	// A lazy-body regex took seconds per hundred KB of this input; the scan must
	// stay linear so a crafted .jis.svg cannot stall the extension host
	it("scans many unclosed open tags in linear time", () => {
		const svgText = "<jiscribe:source>".repeat(50_000);
		const startedAt = performance.now();
		expect(extractCanvasSourceFromSvgText(svgText)).toBeNull();
		expect(replaceCanvasSourceInSvgText(svgText, "{}")).toBeNull();
		expect(performance.now() - startedAt).toBeLessThan(500);
	});
});

describe("replaceCanvasSourceInSvgText", () => {
	it("replaces the embedded source while preserving start-tag attributes and surrounding SVG", () => {
		const svgText = buildExportedSvg('{"version":1,"root":[]}');
		const replaced = replaceCanvasSourceInSvgText(
			svgText,
			'{"version":1,"root":[{"id":"r1"}]}',
		);
		expect(replaced).toBe(
			buildExportedSvg('{"version":1,"root":[{"id":"r1"}]}'),
		);
	});

	it("extracts the same JSON after replacement (escape round-trip)", () => {
		const sourceJson = '{"text":"<b> & \\"q\\" $1 $& 日本語","n":1}';
		const replaced = replaceCanvasSourceInSvgText(
			buildExportedSvg("{}"),
			sourceJson,
		);
		expect(replaced).not.toBeNull();
		expect(extractCanvasSourceFromSvgText(replaced ?? "")).toBe(sourceJson);
	});

	it("returns null for an SVG with no embedded source", () => {
		expect(
			replaceCanvasSourceInSvgText(
				`<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
				"{}",
			),
		).toBeNull();
	});
});
