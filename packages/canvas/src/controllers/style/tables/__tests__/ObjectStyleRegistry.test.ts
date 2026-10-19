import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { objectFieldEntry } from "../../entries/objectFieldEntry";
import type { StyleTable } from "../../StyleEntry";
import { createObjectStyleRegistry } from "../ObjectStyleRegistry";

const FILL_TABLE: StyleTable<ObjectState> = {
	fill: objectFieldEntry<ObjectState, "fill">("fill"),
};
const STROKE_TABLE: StyleTable<ObjectState> = {
	stroke: objectFieldEntry<ObjectState, "stroke">("stroke"),
};

describe("ObjectStyleRegistry", () => {
	it("answers the table registered for a type, as it was handed over", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", FILL_TABLE);

		expect(registry.get("fixture")).toBe(FILL_TABLE);
		expect(registry.get("unknown")).toBeUndefined();
	});

	it("replaces the table when a type is registered again", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", FILL_TABLE);
		registry.register("fixture", STROKE_TABLE);

		expect(registry.get("fixture")).toBe(STROKE_TABLE);
	});

	it("forgets every table on clear", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", FILL_TABLE);
		registry.clear();

		expect(registry.get("fixture")).toBeUndefined();
	});
});
