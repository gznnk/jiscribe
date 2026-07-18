import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { SelectionControlRegistry } from "../../../../registry/SelectionControlRegistry";
import type { ICanvasRegistries } from "../../../../setup/ICanvasRegistries";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { SelectionControlHandler } from "../../../registry/SelectionControlHandler";
import { ControlEventHandler } from "../ControlEventHandler";

const registries = undefined as unknown as ICanvasRegistries;

const makeState = (): CanvasControllerState =>
	({ objects: {} }) as unknown as CanvasControllerState;

const makeEvent = (targetPart: string): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "container-1",
		targetPart,
		button: 0,
		last: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const handledBy = (state: CanvasControllerState): string | undefined =>
	(state as unknown as { handledBy?: string }).handledBy;

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

/** Selection control that marks the state (part: selection:container:headerHeight). */
class SelectionMarkerHandler extends SelectionControlHandler {
	constructor() {
		super("container", "headerHeight");
	}

	handle(state: CanvasControllerState): CanvasControllerState {
		return {
			...state,
			handledBy: "selection-control",
		} as unknown as CanvasControllerState;
	}
}

const makeSelectionControlRegistry = (): SelectionControlRegistry => {
	const registry = new SelectionControlRegistry();
	registry.register("container", [
		{ Component: () => null, handler: new SelectionMarkerHandler() },
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
		expect(handledBy(next)).toBe("selection-control");
	});

	it("accepts sub-segmented parts of the same control", () => {
		const handler = new ControlEventHandler([], makeSelectionControlRegistry());
		const next = handler.handle(
			makeState(),
			makeEvent("selection:container:headerHeight:3"),
			registries,
		);
		expect(handledBy(next)).toBe("selection-control");
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
		expect(handledBy(next)).toBe("static");
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
