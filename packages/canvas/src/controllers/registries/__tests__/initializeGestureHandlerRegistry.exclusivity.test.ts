import { beforeAll, describe, expect, it } from "vitest";

import { ContextMenuHandler } from "../../gestures/handlers/menu/ContextMenuHandler";
import { MENU_HANDLERS } from "../../gestures/handlers/menu/MenuEventHandler";
import { ObjectMenuHandler } from "../../gestures/handlers/menu/ObjectMenuHandler";
import { StencilCategoryToggleHandler } from "../../gestures/handlers/menu/StencilCategoryToggleHandler";
import { StencilLibraryItemHandler } from "../../gestures/handlers/menu/StencilLibraryItemHandler";
import { ToolbarHandler } from "../../gestures/handlers/menu/ToolbarHandler";
import { ConnectorClickHandler } from "../../gestures/handlers/objects/ConnectorClickHandler";
import { CONNECTOR_HANDLERS } from "../../gestures/handlers/objects/ConnectorEventHandler";
import { ConnectorLabelDragHandler } from "../../gestures/handlers/objects/ConnectorLabelDragHandler";
import { ConnectorSegmentMoveHandler } from "../../gestures/handlers/objects/ConnectorSegmentMoveHandler";
import { ConnectorSegmentSlideHandler } from "../../gestures/handlers/objects/ConnectorSegmentSlideHandler";
import type {
	CanvasEvent,
	EventType,
	GestureHandler,
} from "../../gestures/registry/GestureHandlerTypes";
import { createTestRegistries } from "../createCanvasRegistries";
import { initializeGestureHandlerRegistry } from "../initializeGestureHandlerRegistry";

const registries = createTestRegistries();

beforeAll(() => {
	initializeGestureHandlerRegistry(registries);
});

/**
 * Routing exclusivity (#110): registration order must never decide which
 * handler receives an event. That holds iff at most one registered handler's
 * supports() returns true for any event. This test sweeps the
 * (target x button x type) matrix and pins that invariant, so a new handler
 * with an overlapping supports() fails here instead of silently depending on
 * its registration position.
 *
 * The same sweep runs over the sub-handler arrays the connector and menu
 * routers iterate, since first-match delegation makes them order-dependent in
 * the same way.
 */

type Target = {
	targetKind: string;
	targetId: string;
	targetPart?: string;
};

const TARGETS: Target[] = [
	{ targetKind: "canvas", targetId: "canvas" },
	{ targetKind: "object", targetId: "a" },
	{ targetKind: "connector", targetId: "c" },
	{ targetKind: "control", targetId: "a", targetPart: "resize:topLeft" },
	{ targetKind: "control", targetId: "a", targetPart: "vertex:0" },
	{ targetKind: "menu", targetId: "toolbar", targetPart: "command:zoomIn" },
	{ targetKind: "menu", targetId: "context-menu", targetPart: "command:copy" },
	{ targetKind: "menu", targetId: "object-menu", targetPart: "toggle:style" },
	{ targetKind: "menu", targetId: "stencil-library", targetPart: "item:rect" },
	// Appended so the indices used below stay put.
	{ targetKind: "connector", targetId: "c", targetPart: "label" },
	{ targetKind: "connector", targetId: "c", targetPart: "segment-slide:1" },
	{
		targetKind: "menu",
		targetId: "stencil-category",
		targetPart: "toggle:basic",
	},
	{ targetKind: "connector", targetId: "c", targetPart: "segment-move:1" },
];

const LABEL_BOX = TARGETS[9];
const SLIDE_BAND = TARGETS[10];
const MOVE_BAND = TARGETS[12];

const TYPES: EventType[] = [
	"pressed",
	"click",
	"doubleClick",
	"dragStart",
	"drag",
	"dragEnd",
	"scroll",
	"zoom",
	"longPress",
];

const BUTTONS = [0, 1, 2];

const makeEvent = (
	type: EventType,
	button: number,
	target: Target,
): CanvasEvent =>
	({
		type,
		button,
		...target,
		last: { x: 0, y: 0 },
		clientLast: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const supportingNames = (event: CanvasEvent): string[] =>
	registries.gestureHandler
		.getHandlerNames()
		.filter((name) =>
			registries.gestureHandler.getHandler(name)!.supports(event),
		);

describe("gesture handler routing exclusivity (#110)", () => {
	it("at most one handler supports any (target, button, type) combination", () => {
		const violations: string[] = [];

		for (const target of TARGETS) {
			for (const button of BUTTONS) {
				for (const type of TYPES) {
					const names = supportingNames(makeEvent(type, button, target));
					if (names.length > 1) {
						violations.push(
							`${target.targetKind}/${target.targetId} button=${button} ${type} -> [${names.join(", ")}]`,
						);
					}
				}
			}
		}

		expect(violations).toEqual([]);
	});

	it("routes left-button events to the handler owning the targetKind", () => {
		expect(
			supportingNames(makeEvent("click", 0, TARGETS[1])), // object
		).toEqual(["object-handler"]);
		expect(
			supportingNames(makeEvent("click", 0, TARGETS[2])), // connector
		).toEqual(["connector-handler"]);
		expect(
			supportingNames(makeEvent("dragStart", 0, TARGETS[3])), // control
		).toEqual(["control-handler"]);
		expect(
			supportingNames(makeEvent("click", 0, TARGETS[0])), // canvas
		).toEqual(["canvas-handler"]);
	});

	it("routes every menu target to the single menu handler", () => {
		for (const target of TARGETS.filter(
			(candidate) => candidate.targetKind === "menu",
		)) {
			expect(supportingNames(makeEvent("click", 0, target))).toEqual([
				"menu-handler",
			]);
		}
	});

	it("routes both clicks and drags on connector parts to the connector handler", () => {
		for (const target of [LABEL_BOX, SLIDE_BAND, MOVE_BAND]) {
			for (const type of ["click", "doubleClick", "dragStart"] as const) {
				expect(supportingNames(makeEvent(type, 0, target))).toEqual([
					"connector-handler",
				]);
			}
		}
	});

	it("routes longPress to the canvas handler wherever it lands (like right-button events)", () => {
		for (const target of [TARGETS[0], TARGETS[1], TARGETS[2], TARGETS[5]]) {
			expect(supportingNames(makeEvent("longPress", 0, target))).toEqual([
				"canvas-handler",
			]);
		}
	});

	it("routes right-button events to canvas-handler regardless of target", () => {
		for (const target of TARGETS) {
			expect(supportingNames(makeEvent("click", 2, target))).toEqual([
				"canvas-handler",
			]);
		}
	});

	it("routes middle-button events to canvas-handler regardless of target (#159)", () => {
		for (const target of TARGETS) {
			expect(supportingNames(makeEvent("click", 1, target))).toEqual([
				"canvas-handler",
			]);
		}
	});
});

/** The sub-handlers a router would delegate to, in array order. */
const supportingHandlers = (
	handlers: readonly GestureHandler[],
	event: CanvasEvent,
): GestureHandler[] => handlers.filter((handler) => handler.supports(event));

/** The single sub-handler the router picks, or null when the event falls through. */
const routedHandler = (
	handlers: readonly GestureHandler[],
	event: CanvasEvent,
): GestureHandler | null => supportingHandlers(handlers, event)[0] ?? null;

const sweepSubExclusivity = (handlers: readonly GestureHandler[]): string[] => {
	const violations: string[] = [];

	for (const target of TARGETS) {
		for (const button of BUTTONS) {
			for (const type of TYPES) {
				const matches = supportingHandlers(
					handlers,
					makeEvent(type, button, target),
				);
				if (matches.length > 1) {
					violations.push(
						`${target.targetKind}/${target.targetId}/${target.targetPart} button=${button} ${type} -> ${matches.length} handlers`,
					);
				}
			}
		}
	}

	return violations;
};

describe("connector sub-handler routing", () => {
	it("at most one sub-handler supports any (target, button, type) combination", () => {
		expect(sweepSubExclusivity(CONNECTOR_HANDLERS)).toEqual([]);
	});

	it("splits the label box between the drag and the click handler", () => {
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("dragStart", 0, LABEL_BOX)),
		).toBe(ConnectorLabelDragHandler);
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("click", 0, LABEL_BOX)),
		).toBe(ConnectorClickHandler);
	});

	it("splits a segment band between the drag and the click handler", () => {
		// Clicks on a segment select the connector or edit its label like any other part of the line;
		// only the drag belongs to the slide handler.
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("dragStart", 0, SLIDE_BAND)),
		).toBe(ConnectorSegmentSlideHandler);
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("click", 0, SLIDE_BAND)),
		).toBe(ConnectorClickHandler);
		expect(
			routedHandler(
				CONNECTOR_HANDLERS,
				makeEvent("doubleClick", 0, SLIDE_BAND),
			),
		).toBe(ConnectorClickHandler);
	});

	it("sends the two kinds of segment drag to their own handler", () => {
		// The part name, not the connector's routing, is what separates them — supports() only ever
		// sees the event, so the band the renderer drew is the whole decision.
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("dragStart", 0, SLIDE_BAND)),
		).toBe(ConnectorSegmentSlideHandler);
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("dragStart", 0, MOVE_BAND)),
		).toBe(ConnectorSegmentMoveHandler);
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("click", 0, MOVE_BAND)),
		).toBe(ConnectorClickHandler);
	});

	it("leaves a drag on the bare line to no sub-handler", () => {
		expect(
			routedHandler(CONNECTOR_HANDLERS, makeEvent("dragStart", 0, TARGETS[2])),
		).toBeNull();
	});
});

describe("menu sub-handler routing", () => {
	it("at most one sub-handler supports any (target, button, type) combination", () => {
		expect(sweepSubExclusivity(MENU_HANDLERS)).toEqual([]);
	});

	it("splits menu events by targetId", () => {
		expect(
			routedHandler(MENU_HANDLERS, makeEvent("click", 0, TARGETS[5])),
		).toBe(ToolbarHandler);
		expect(
			routedHandler(MENU_HANDLERS, makeEvent("click", 0, TARGETS[6])),
		).toBe(ContextMenuHandler);
		expect(
			routedHandler(MENU_HANDLERS, makeEvent("click", 0, TARGETS[7])),
		).toBe(ObjectMenuHandler);
		expect(
			routedHandler(MENU_HANDLERS, makeEvent("click", 0, TARGETS[8])),
		).toBe(StencilLibraryItemHandler);
		expect(
			routedHandler(MENU_HANDLERS, makeEvent("click", 0, TARGETS[11])),
		).toBe(StencilCategoryToggleHandler);
	});

	it("leaves an unknown menu targetId to no sub-handler", () => {
		expect(
			routedHandler(
				MENU_HANDLERS,
				makeEvent("click", 0, { targetKind: "menu", targetId: "unknown" }),
			),
		).toBeNull();
	});
});
