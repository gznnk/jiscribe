import { describe, expect, it } from "vitest";

import { SelectionControlRegistry } from "../SelectionControlRegistry";
import type { SelectionControlDefinition } from "../SelectionControlTypes";

const makeControl = (name: string): SelectionControlDefinition => ({
	name,
	Component: () => null,
	handle: (context) => ({ object: context.object }),
});

describe("SelectionControlRegistry", () => {
	it("derives the data-action and keeps the Component per registered control", () => {
		const registry = new SelectionControlRegistry();
		const control = makeControl("headerHeight");
		registry.register("container", [control]);

		const registered = registry.get("container");
		expect(registered).toHaveLength(1);
		expect(registered?.[0].action).toBe("selection:container:headerHeight");
		expect(registered?.[0].Component).toBe(control.Component);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("keeps each control's resolved layer, in declaration order", () => {
		const registry = new SelectionControlRegistry();
		registry.register("container", [
			{ ...makeControl("strip"), layer: "belowHandles" },
			makeControl("headerHeight"),
			{ ...makeControl("grip"), layer: "aboveHandles" },
		]);

		expect(
			registry
				.get("container")
				?.map(({ action, layer }) => [action, layer] as const),
		).toEqual([
			["selection:container:strip", "belowHandles"],
			["selection:container:headerHeight", "aboveHandles"],
			["selection:container:grip", "aboveHandles"],
		]);
	});

	it("throws on duplicate name within a type", () => {
		const registry = new SelectionControlRegistry();
		expect(() =>
			registry.register("container", [
				makeControl("headerHeight"),
				makeControl("headerHeight"),
			]),
		).toThrowError(/Duplicate selection control action/);
	});

	it("clear removes all registrations", () => {
		const registry = new SelectionControlRegistry();
		registry.register("container", [makeControl("headerHeight")]);
		registry.clear();
		expect(registry.get("container")).toBeUndefined();
	});
});
