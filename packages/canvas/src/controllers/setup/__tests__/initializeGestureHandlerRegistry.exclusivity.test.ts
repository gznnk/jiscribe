import { beforeAll, describe, expect, it } from "vitest";

import { gestureHandlerRegistry } from "../../gestures/registry/GestureHandlerRegistry";
import type {
	CanvasEvent,
	EventType,
} from "../../gestures/registry/GestureHandlerTypes";
import { initializeGestureHandlerRegistry } from "../initializeGestureHandlerRegistry";

beforeAll(() => {
	initializeGestureHandlerRegistry();
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
	{ targetKind: "menu", targetId: "shape-library", targetPart: "item:rect" },
];

const TYPES: EventType[] = [
	"pressed",
	"click",
	"doubleClick",
	"dragStart",
	"drag",
	"dragEnd",
	"scroll",
	"zoom",
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
	gestureHandlerRegistry
		.getHandlerNames()
		.filter((name) => gestureHandlerRegistry.getHandler(name)!.supports(event));

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
