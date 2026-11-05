import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import {
	buildChainDoc,
	buildMixedDoc,
	buildRegionDoc,
	layoutDocOps,
	layoutRegistries,
} from "./support/layoutFixtures";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createCanvasReducer } from "../../../../reducer/canvasReducer";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { createMultiSelectGroup } from "../../../../selection/readers/createMultiSelectGroup";
import {
	LayoutLeftToRightCommand,
	LayoutTopToBottomCommand,
} from "../LayoutCommands";

const reducer = createCanvasReducer(layoutRegistries);

const createState = (
	doc: CanvasDoc,
	selectedIds: readonly string[] = [],
): CanvasControllerState => {
	const state = createInitialControllerState(doc, layoutRegistries);
	return deepFreezeState({
		...state,
		selection: selectionOf(selectedIds),
		multiSelectGroup: createMultiSelectGroup(
			selectedIds,
			state.objects,
			layoutRegistries,
		),
	});
};

const runLayout = (
	state: CanvasControllerState,
	commandId = LayoutTopToBottomCommand.id,
): CanvasControllerState =>
	reducer(deepFreezeState(state), { type: "COMMAND", commandId });

/** Top-left corner of a frame shape, as its doc stores it. */
const topLeftOf = (state: CanvasControllerState, id: string) => {
	const { cx, cy, width, height } = state.objects[id] as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};
	return { x: cx - width / 2, y: cy - height / 2 };
};

const objectOf = (state: CanvasControllerState, id: string): ObjectState =>
	state.objects[id];

describe("layout commands", () => {
	it("register under the ids the menus name, in the arrange category", () => {
		expect(LayoutTopToBottomCommand.id).toBe("layoutTopToBottom");
		expect(LayoutLeftToRightCommand.id).toBe("layoutLeftToRight");
		expect(layoutRegistries.command.get("layoutTopToBottom")).toBe(
			LayoutTopToBottomCommand,
		);
		expect(LayoutTopToBottomCommand.category).toBe("arrange");
		expect(LayoutTopToBottomCommand.shortcuts).toBeUndefined();
	});

	describe("with nothing selected", () => {
		it("arranges each part joined by a line in place and leaves a part with no line alone", () => {
			const state = createState(buildChainDoc());

			const result = runLayout(state);

			// The chain keeps the top-left it occupied (40, 20) and runs down.
			expect(topLeftOf(result, "rect-1")).toEqual({ x: 40, y: 20 });
			expect(topLeftOf(result, "rect-2").y).toBeGreaterThan(
				topLeftOf(result, "rect-1").y,
			);
			expect(topLeftOf(result, "rect-3").y).toBeGreaterThan(
				topLeftOf(result, "rect-2").y,
			);
			expect(objectOf(result, "rect-4")).toBe(objectOf(state, "rect-4"));
			expect(objectOf(result, "rect-5")).toBe(objectOf(state, "rect-5"));
			expect(result.commitVersion).toBe(state.commitVersion + 1);
		});

		it("leaves the contents of a region no line reaches alone", () => {
			const doc = buildRegionDoc();
			// Drop the line to the region and the one inside it.
			layoutDocOps.deleteObjects(doc, ["connector-1", "connector-2"]);
			layoutDocOps.addObject(doc, "rect", {
				x: 1000,
				y: 600,
				width: 50,
				height: 50,
			});
			layoutDocOps.connect(doc, { sourceId: "rect-3", targetId: "rect-4" });
			const state = createState(doc);

			const result = runLayout(state);

			for (const id of ["region-1", "rect-1", "rect-2"]) {
				expect(objectOf(result, id)).toBe(objectOf(state, id));
			}
			expect(topLeftOf(result, "rect-4")).not.toEqual(
				topLeftOf(state, "rect-4"),
			);
		});

		it("is offered only when a line joins two objects", () => {
			const withLine = createState(buildChainDoc());
			const doc = buildChainDoc();
			layoutDocOps.deleteObjects(doc, ["connector-1", "connector-2"]);
			const withoutLine = createState(doc);

			expect(
				LayoutTopToBottomCommand.canExecute(withLine, layoutRegistries),
			).toBe(true);
			expect(
				LayoutTopToBottomCommand.canExecute(withoutLine, layoutRegistries),
			).toBe(false);
		});
	});

	describe("with a selection", () => {
		it("arranges the selection as one graph even with no line among it", () => {
			const state = createState(buildChainDoc(), ["rect-4", "rect-5"]);

			const result = runLayout(state);

			// No edge: one rank, side by side, from the pair's top-left (900, 40).
			expect(topLeftOf(result, "rect-4")).toEqual({ x: 900, y: 40 });
			expect(topLeftOf(result, "rect-5").y).toBe(40);
			expect(objectOf(result, "rect-1")).toBe(objectOf(state, "rect-1"));
			expect(result.selection).toBe(state.selection);
		});

		it("arranges what lies inside a selected region and sizes the region to it", () => {
			const state = createState(buildRegionDoc(), ["region-1"]);

			expect(LayoutTopToBottomCommand.canExecute(state, layoutRegistries)).toBe(
				true,
			);
			const result = runLayout(state);

			const region = result.objects["region-1"] as unknown as {
				width: number;
				height: number;
			};
			expect(region.width).toBeLessThan(600);
			expect(topLeftOf(result, "rect-2").y).toBeGreaterThan(
				topLeftOf(result, "rect-1").y,
			);
			// rect-3 was not selected and does not lie inside the region.
			expect(objectOf(result, "rect-3")).toBe(objectOf(state, "rect-3"));
		});

		it("arranges the children of a selected group and fits the group's frame to them", () => {
			const doc = buildChainDoc();
			layoutDocOps.groupObjects(doc, ["rect-1", "rect-2", "rect-3"]);
			const state = createState(doc, ["group-1"]);

			// Through execute alone, which has to settle the frame itself.
			const result = LayoutTopToBottomCommand.execute(state, layoutRegistries);

			expect(topLeftOf(result, "rect-2").y).toBeGreaterThan(
				topLeftOf(result, "rect-1").y,
			);
			expect(topLeftOf(result, "rect-3").y).toBeGreaterThan(
				topLeftOf(result, "rect-2").y,
			);
			// The chain runs down from rect-1's top to rect-3's bottom (80 high).
			const group = result.objects["group-1"] as unknown as {
				cy: number;
				height: number;
			};
			expect(group.cy - group.height / 2).toBe(topLeftOf(result, "rect-1").y);
			expect(group.cy + group.height / 2).toBe(
				topLeftOf(result, "rect-3").y + 80,
			);
		});

		it("comes out the same whatever order the objects were clicked in", () => {
			// rect-4 and rect-5 share a rank, where the order the layout is handed
			// them is the order they are placed in.
			const inOrder = runLayout(
				createState(buildChainDoc(), ["rect-1", "rect-2", "rect-4", "rect-5"]),
			);
			const reversed = runLayout(
				createState(buildChainDoc(), ["rect-5", "rect-4", "rect-2", "rect-1"]),
			);

			expect(reversed.objects).toEqual(inOrder.objects);
		});

		it("rebuilds the multi-select frame around where the objects went", () => {
			const state = createState(buildChainDoc(), [
				"rect-1",
				"rect-2",
				"rect-3",
			]);

			const result = runLayout(state);

			expect(result.multiSelectGroup).toEqual(
				createMultiSelectGroup(
					["rect-1", "rect-2", "rect-3"],
					result.objects,
					layoutRegistries,
					state.multiSelectGroup,
				),
			);
			expect(result.multiSelectGroup).not.toEqual(state.multiSelectGroup);
		});

		it("is not offered for fewer than two objects to place, nor while text is edited", () => {
			const single = createState(buildChainDoc(), ["rect-1"]);
			const lineOnly = createState(buildChainDoc(), ["connector-1"]);
			const editing: CanvasControllerState = {
				...createState(buildChainDoc(), ["rect-1", "rect-2"]),
				mode: { kind: "textEdit", draft: { kind: "shape", text: "" } },
			} as unknown as CanvasControllerState;

			for (const state of [single, lineOnly, editing]) {
				expect(
					LayoutTopToBottomCommand.canExecute(state, layoutRegistries),
				).toBe(false);
			}
		});
	});

	it("runs left to right when asked", () => {
		const state = createState(buildChainDoc(), ["rect-1", "rect-2", "rect-3"]);

		const result = runLayout(state, LayoutLeftToRightCommand.id);

		expect(topLeftOf(result, "rect-2").x).toBeGreaterThan(
			topLeftOf(result, "rect-1").x,
		);
		expect(topLeftOf(result, "rect-3").x).toBeGreaterThan(
			topLeftOf(result, "rect-2").x,
		);
	});

	it("changes nothing on a second run: no history entry, no save", () => {
		for (const doc of [buildChainDoc(), buildMixedDoc(), buildRegionDoc()]) {
			const once = runLayout(createState(doc));

			expect(LayoutTopToBottomCommand.execute(once, layoutRegistries)).toBe(
				once,
			);
			const twice = runLayout(once);
			expect(twice.commitVersion).toBe(once.commitVersion);
			expect(twice.history.past).toHaveLength(once.history.past.length);
		}
	});

	it("re-anchors a line between arranged objects on the facing sides and drops its routing", () => {
		const result = runLayout(createState(buildChainDoc()));

		const connector = result.objects["connector-1"] as ConnectorState;
		expect(connector.source).toEqual({
			owner: { id: "rect-1" },
			anchor: { kind: "edge", side: "bottom", t: 0.5 },
		});
		expect(connector.target).toEqual({
			owner: { id: "rect-2" },
			anchor: { kind: "edge", side: "top", t: 0.5 },
		});
		expect(connector.routing).toBeUndefined();
	});
});
