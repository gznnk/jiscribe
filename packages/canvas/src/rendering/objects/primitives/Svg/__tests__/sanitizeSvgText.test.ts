// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { removeExternalReferences, sanitizeSvgText } from "../sanitizeSvgText";

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">';

const wrap = (inner: string): string => `${SVG_OPEN}${inner}</svg>`;

const parse = (svgText: string): Element =>
	new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;

/** Both steps as Svg.tsx runs them: sanitize the text, then strip the references */
const prepare = (svgText: string): Element => {
	const root = parse(sanitizeSvgText(svgText));
	removeExternalReferences(root);
	return root;
};

describe("sanitizeSvgText", () => {
	it("keeps ordinary drawing markup, its geometry and paint attributes", () => {
		const sanitized = sanitizeSvgText(
			wrap(
				'<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient></defs>' +
					'<rect x="1" y="2" width="10" height="10" fill="url(#g)" style="stroke:url(#g)"/>' +
					'<text x="1" y="5">hi</text>',
			),
		);
		expect(sanitized).toContain('viewBox="0 0 10 10"');
		expect(sanitized).toContain('offset="0"');
		expect(sanitized).toContain('x="1" y="2" width="10" height="10"');
		expect(sanitized).toContain('fill="url(#g)"');
		expect(sanitized).toContain("<text");
	});

	it("still drops a script and an event handler", () => {
		const sanitized = sanitizeSvgText(
			wrap(
				'<script>alert(1)</script><rect width="1" height="1" onclick="alert(1)"/>',
			),
		);
		expect(sanitized).not.toContain("<script");
		expect(sanitized).not.toContain("onclick");
		expect(sanitized).toContain("<rect");
	});

	// An inline <style> is scoped to the page, not to the object, so the markup of
	// one shape could restyle or hide the editor around it
	it("drops a <style> element", () => {
		const sanitized = sanitizeSvgText(
			wrap('<style>*{display:none}</style><rect width="1" height="1"/>'),
		);
		expect(sanitized).not.toContain("<style");
		expect(sanitized).toContain("<rect");
	});

	it("drops an <a> but keeps what it wrapped", () => {
		const sanitized = sanitizeSvgText(
			wrap('<a href="https://example.test"><rect width="1" height="1"/></a>'),
		);
		expect(sanitized).not.toContain("<a");
		expect(sanitized).toContain("<rect");
	});
});

describe("removeExternalReferences", () => {
	it("drops an href to another document, http or relative, but keeps a fragment", () => {
		const root = prepare(
			wrap(
				'<image id="a" href="https://example.test/px.png" width="1" height="1"/>' +
					'<image id="b" xlink:href="../other.png" xmlns:xlink="http://www.w3.org/1999/xlink" width="1" height="1"/>' +
					'<linearGradient id="g" href="#base"/>',
			),
		);
		expect(root.querySelector("#a")?.hasAttribute("href")).toBe(false);
		expect(root.querySelector("#b")?.hasAttribute("xlink:href")).toBe(false);
		expect(root.querySelector("#g")?.getAttribute("href")).toBe("#base");
	});

	it("keeps a data: image, the one way raster pixels travel inside the markup", () => {
		const dataUri = "data:image/png;base64,iVBORw0KGgo=";
		const root = prepare(
			wrap(
				`<image id="a" href="${dataUri}" width="1" height="1"/>` +
					`<linearGradient id="g" href="${dataUri}"/>`,
			),
		);
		expect(root.querySelector("#a")?.getAttribute("href")).toBe(dataUri);
		// Only <image> draws a data: URI; anywhere else it is not a reference into the markup
		expect(root.querySelector("#g")?.hasAttribute("href")).toBe(false);
	});

	it("removes a presentation attribute or style whose url() names another document", () => {
		const root = prepare(
			wrap(
				'<rect id="a" width="1" height="1" fill="url(https://example.test/p.svg#g)"/>' +
					'<rect id="b" width="1" height="1" style="fill: url( \'//example.test/p.svg#g\' )"/>' +
					'<rect id="c" width="1" height="1" filter="URL(other.svg#f)"/>',
			),
		);
		expect(root.querySelector("#a")?.hasAttribute("fill")).toBe(false);
		expect(root.querySelector("#b")?.hasAttribute("style")).toBe(false);
		expect(root.querySelector("#c")?.hasAttribute("filter")).toBe(false);
		expect(root.querySelectorAll("rect")).toHaveLength(3);
	});

	it("keeps a url() to a fragment, quoted or not, and every other attribute", () => {
		const root = prepare(
			wrap(
				'<rect width="1" height="1" fill="url(#g)" stroke="url( \'#g2\' )" style="mask:url(&quot;#m&quot;)" data-note="url is a word"/>',
			),
		);
		const rect = root.querySelector("rect");
		expect(rect?.getAttribute("fill")).toBe("url(#g)");
		expect(rect?.getAttribute("stroke")).toBe("url( '#g2' )");
		expect(rect?.getAttribute("style")).toBe('mask:url("#m")');
		expect(rect?.getAttribute("data-note")).toBe("url is a word");
	});

	it("checks the root element's own attributes too", () => {
		const root = parse(
			`<svg xmlns="http://www.w3.org/2000/svg" style="background:url(https://example.test/x.png)"><rect/></svg>`,
		);
		removeExternalReferences(root);
		expect(root.hasAttribute("style")).toBe(false);
	});
});
