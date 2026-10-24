import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { applyActions, command, runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

/**
 * Every drag frame is rebuilt from the drag's start snapshot, so a command that
 * edits the document mid-drag would have its change thrown away on the next
 * frame while its commit stayed in the history. Only view commands run then.
 */

const midDrag = {
	kind: "move",
	startSnapshot: {},
	snapFeedback: null,
	axisLockFeedback: null,
	edgeScrollEnabled: true,
} as const;

const createState = (dragging: boolean): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		selection: selectionOf(["rect-1"]),
		...(dragging && {
			drag: midDrag as unknown as CanvasControllerState["drag"],
		}),
	});

/** A mouse gesture on the canvas background, from (-20, -20) to `last`. */
const canvasGesture = (
	type: "dragStart" | "drag" | "dragEnd",
	last: { x: number; y: number },
): CanvasAction =>
	({
		type: "GESTURE",
		gesture: {
			type,
			button: 0,
			pointerType: "mouse",
			targetKind: "canvas",
			targetId: "canvas",
			start: { x: -20, y: -20 },
			last,
			clientLast: last,
			delta: { x: last.x + 20, y: last.y + 20 },
			clientDelta: { x: last.x + 20, y: last.y + 20 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		},
	}) as unknown as CanvasAction;

/** A contributed command declaring no category, as a plugin's commonly does. */
const bumpPlugin: CanvasPlugin = {
	id: "bump-plugin",
	commands: [
		{
			id: "bump-plugin.bump",
			label: "Bump",
			canExecute: () => true,
			execute: (state) => ({
				...state,
				commitVersion: state.commitVersion + 1,
			}),
		},
	],
};

describe("canvasReducer (integration)", () => {
	describe("commands during a drag", () => {
		it.each(["delete", "move-right", "toggleBold", "selectAll"])(
			"refuses %s mid-drag, leaving the state as it was",
			(commandId) => {
				const state = createState(true);
				expect(runCommands(state, commandId)).toBe(state);
			},
		);

		it.each(["delete", "move-right", "toggleBold"])(
			"runs %s as a commit with no drag under way",
			(commandId) => {
				const state = createState(false);
				expect(runCommands(state, commandId).commitVersion).toBe(
					state.commitVersion + 1,
				);
			},
		);

		it("runs selectAll with no drag under way", () => {
			const selected = runCommands(createState(false), "selectAll");
			expect(selected.selection.objectIds).toEqual(["rect-1", "rect-2"]);
		});

		it("still runs a view command mid-drag", () => {
			const state = createState(true);
			const zoomed = runCommands(state, "zoomIn");

			expect(zoomed.viewport.zoom).toBeGreaterThan(state.viewport.zoom);
			expect(zoomed.commitVersion).toBe(state.commitVersion);
		});

		it("refuses a plugin command without a category mid-drag", () => {
			const reducer = createCanvasReducer(
				createCanvasRegistries({ plugins: [bumpPlugin] }),
			);
			const bump = command("bump-plugin.bump");

			const dragging = createState(true);
			expect(reducer(dragging, bump)).toBe(dragging);

			const idle = createState(false);
			expect(reducer(idle, bump).commitVersion).toBe(idle.commitVersion + 1);
		});

		it.each(["selectAll", "delete", "escapeSelection", "deselectAll"])(
			"refuses %s mid-marquee",
			(commandId) => {
				// rect-1 spans (0, 0)-(10, 10); the marquee from (-20, -20) encloses it.
				const marqueeing = applyActions(createState(false), [
					canvasGesture("dragStart", { x: -15, y: -15 }),
					canvasGesture("drag", { x: 30, y: 30 }),
				]);
				expect(marqueeing.drag?.kind).toBe("marquee");
				expect(runCommands(marqueeing, commandId)).toBe(marqueeing);
			},
		);

		it.each(["escapeSelection", "deselectAll"])(
			"refuses %s during a move drag",
			(commandId) => {
				const state = createState(true);
				expect(runCommands(state, commandId)).toBe(state);
			},
		);

		it("refuses a paste mid-drag", () => {
			const copied = runCommands(createState(false), "copy");
			const clipboard = copied.internalClipboard as ClipboardData;
			const dragging = { ...copied, drag: createState(true).drag };

			expect(applyActions(dragging, [{ type: "PASTE", data: clipboard }])).toBe(
				dragging,
			);
			expect(
				applyActions(copied, [{ type: "PASTE", data: clipboard }])
					.commitVersion,
			).toBe(copied.commitVersion + 1);
		});
	});
});
