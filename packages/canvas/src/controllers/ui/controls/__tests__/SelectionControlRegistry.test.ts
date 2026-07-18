import { describe, expect, it } from "vitest";

import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { SelectionControlHandler } from "../../../gestures/registry/SelectionControlHandler";
import { SelectionControlRegistry } from "../SelectionControlRegistry";
import type { SelectionControlDefinition } from "../SelectionControlTypes";

class NoopHandler extends SelectionControlHandler {
	handle(state: CanvasControllerState): CanvasControllerState {
		return state;
	}
}

const makeControl = (
	objectType: ObjectType,
	partName: string,
): SelectionControlDefinition => ({
	Component: () => null,
	handler: new NoopHandler(objectType, partName),
});

describe("SelectionControlRegistry", () => {
	it("returns registered controls for the type, undefined for others", () => {
		const registry = new SelectionControlRegistry();
		const control = makeControl("container", "headerHeight");
		registry.register("container", [control]);

		expect(registry.get("container")).toEqual([control]);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("throws when the handler's objectType does not match the registered type", () => {
		const registry = new SelectionControlRegistry();
		expect(() =>
			registry.register("rect", [makeControl("container", "headerHeight")]),
		).toThrowError(/cannot be registered for type "rect"/);
	});

	it("throws on duplicate part within a type", () => {
		const registry = new SelectionControlRegistry();
		expect(() =>
			registry.register("container", [
				makeControl("container", "headerHeight"),
				makeControl("container", "headerHeight"),
			]),
		).toThrowError(/Duplicate selection control part/);
	});

	it("clear removes all registrations", () => {
		const registry = new SelectionControlRegistry();
		registry.register("container", [makeControl("container", "headerHeight")]);
		registry.clear();
		expect(registry.get("container")).toBeUndefined();
	});
});
