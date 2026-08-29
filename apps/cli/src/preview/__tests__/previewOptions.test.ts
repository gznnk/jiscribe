import { describe, expect, it } from "vitest";

import { resolvePreviewOptions } from "../previewOptions";

describe("resolvePreviewOptions", () => {
	it("takes the input from the single positional and the output from -o", () => {
		expect(
			resolvePreviewOptions({
				positionals: ["diagram.jis.json"],
				output: "out/diagram.html",
			}),
		).toEqual({
			ok: true,
			options: { input: "diagram.jis.json", output: "out/diagram.html" },
		});
	});

	it("says which way the count of inputs is wrong", () => {
		expect(
			resolvePreviewOptions({ positionals: [], output: "a.html" }),
		).toEqual({ ok: false, message: "preview needs one input file" });
		expect(
			resolvePreviewOptions({ positionals: ["a", "b"], output: "a.html" }),
		).toEqual({ ok: false, message: "preview takes one input file at a time" });
	});

	it("requires an output, and requires it to be an .html", () => {
		expect(
			resolvePreviewOptions({ positionals: ["a.jis.json"] }),
		).toMatchObject({ ok: false, message: "-o / --out is required" });
		expect(
			resolvePreviewOptions({ positionals: ["a.jis.json"], output: "a.png" }),
		).toMatchObject({
			ok: false,
			message: expect.stringContaining("preview writes one HTML file"),
		});
	});

	it("does not care how the extension is cased", () => {
		expect(
			resolvePreviewOptions({ positionals: ["a.jis.json"], output: "A.HTML" }),
		).toMatchObject({ ok: true });
	});
});
