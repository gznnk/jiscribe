import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { declaredFieldEntry } from "../../entries/declaredFieldEntry";
import { objectFieldEntry } from "../../entries/objectFieldEntry";
import type { StyleTable } from "../../StyleEntry";
import { createObjectStyleRegistry } from "../ObjectStyleRegistry";

const derivedFill = objectFieldEntry<ObjectState, "fill">("fill");
const derivedStroke = objectFieldEntry<ObjectState, "stroke">("stroke");
const declaredFill = objectFieldEntry<ObjectState, "fill">("fill");
const headerHeight = declaredFieldEntry("headerHeight", "number");

const DERIVED: StyleTable<ObjectState> = {
	fill: derivedFill,
	stroke: derivedStroke,
};

describe("ObjectStyleRegistry", () => {
	it("composes the tables, a declared kind replacing the derived one", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, { fill: declaredFill });

		const table = registry.get("fixture");
		expect(table?.fill).toBe(declaredFill);
		expect(table?.stroke).toBe(derivedStroke);
	});

	it("names the kinds the type declared, core and extra alike, and no derived one", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, {
			fill: declaredFill,
			headerHeight,
		});

		expect([...registry.declaredKinds("fixture")].sort()).toEqual([
			"fill",
			"headerHeight",
		]);
	});

	it("leaves out a kind declared as undefined", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, { fill: undefined });

		expect(registry.declaredKinds("fixture").size).toBe(0);
		expect(registry.get("fixture")?.fill).toBeUndefined();
	});

	it("answers no kind for a type that declared nothing or is not registered", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, {});

		expect(registry.declaredKinds("fixture").size).toBe(0);
		expect(registry.declaredKinds("unknown").size).toBe(0);
	});

	it("replaces the declared kinds when a type is registered again", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, { fill: declaredFill });
		registry.register("fixture", DERIVED, { headerHeight });

		expect([...registry.declaredKinds("fixture")]).toEqual(["headerHeight"]);
	});

	it("forgets the declared kinds on clear", () => {
		const registry = createObjectStyleRegistry();
		registry.register("fixture", DERIVED, { fill: declaredFill });
		registry.clear();

		expect(registry.declaredKinds("fixture").size).toBe(0);
		expect(registry.get("fixture")).toBeUndefined();
	});
});
