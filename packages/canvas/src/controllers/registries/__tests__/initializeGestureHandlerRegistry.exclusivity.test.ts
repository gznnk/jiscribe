import { beforeAll, describe, expect, it } from "vitest";

import type {
	CanvasEvent,
	EventType,
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
	{ targetKind: "connector", targetId: "c", targetPart: "segment:1" },
];

const LABEL_BOX = TARGETS[9];
const SEGMENT_BAND = TARGETS[10];

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
			supportingNames(makeEvent("click", 0, TARGETS[5])), // toolbar
		).toEqual(["toolbar-handler"]);
		expect(
			supportingNames(makeEvent("click", 0, TARGETS[0])), // canvas
		).toEqual(["canvas-handler"]);
	});

	it("routes longPress to the canvas handler wherever it lands (like right-button events)", () => {
		for (const target of [TARGETS[0], TARGETS[1], TARGETS[2], TARGETS[5]]) {
			expect(supportingNames(makeEvent("longPress", 0, target))).toEqual([
				"canvas-handler",
			]);
		}
	});

	it("splits the connector label box between tap and drag handlers", () => {
		expect(supportingNames(makeEvent("click", 0, LABEL_BOX))).toEqual([
			"connector-handler",
		]);
		expect(supportingNames(makeEvent("dragStart", 0, LABEL_BOX))).toEqual([
			"connector-label-drag-handler",
		]);
	});

	it("splits a connector segment band between tap and drag handlers", () => {
		// Taps on a segment select the connector or edit its label like any other part of the line;
		// only the drag belongs to the segment handler.
		expect(supportingNames(makeEvent("click", 0, SEGMENT_BAND))).toEqual([
			"connector-handler",
		]);
		expect(supportingNames(makeEvent("doubleClick", 0, SEGMENT_BAND))).toEqual([
			"connector-handler",
		]);
		expect(supportingNames(makeEvent("dragStart", 0, SEGMENT_BAND))).toEqual([
			"connector-segment-drag-handler",
		]);
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
