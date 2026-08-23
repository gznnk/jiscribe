import { describe, expect, it } from "vitest";

import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
} from "./support/docFixtures";
import { badgeDefinition } from "./support/pluginFixtures";

const badgedDocOps = createDocOps({
	plugins: [{ id: "badged-plugin", objects: { badged: badgeDefinition } }],
});

/** A badged object at the origin, ready to be edited. */
const withBadged = (badge?: string) => {
	const doc = emptyDoc();
	const id = badgedDocOps.addObject(doc, "badged", {
		x: 0,
		y: 0,
		...(badge === undefined ? {} : { extraProps: { badge } }),
	});
	return { doc, id };
};

describe("setExtraProps", () => {
	it("sets a property the type declares and reports what it wrote", () => {
		const { doc, id } = withBadged();

		expect(badgedDocOps.setExtraProps(doc, id, { badge: "new" })).toEqual([
			"badge",
		]);
		expect(readObject(doc, id).badge).toBe("new");
		expectValid(doc);
	});

	it("replaces a value already there", () => {
		const { doc, id } = withBadged("new");

		badgedDocOps.setExtraProps(doc, id, { badge: "beta" });
		expect(readObject(doc, id).badge).toBe("beta");
	});

	it("drops a value given as undefined rather than writing it", () => {
		const { doc, id } = withBadged("new");

		expect(badgedDocOps.setExtraProps(doc, id, { badge: undefined })).toEqual(
			[],
		);
		expect(readObject(doc, id).badge).toBe("new");
	});

	it("leaves the object untouched when the type rejects the value", () => {
		const { doc, id } = withBadged("new");

		expect(() =>
			badgedDocOps.setExtraProps(doc, id, { badge: "shiny" }),
		).toThrow(DocOperationError);
		expect(readObject(doc, id).badge).toBe("new");
	});

	it("refuses a name the type does not declare", () => {
		const { doc, id } = withBadged();

		expect(() =>
			badgedDocOps.setExtraProps(doc, id, { badgeKind: "new" }),
		).toThrow(/must not carry "badgeKind"/);
	});

	it("refuses to rewrite what the object is", () => {
		const { doc, id } = withBadged();

		expect(() => badgedDocOps.setExtraProps(doc, id, { id: "other" })).toThrow(
			/must not carry "id"/,
		);
		expect(() => badgedDocOps.setExtraProps(doc, id, { type: "rect" })).toThrow(
			/must not carry "type"/,
		);
	});

	it("refuses an id that is not in the document", () => {
		const { doc } = withBadged();

		expect(() =>
			badgedDocOps.setExtraProps(doc, "nope", { badge: "new" }),
		).toThrow(DocOperationError);
	});

	it("takes the width with it when a text leaves the block layout", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 0,
			y: 0,
			width: 240,
			textLayout: "block",
			text: "body copy long enough to wrap",
		});

		expect(docOps.setExtraProps(doc, id, { textLayout: "label" })).toEqual([
			"textLayout",
		]);
		const text = readObject(doc, id);
		expect(text.textLayout).toBe("label");
		expect(text).not.toHaveProperty("width");
		expectValid(doc);
	});

	it("drops a width written in the same call that leaves the block layout", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 0,
			y: 0,
			width: 240,
			textLayout: "block",
		});

		expect(
			docOps.setExtraProps(doc, id, { textLayout: "label", width: 300 }),
		).toEqual(["textLayout"]);
		expect(readObject(doc, id)).not.toHaveProperty("width");
	});

	it("keeps the width while the text stays in the block layout", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 0,
			y: 0,
			width: 240,
			textLayout: "block",
		});

		docOps.setExtraProps(doc, id, { width: 320 });
		expect(readObject(doc, id).width).toBe(320);

		docOps.setExtraProps(doc, id, { textLayout: "block" });
		expect(readObject(doc, id).width).toBe(320);
		expectValid(doc);
	});

	it("leaves the width alone for a text that was never in the block layout", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", { x: 0, y: 0, text: "label" });

		expect(docOps.setExtraProps(doc, id, { width: 200 })).toEqual(["width"]);
		expect(readObject(doc, id).width).toBe(200);

		docOps.setExtraProps(doc, id, { textLayout: "label" });
		expect(readObject(doc, id).width).toBe(200);
	});

	it("leaves the layout — and the width — where they are for an undefined value", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 0,
			y: 0,
			width: 240,
			textLayout: "block",
		});

		expect(docOps.setExtraProps(doc, id, { textLayout: undefined })).toEqual(
			[],
		);
		const text = readObject(doc, id);
		expect(text.textLayout).toBe("block");
		expect(text.width).toBe(240);
	});

	it("refuses any prop on a type that declares none", () => {
		const doc = emptyDoc();
		const id = badgedDocOps.addObject(doc, "polygon", { x: 0, y: 0 });

		expect(() => badgedDocOps.setExtraProps(doc, id, { badge: "new" })).toThrow(
			/no properties of its own/,
		);
	});

	it("sets the body placement every single-body type carries, undeclared", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(
			docOps.setExtraProps(doc, id, { textVerticalBasis: "frame" }),
		).toEqual(["textVerticalBasis"]);
		expect(readObject(doc, id).textVerticalBasis).toBe("frame");
		expectValid(doc);
	});

	it("refuses a basis outside the two the format has", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() =>
			docOps.setExtraProps(doc, id, { textVerticalBasis: "outline" }),
		).toThrow(/must be one of: region, frame/);
		expect(readObject(doc, id).textVerticalBasis).toBeUndefined();
	});

	it("refuses the placement on a type that holds no single body", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "polygon", { x: 0, y: 0 });

		expect(() =>
			docOps.setExtraProps(doc, id, { textVerticalBasis: "frame" }),
		).toThrow(/no properties of its own/);
	});
});
