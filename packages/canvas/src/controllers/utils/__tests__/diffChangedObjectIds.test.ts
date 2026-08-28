import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { diffChangedObjectIds } from "../diffChangedObjectIds";

const object = (id: string): ObjectState =>
	({ id, type: "rect" }) as ObjectState;

const rect1 = object("rect-1");
const rect2 = object("rect-2");

describe("diffChangedObjectIds", () => {
	it("reports nothing when every object came through as the same instance", () => {
		const objects = { "rect-1": rect1, "rect-2": rect2 };

		expect(diffChangedObjectIds(objects, { ...objects })).toEqual([]);
	});

	it("reports an object the edit replaced", () => {
		const before = { "rect-1": rect1, "rect-2": rect2 };
		const after = { ...before, "rect-2": object("rect-2") };

		expect(diffChangedObjectIds(before, after)).toEqual(["rect-2"]);
	});

	it("reports objects added and removed", () => {
		const before = { "rect-1": rect1 };
		const after = { "rect-2": rect2 };

		expect(diffChangedObjectIds(before, after)).toEqual(["rect-1", "rect-2"]);
	});

	it("reports an equal-looking replacement, since only identity is read", () => {
		// A no-op write still replaces the instance. Reporting it costs a reveal of
		// something that looks unchanged, which is the safe direction to err in.
		const before = { "rect-1": rect1 };
		const after = { "rect-1": { ...rect1 } };

		expect(diffChangedObjectIds(before, after)).toEqual(["rect-1"]);
	});
});
