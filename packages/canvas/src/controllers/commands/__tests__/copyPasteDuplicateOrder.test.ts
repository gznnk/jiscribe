import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import { handlePaste } from "../../reducer/handlers/handlePaste";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import type { ClipboardData } from "../selection/ClipboardData";
import { CopyCommand } from "../selection/CopyCommand";

const registries = createTestRegistries();

/** A selection whose z-order has the connector "between" rect-1 and rect-2. */
const betweenState = (): CanvasControllerState =>
	createCommandState(twoRectsWithConnectorDoc, {
		selectedIds: ["rect-1", "rect-2"],
		rootIds: ["rect-1", "conn-1", "rect-2"],
	});

/** The type sequence at the tail of rootIds (the items added by duplicate/paste). */
const appendedTypes = (
	after: CanvasControllerState,
	originalLen: number,
): string[] =>
	after.rootIds.slice(originalLen).map((id) => after.objects[id]?.type ?? "");

/**
 * Copy/duplicate adds items to the front while preserving the copy set's relative stack order.
 * Verifies that a "connector sitting between two shapes" stays between them after duplication
 * (regression guard against the bug where a naive concat pushes the connector to the front).
 */
describe("preserves connectors' relative z order on copy/duplicate", () => {
	it("duplicate: connector is kept between the two shapes", () => {
		const after = runCommand(betweenState(), "duplicate");
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});

	it("copy → paste: connector is kept between the two shapes", () => {
		const state = betweenState();
		const clipboard = CopyCommand.execute(state, registries).internalClipboard;
		expect(clipboard).not.toBeNull();
		// clipboard is already z-ordered (with the connector interleaved)
		expect(clipboard?.rootIds).toEqual(["rect-1", "conn-1", "rect-2"]);

		const after = handlePaste(state, clipboard!, registries);
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});
});

/**
 * A paste that makes selectedIds non-empty must clear the mutually-exclusive
 * connector/vertex selection (regression guard for #71). Otherwise SwapArrows / Delete
 * and the like would act on an old connector/vertex that is no longer on screen.
 */
describe("maintains selection mutual exclusivity on paste", () => {
	it("pasting while a connector is selected sets selectedConnectorId to null", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: [],
			selectedConnectorId: "conn-1",
			rootIds: ["rect-1", "conn-1", "rect-2"],
		});
		const clipboard = CopyCommand.execute(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1"],
				rootIds: ["rect-1", "conn-1", "rect-2"],
			}),
			registries,
		).internalClipboard;
		expect(clipboard).not.toBeNull();

		const after = handlePaste(state, clipboard!, registries);
		expect(after.selectedConnectorId).toBeNull();
		expect(after.selectedIds.length).toBeGreaterThan(0);
	});

	it("pasting while a vertex is selected sets selectedVertex to null", () => {
		const state = createCommandState(twoRectsWithConnectorDoc, {
			selectedIds: [],
			selectedVertex: { objectId: "rect-1", vertexIndex: 0 },
			rootIds: ["rect-1", "conn-1", "rect-2"],
		});
		const clipboard = CopyCommand.execute(
			createCommandState(twoRectsWithConnectorDoc, {
				selectedIds: ["rect-1"],
				rootIds: ["rect-1", "conn-1", "rect-2"],
			}),
			registries,
		).internalClipboard;
		expect(clipboard).not.toBeNull();

		const after = handlePaste(state, clipboard!, registries);
		expect(after.selectedVertex).toBeNull();
	});
});

/**
 * The system clipboard is untrusted external input and isValidGroupState does not
 * require the group frame (it is a cached value). handlePaste must re-derive pasted
 * group frames from their children so a crafted/foreign payload cannot inject a
 * zero-size or missing frame (GroupState invariant, issue #35).
 */
describe("re-derives pasted group frames (GroupState invariant, issue #35)", () => {
	const craftedClipboard = (
		groupExtras: Record<string, unknown>,
	): ClipboardData =>
		({
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects: {
				g: {
					id: "g",
					type: "group",
					childIds: ["a"],
					rotation: 0,
					scaleX: 1,
					scaleY: 1,
					...groupExtras,
				},
				a: {
					id: "a",
					type: "rect",
					parentId: "g",
					cx: 50,
					cy: 50,
					width: 100,
					height: 60,
					rotation: 0,
					scaleX: 1,
					scaleY: 1,
				},
			},
			rootIds: ["g"],
			center: { x: 50, y: 50 },
		}) as unknown as ClipboardData;

	const pastedGroup = (after: CanvasControllerState) => {
		const pastedGroupId = after.rootIds[after.rootIds.length - 1];
		return after.objects[pastedGroupId] as unknown as {
			type: string;
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
	};

	it("a zero-size group frame is replaced with bounds derived from the children", () => {
		const state = betweenState();
		const after = handlePaste(
			state,
			craftedClipboard({ cx: 0, cy: 0, width: 0, height: 0 }),
			registries,
		);
		const group = pastedGroup(after);
		expect(group.type).toBe("group");
		// child rect (100x60 at 50,50) + paste offset (20,20)
		expect(group.cx).toBeCloseTo(70);
		expect(group.cy).toBeCloseTo(70);
		expect(group.width).toBeCloseTo(100);
		expect(group.height).toBeCloseTo(60);
	});

	it("a missing group frame is filled in with bounds derived from the children (no NaN)", () => {
		const state = betweenState();
		const after = handlePaste(state, craftedClipboard({}), registries);
		const group = pastedGroup(after);
		expect(group.type).toBe("group");
		expect(group.cx).toBeCloseTo(70);
		expect(group.cy).toBeCloseTo(70);
		expect(group.width).toBeCloseTo(100);
		expect(group.height).toBeCloseTo(60);
	});
});
