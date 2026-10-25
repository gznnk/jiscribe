// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { parseSanitizedSvg } from "../sanitizeSvgText";

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">';

const wrap = (inner: string): string => `${SVG_OPEN}${inner}</svg>`;

const serialize = (element: Element): string =>
	new XMLSerializer().serializeToString(element);

describe("parseSanitizedSvg", () => {
	it("keeps ordinary drawing markup, its geometry, paint attributes and fragment references", () => {
		const root = parseSanitizedSvg(
			wrap(
				'<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient>' +
					'<linearGradient id="g2" href="#g"/></defs>' +
					'<rect x="1" y="2" width="10" height="10" fill="url(#g)" style="stroke:url(#g2)"/>' +
					'<text x="1" y="5" xml:space="preserve">hi</text>',
			),
		);
		expect(root.getAttribute("viewBox")).toBe("0 0 10 10");
		expect(root.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
		expect(root.querySelector("stop")?.getAttribute("offset")).toBe("0");
		expect(root.querySelector("#g2")?.getAttribute("href")).toBe("#g");
		const rect = root.querySelector("rect");
		expect(rect?.getAttribute("width")).toBe("10");
		expect(rect?.getAttribute("fill")).toBe("url(#g)");
		expect(rect?.getAttribute("style")).toBe("stroke:url(#g2)");
		expect(root.querySelector("text")?.textContent).toBe("hi");
	});

	it("still drops a script, an event handler, <use> and <foreignObject>", () => {
		const markup = serialize(
			parseSanitizedSvg(
				wrap(
					'<script>alert(1)</script><rect width="1" height="1" onclick="alert(1)"/>' +
						'<symbol id="s"><rect/></symbol><use href="#s"/>' +
						"<foreignObject><div>x</div></foreignObject>",
				),
			),
		);
		expect(markup).not.toContain("<script");
		expect(markup).not.toContain("onclick");
		expect(markup).not.toContain("<use");
		expect(markup).not.toContain("<foreignObject");
		expect(markup).toContain("<rect");
	});

	// An inline <style> is scoped to the page, not to the object, so the markup of
	// one shape could restyle or hide the editor around it
	it("drops a <style> element together with its rules", () => {
		const markup = serialize(
			parseSanitizedSvg(
				wrap(
					'<style>.st0{display:none}</style><rect class="st0" width="1" height="1"/>',
				),
			),
		);
		expect(markup).not.toContain("<style");
		expect(markup).not.toContain("display:none");
		expect(markup).toContain('class="st0"');
	});

	it("drops an <a> but keeps what it wrapped", () => {
		const markup = serialize(
			parseSanitizedSvg(
				wrap('<a href="https://example.test"><rect width="1" height="1"/></a>'),
			),
		);
		expect(markup).not.toContain("<a");
		expect(markup).toContain("<rect");
	});

	it("drops an href to another document, http or relative, in any spelling", () => {
		const root = parseSanitizedSvg(
			wrap(
				'<image id="a" href="https://example.test/px.png" width="1" height="1"/>' +
					'<image id="b" xlink:href="../other.png" xmlns:xlink="http://www.w3.org/1999/xlink" width="1" height="1"/>' +
					'<image id="c" HREF="https://example.test/px.png" width="1" height="1"/>' +
					'<filter id="f"><feImage href="https://example.test/px.png"/></filter>',
			),
		);
		expect(root.querySelector("#a")?.hasAttribute("href")).toBe(false);
		expect(root.querySelector("#b")?.hasAttribute("xlink:href")).toBe(false);
		expect(root.querySelector("#c")?.hasAttribute("HREF")).toBe(false);
		expect(root.querySelector("feImage")?.hasAttribute("href")).toBe(false);
		expect(serialize(root)).not.toContain("example.test");
	});

	it("keeps a data: image, the one way raster pixels travel inside the markup", () => {
		const dataUri = "data:image/png;base64,iVBORw0KGgo=";
		const root = parseSanitizedSvg(
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
		const root = parseSanitizedSvg(
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

	// The browser's tokenizer resolves escapes before it recognizes the function
	// name, so `u\72l(` is `url(` to it
	it("sees through CSS escapes in the function name", () => {
		const root = parseSanitizedSvg(
			wrap(
				'<rect id="a" width="1" height="1" style="fill:u\\72l(https://example.test/x)"/>' +
					'<rect id="b" width="1" height="1" fill="u\\72 l(https://example.test/x)"/>' +
					'<rect id="c" width="1" height="1" style="--u:\\75rl(https://example.test/x);fill:var(--u)"/>' +
					// CSS reads the CRLF after the escape as one whitespace, which the escape takes
					'<rect id="d" width="1" height="1" mask="u\\72&#13;&#10;l(https://example.test/x)"/>' +
					'<rect id="e" width="1" height="1" mask="u\\72&#13;l(https://example.test/x)"/>' +
					// NBSP is not CSS whitespace, so the escape leaves it and this is no url(
					'<rect id="f" width="1" height="1" mask="u\\72&#160;l(https://example.test/x)"/>',
			),
		);
		expect(root.querySelector("#a")?.hasAttribute("style")).toBe(false);
		expect(root.querySelector("#b")?.hasAttribute("fill")).toBe(false);
		expect(root.querySelector("#c")?.hasAttribute("style")).toBe(false);
		expect(root.querySelector("#d")?.hasAttribute("mask")).toBe(false);
		expect(root.querySelector("#e")?.hasAttribute("mask")).toBe(false);
		expect(root.querySelector("#f")?.hasAttribute("mask")).toBe(true);
	});

	it("removes the image functions that take a bare string", () => {
		const root = parseSanitizedSvg(
			wrap(
				'<rect id="a" width="1" height="1" style="mask-image:image-set(\'https://example.test/x.png\' 1x)"/>' +
					'<rect id="b" width="1" height="1" style="mask-image:-webkit-image-set(\'https://example.test/x.png\' 1x)"/>' +
					'<rect id="c" width="1" height="1" style="mask-image:cross-fade(url(#a), url(#b), 50%)"/>',
			),
		);
		expect(root.querySelector("#a")?.hasAttribute("style")).toBe(false);
		expect(root.querySelector("#b")?.hasAttribute("style")).toBe(false);
		expect(root.querySelector("#c")?.hasAttribute("style")).toBe(false);
	});

	it("keeps a url() to a fragment, quoted or not, and every other attribute", () => {
		const root = parseSanitizedSvg(
			wrap(
				'<rect width="1" height="1" fill="url(#g)" stroke="url( \'#g2\' )" style="mask:url(&quot;#m&quot;)" data-note="url is a word; image too"/>',
			),
		);
		const rect = root.querySelector("rect");
		expect(rect?.getAttribute("fill")).toBe("url(#g)");
		expect(rect?.getAttribute("stroke")).toBe("url( '#g2' )");
		expect(rect?.getAttribute("style")).toBe('mask:url("#m")');
		expect(rect?.getAttribute("data-note")).toBe("url is a word; image too");
	});

	it("checks the root element's own attributes too", () => {
		const root = parseSanitizedSvg(
			`<svg xmlns="http://www.w3.org/2000/svg" style="background:url(https://example.test/x.png)"><rect/></svg>`,
		);
		expect(root.hasAttribute("style")).toBe(false);
	});

	it("falls back to the error icon when nothing parseable survives", () => {
		const root = parseSanitizedSvg("<script>alert(1)</script>");
		expect(root.localName).toBe("svg");
		expect(root.querySelector("title")?.textContent).toBe("SVG render error");
	});
});
