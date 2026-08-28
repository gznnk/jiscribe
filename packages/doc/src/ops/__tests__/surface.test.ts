import { describe, expect, it } from "vitest";

import { DocOperationError } from "../errors";
import { docOps, emptyDoc, expectValid } from "./support/docFixtures";

describe("setBackground", () => {
	it("writes the color the document states its surface with", () => {
		const doc = emptyDoc();

		docOps.setBackground(doc, "#fdf6e3");

		expect(doc.background).toBe("#fdf6e3");
		expectValid(doc);
	});

	it("takes any CSS color form, storing it as written", () => {
		const doc = emptyDoc();

		docOps.setBackground(doc, "rgb(20 22 26)");

		// Held as written, neither normalised nor validated, because the host is what interprets it.
		expect(doc.background).toBe("rgb(20 22 26)");
		expectValid(doc);
	});

	it("replaces a color that was already there", () => {
		const doc = emptyDoc();
		docOps.setBackground(doc, "#fdf6e3");

		docOps.setBackground(doc, "#12161c");

		expect(doc.background).toBe("#12161c");
	});

	it("drops the field on null, rather than painting a color", () => {
		const doc = emptyDoc();
		docOps.setBackground(doc, "#fdf6e3");

		docOps.setBackground(doc, null);

		// Not "paint it white" but "hand it back to the host's theme", so the key goes altogether.
		expect(Object.hasOwn(doc, "background")).toBe(false);
		expectValid(doc);
	});

	it("clears a document that never had one, without complaint", () => {
		const doc = emptyDoc();

		docOps.setBackground(doc, null);

		expect(Object.hasOwn(doc, "background")).toBe(false);
	});

	it("refuses a blank color, which no host could paint", () => {
		const doc = emptyDoc();

		expect(() => docOps.setBackground(doc, "   ")).toThrow(DocOperationError);
		expect(Object.hasOwn(doc, "background")).toBe(false);
	});

	it("leaves the drawing alone", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 10, y: 20 });
		const before = structuredClone(doc.root);

		docOps.setBackground(doc, "#fdf6e3");

		expect(doc.root).toEqual(before);
	});
});

describe("setView", () => {
	it("declares padding, keeping only the sides that say something", () => {
		const doc = emptyDoc();

		docOps.setView(doc, { padding: { top: 40, right: 0, bottom: 40 } });

		// A 0 says the same thing as leaving the side out, so it is not written.
		expect(doc.view).toEqual({ padding: { top: 40, bottom: 40 } });
		expectValid(doc);
	});

	it("writes the three parts independently, leaving the others alone", () => {
		const doc = emptyDoc();
		docOps.setView(doc, { open: "fit-width" });

		docOps.setView(doc, { scroll: "content" });

		expect(doc.view).toEqual({ open: "fit-width", scroll: "content" });
	});

	it("stops declaring one part on null, keeping the rest", () => {
		const doc = emptyDoc();
		docOps.setView(doc, { open: "fit-all", scroll: "content" });

		docOps.setView(doc, { open: null });

		expect(doc.view).toEqual({ scroll: "content" });
	});

	it("drops the whole field once nothing is declared", () => {
		const doc = emptyDoc();
		docOps.setView(doc, { open: "fit-all" });

		docOps.setView(doc, { open: null });

		expect(Object.hasOwn(doc, "view")).toBe(false);
		expectValid(doc);
	});

	it("treats an all-zero padding as declaring none", () => {
		const doc = emptyDoc();

		const declaration = docOps.setView(doc, {
			padding: { top: 0, right: 0, bottom: 0, left: 0 },
		});

		expect(Object.hasOwn(doc, "view")).toBe(false);
		// Echoing back what was asked for would have the caller say a padding of 0 was
		// declared. What comes back is the declaration as it was written.
		expect(declaration).toBeNull();
	});

	it("reports the declaration as written, not as asked for", () => {
		const doc = emptyDoc();

		const declaration = docOps.setView(doc, {
			padding: { top: 40, right: 0 },
			open: "fit-all",
		});

		expect(declaration).toEqual({ padding: { top: 40 }, open: "fit-all" });
		expect(declaration).toEqual(doc.view);
	});

	it("refuses a negative side, having written nothing", () => {
		const doc = emptyDoc();
		docOps.setView(doc, { open: "fit-all" });

		expect(() =>
			docOps.setView(doc, { padding: { top: 40, left: -1 } }),
		).toThrow(DocOperationError);
		expect(doc.view).toEqual({ open: "fit-all" });
	});

	it("refuses a mode it cannot hold", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.setView(doc, {
				open: "fit-height" as unknown as "fit-all",
			}),
		).toThrow(DocOperationError);
		expect(Object.hasOwn(doc, "view")).toBe(false);
	});

	it("refuses a call that declares nothing at all", () => {
		const doc = emptyDoc();

		expect(() => docOps.setView(doc, {})).toThrow(DocOperationError);
	});

	it("leaves the drawing alone", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 10, y: 20 });
		const before = structuredClone(doc.root);

		docOps.setView(doc, { open: "fit-all" });

		expect(doc.root).toEqual(before);
	});
});
