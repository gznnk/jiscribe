import { describe, expect, it } from "vitest";

import { resolveRenderOptions } from "../renderOptions";

const args = (overrides: Record<string, unknown> = {}) => ({
	positionals: ["diagram.jis.json"],
	output: "out.png",
	...overrides,
});

const expectMessage = (result: ReturnType<typeof resolveRenderOptions>) => {
	if (result.ok) {
		throw new Error("expected the options to be rejected");
	}
	return result.message;
};

describe("resolveRenderOptions", () => {
	it("defaults to a fit-to-content render at scale 1", () => {
		const result = resolveRenderOptions(args());
		expect(result).toMatchObject({
			ok: true,
			options: {
				input: "diagram.jis.json",
				output: "out.png",
				format: "png",
				scale: 1,
				region: "content",
				background: null,
				browser: null,
			},
		});
	});

	it("takes the format from the output extension, case and all", () => {
		expect(resolveRenderOptions(args({ output: "OUT.SVG" }))).toMatchObject({
			ok: true,
			options: { format: "svg" },
		});
	});

	it("refuses an output whose extension names no format", () => {
		expect(
			expectMessage(resolveRenderOptions(args({ output: "out.jpg" }))),
		).toMatch(/must end in \.png or \.svg/);
	});

	it("asks for an output path", () => {
		expect(
			expectMessage(resolveRenderOptions(args({ output: undefined }))),
		).toMatch(/-o \/ --out is required/);
	});

	it("takes one input file at a time", () => {
		expect(
			expectMessage(resolveRenderOptions(args({ positionals: [] }))),
		).toMatch(/needs one input file/);
		expect(
			expectMessage(resolveRenderOptions(args({ positionals: ["a", "b"] }))),
		).toMatch(/one input file at a time/);
	});

	it("names the regions it knows when given another", () => {
		const message = expectMessage(
			resolveRenderOptions(args({ region: "viewport" })),
		);
		expect(message).toMatch(/unknown --region "viewport"/);
		expect(message).toMatch(/content or viewbox/);
	});

	it("accepts the viewbox region", () => {
		expect(resolveRenderOptions(args({ region: "viewbox" }))).toMatchObject({
			ok: true,
			options: { region: "viewbox" },
		});
	});

	it("rejects a scale that is not a positive number", () => {
		expect(expectMessage(resolveRenderOptions(args({ scale: "0" })))).toMatch(
			/--scale must be a positive number/,
		);
		expect(
			expectMessage(resolveRenderOptions(args({ scale: "wide" }))),
		).toMatch(/--scale must be a positive number/);
	});

	it("says why a scale means nothing for an SVG rather than ignoring it", () => {
		expect(
			expectMessage(
				resolveRenderOptions(args({ output: "out.svg", scale: "2" })),
			),
		).toMatch(/no meaning for an SVG/);
	});

	it("leaves an SVG at scale 1 when none was asked for", () => {
		expect(resolveRenderOptions(args({ output: "out.svg" }))).toMatchObject({
			ok: true,
			options: { format: "svg", scale: 1 },
		});
	});

	it("passes the background and the browser through untouched", () => {
		expect(
			resolveRenderOptions(
				args({ background: "transparent", browser: "msedge" }),
			),
		).toMatchObject({
			ok: true,
			options: { background: "transparent", browser: "msedge" },
		});
	});
});
