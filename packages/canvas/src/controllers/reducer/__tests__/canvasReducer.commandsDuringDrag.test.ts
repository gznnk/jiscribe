import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { applyActions, command, runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { createCanvasReducer } from "../canvasReducer";

/**
 * Every drag frame is rebuilt from the drag's start snapshot, so a command that
 * edits the document mid-drag would have its change thrown away on the next
 * frame while its commit stayed in the history. Only view commands run then.
 */

const midDrag = { startSnapshot: {}, kind: "move" } as const;

const createState = (dragging: boolean): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		selection: selectionOf(["rect-1"]),
		...(dragging && {
			activeDrag: midDrag as unknown as CanvasControllerState["activeDrag"],
		}),
	});

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

		it("refuses a paste mid-drag", () => {
			const copied = runCommands(createState(false), "copy");
			const clipboard = copied.internalClipboard as ClipboardData;
			const dragging = { ...copied, activeDrag: createState(true).activeDrag };

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
