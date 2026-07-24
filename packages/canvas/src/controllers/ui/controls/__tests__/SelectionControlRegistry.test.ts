import { describe, expect, it } from "vitest";

import { SelectionControlRegistry } from "../SelectionControlRegistry";
import type { SelectionControlDefinition } from "../SelectionControlTypes";

const makeControl = (name: string): SelectionControlDefinition => ({
	name,
	Component: () => null,
	handle: (state) => state,
});

describe("SelectionControlRegistry", () => {
	it("derives the data-part and keeps the Component per registered control", () => {
		const registry = new SelectionControlRegistry();
		const control = makeControl("headerHeight");
		registry.register("container", [control]);

		const registered = registry.get("container");
		expect(registered).toHaveLength(1);
		expect(registered?.[0].part).toBe("selection:container:headerHeight");
		expect(registered?.[0].Component).toBe(control.Component);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("throws on duplicate name within a type", () => {
		const registry = new SelectionControlRegistry();
		expect(() =>
			registry.register("container", [
				makeControl("headerHeight"),
				makeControl("headerHeight"),
			]),
		).toThrowError(/Duplicate selection control part/);
	});

	it("clear removes all registrations", () => {
		const registry = new SelectionControlRegistry();
		registry.register("container", [makeControl("headerHeight")]);
		registry.clear();
		expect(registry.get("container")).toBeUndefined();
	});
});
