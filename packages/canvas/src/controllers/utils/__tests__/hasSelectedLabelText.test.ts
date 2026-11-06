import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { hasSelectedLabelText } from "../hasSelectedLabelText";

const captioned = (id: string, text: string, parentId?: string) => ({
	id,
	type: "server",
	features: { type: "server", geometry: "rect", text: "label" },
	text: { body: { text } },
	...(parentId === undefined ? {} : { parentId }),
});

const objectsOf = (...objects: Record<string, unknown>[]) =>
	Object.fromEntries(
		objects.map((object) => [object.id, object]),
	) as unknown as Record<string, ObjectState>;

describe("hasSelectedLabelText", () => {
	it("is true when one selected label type carries caption text", () => {
		expect(
			hasSelectedLabelText({
				selection: selectionOf(["a", "b"]),
				objects: objectsOf(captioned("a", ""), captioned("b", "Web")),
			}),
		).toBe(true);
	});

	it("is false when every selected caption is empty", () => {
		expect(
			hasSelectedLabelText({
				selection: selectionOf(["a"]),
				objects: objectsOf(captioned("a", "")),
			}),
		).toBe(false);
	});

	it("is false for a type whose text is not a caption", () => {
		expect(
			hasSelectedLabelText({
				selection: selectionOf(["r"]),
				objects: objectsOf({
					id: "r",
					type: "rect",
					features: { type: "rect", geometry: "rect", text: "body" },
					text: { body: { text: "Yes" } },
				}),
			}),
		).toBe(false);
	});

	it("reaches a caption inside a selected group", () => {
		expect(
			hasSelectedLabelText({
				selection: selectionOf(["g"]),
				objects: objectsOf(
					{ id: "g", type: "group", childIds: ["a"] },
					captioned("a", "Web", "g"),
				),
			}),
		).toBe(true);
	});
});
