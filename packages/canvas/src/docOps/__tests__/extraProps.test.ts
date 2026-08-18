import { describe, expect, it } from "vitest";

import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import { emptyDoc, expectValid, readObject } from "./support/docFixtures";
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

	it("refuses any prop on a type that declares none", () => {
		const doc = emptyDoc();
		const id = badgedDocOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() => badgedDocOps.setExtraProps(doc, id, { badge: "new" })).toThrow(
			/no properties of its own/,
		);
	});
});
