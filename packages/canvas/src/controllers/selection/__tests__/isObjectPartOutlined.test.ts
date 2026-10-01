import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isObjectPartOutlined } from "../isObjectPartOutlined";
import type { ObjectPartKindDefinition } from "../ObjectPartKindRegistry";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../ObjectPartSelection";

const REGION: Rect = { x: 0, y: 0, width: 10, height: 10 };

const objects: Readonly<Record<string, ObjectState>> = {
	a: { id: "a", type: "record" } as unknown as ObjectState,
};

const selectionOf = (kind: string): ObjectPartSelection => ({
	objectId: "a",
	kind,
	partIds: ["p"],
});

const registryWith = (...parts: ObjectPartKindDefinition[]) => {
	const registry = createObjectPartKindRegistry();
	registry.register("record", parts);
	return registry;
};

const outlined: ObjectPartKindDefinition = {
	kind: "textSlot",
	has: () => true,
	region: () => REGION,
};

/** A part the shape is grabbed by rather than an area of it — a callout's tail tip. */
const pointLike: ObjectPartKindDefinition = {
	kind: "tail",
	has: () => true,
};

describe("isObjectPartOutlined", () => {
	it("is true for a kind whose definition answers with a box", () => {
		expect(
			isObjectPartOutlined(
				objects,
				registryWith(outlined),
				selectionOf("textSlot"),
			),
		).toBe(true);
	});

	// The transform handles are hidden on this: a kind drawing nothing leaves them
	// nothing to compete with, so hiding them would cost the resize for no gain.
	it("is false for a kind that draws no box", () => {
		expect(
			isObjectPartOutlined(
				objects,
				registryWith(pointLike),
				selectionOf("tail"),
			),
		).toBe(false);
	});

	it("is false where nothing is selected below the object", () => {
		expect(isObjectPartOutlined(objects, registryWith(outlined), null)).toBe(
			false,
		);
	});

	it("is false for a kind the owner's type never declared", () => {
		expect(
			isObjectPartOutlined(
				objects,
				registryWith(outlined),
				selectionOf("tail"),
			),
		).toBe(false);
	});

	it("is false when the selection names an object that is gone", () => {
		expect(
			isObjectPartOutlined({}, registryWith(outlined), selectionOf("textSlot")),
		).toBe(false);
	});
});
