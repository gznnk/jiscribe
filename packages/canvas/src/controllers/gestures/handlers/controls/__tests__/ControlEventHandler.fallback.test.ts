import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../setup/ICanvasRegistries";
import { SelectionControlRegistry } from "../../../../ui/controls/SelectionControlRegistry";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ControlEventHandler } from "../ControlEventHandler";

const registries = undefined as unknown as ICanvasRegistries;

const makeContainer = (): ObjectState =>
	({ id: "container-1", type: "container" }) as unknown as ObjectState;

/** State whose current frame and start snapshot both hold a container. */
const makeState = (): CanvasControllerState =>
	({
		objects: { "container-1": makeContainer() },
		eventStartSnapshot: { objects: { "container-1": makeContainer() } },
	}) as unknown as CanvasControllerState;

const makeEvent = (targetPart: string): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "container-1",
		targetPart,
		button: 0,
		start: { x: 0, y: 0 },
		last: { x: 0, y: 0 },
		delta: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

/** Marker set at the state level by the static strategy. */
const stateMark = (state: CanvasControllerState): string | undefined =>
	(state as unknown as { handledBy?: string }).handledBy;

/** Marker set on the routed object by the selection control. */
const objectMark = (state: CanvasControllerState): string | undefined =>
	(state.objects["container-1"] as unknown as { handledBy?: string }).handledBy;

/** Static strategy that marks the state so the test can observe the route. */
class StaticMarkerStrategy extends ControlStrategy {
	supports(event: CanvasEvent): boolean {
		return event.targetPart === "resize:topLeft";
	}

	handle(state: CanvasControllerState): CanvasControllerState {
		return {
			...state,
			handledBy: "static",
		} as unknown as CanvasControllerState;
	}
}

const makeSelectionControlRegistry = (): SelectionControlRegistry => {
	const registry = new SelectionControlRegistry();
	// Marks the routed object so the test can observe the route
	// (part: selection:container:headerHeight).
	registry.register("container", [
		{
			name: "headerHeight",
			Component: () => null,
			handle: (context) =>
				({
					...context.startObject,
					handledBy: "selection-control",
				}) as unknown as ObjectState,
		},
	]);
	return registry;
};

describe("ControlEventHandler selection-control fallback", () => {
	it("routes to the registered control via the self-describing data-part", () => {
		const handler = new ControlEventHandler(
			[new StaticMarkerStrategy()],
			makeSelectionControlRegistry(),
		);
		const next = handler.handle(
			makeState(),
			makeEvent("selection:container:headerHeight"),
			registries,
		);
		expect(objectMark(next)).toBe("selection-control");
	});

	it("accepts sub-segmented parts of the same control", () => {
		const handler = new ControlEventHandler([], makeSelectionControlRegistry());
		const next = handler.handle(
			makeState(),
			makeEvent("selection:container:headerHeight:3"),
			registries,
		);
		expect(objectMark(next)).toBe("selection-control");
	});

	it("static strategies keep precedence over selection controls", () => {
		const handler = new ControlEventHandler(
			[new StaticMarkerStrategy()],
			makeSelectionControlRegistry(),
		);
		const next = handler.handle(
			makeState(),
			makeEvent("resize:topLeft"),
			registries,
		);
		expect(stateMark(next)).toBe("static");
	});

	it("returns the state unchanged for parts outside the selection namespace", () => {
		const handler = new ControlEventHandler([], makeSelectionControlRegistry());
		const state = makeState();
		const next = handler.handle(state, makeEvent("headerHeight"), registries);
		expect(next).toEqual(state);
	});

	it("returns the state unchanged when no control is registered for the type", () => {
		const handler = new ControlEventHandler([], makeSelectionControlRegistry());
		const state = makeState();
		const next = handler.handle(
			state,
			makeEvent("selection:rect:cornerRadius"),
			registries,
		);
		expect(next).toEqual(state);
	});
});
