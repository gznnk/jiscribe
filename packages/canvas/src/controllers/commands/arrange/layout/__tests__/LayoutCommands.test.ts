import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import {
	buildCaptionedDoc,
	buildCaptionedFanDoc,
	buildChainDoc,
	buildGroupedDoc,
	buildKeptEndsDoc,
	buildMixedDoc,
	buildOvalRegionDoc,
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

		it("is offered for two shapes, a sole group or a sole container shape, without measuring", () => {
			const doc = buildChainDoc();
			layoutDocOps.groupObjects(doc, ["rect-1", "rect-2"]);
			const twoShapes = createState(buildChainDoc(), ["rect-4", "rect-5"]);
			const soleGroup = createState(doc, ["group-1"]);
			const soleRegion = createState(buildRegionDoc(), ["region-1"]);

			for (const state of [twoShapes, soleGroup, soleRegion]) {
				expect(
					LayoutTopToBottomCommand.canExecute(state, layoutRegistries),
				).toBe(true);
			}
		});

		it("changes nothing for a sole container shape that holds nothing", () => {
			const doc = buildRegionDoc();
			layoutDocOps.deleteObjects(doc, ["rect-1", "rect-2"]);
			const state = createState(doc, ["region-1"]);

			expect(LayoutTopToBottomCommand.canExecute(state, layoutRegistries)).toBe(
				true,
			);
			expect(LayoutTopToBottomCommand.execute(state, layoutRegistries)).toBe(
				state,
			);
		});

		it("is not offered for a sole plain shape, a connector alone, nor while text is edited", () => {
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
		for (const doc of [
			buildChainDoc(),
			buildMixedDoc(),
			buildRegionDoc(),
			buildCaptionedDoc(),
			buildCaptionedFanDoc(),
			buildGroupedDoc(),
		]) {
			const once = runLayout(createState(doc));

			expect(LayoutTopToBottomCommand.execute(once, layoutRegistries)).toBe(
				once,
			);
			const twice = runLayout(once);
			expect(twice.commitVersion).toBe(once.commitVersion);
			expect(twice.history.past).toHaveLength(once.history.past.length);
		}
	});

	it("keeps the boxes' top-left with a group in the layout", () => {
		const result = runLayout(createState(buildGroupedDoc()));

		const corners = ["rect-1", "rect-2", "rect-3"].map((id) =>
			topLeftOf(result, id),
		);
		expect(Math.min(...corners.map(({ x }) => x))).toBe(0);
		expect(Math.min(...corners.map(({ y }) => y))).toBe(0);
	});

	it("leaves an end on a declared connect point where it is, and the route to the engine", () => {
		const result = runLayout(createState(buildKeptEndsDoc()));

		const connector = result.objects["connector-1"] as ConnectorState;
		expect(connector.source).toEqual({
			owner: { id: "ported-1" },
			anchor: { kind: "connectPoint", id: "east" },
		});
		expect(connector.target.anchor.kind).toBe("edge");
		expect(connector.points).toEqual([]);
		const reversed = result.objects["connector-4"] as ConnectorState;
		expect(reversed.target).toEqual({
			owner: { id: "ported-1" },
			anchor: { kind: "connectPoint", id: "east" },
		});
		expect(reversed.source.anchor.kind).toBe("edge");
	});

	it("hands a self loop's route back to the engine", () => {
		const state = createState(buildKeptEndsDoc());

		const result = runLayout(state);

		const selfLoop = result.objects["connector-3"] as ConnectorState;
		const before = state.objects["connector-3"] as ConnectorState;
		expect(before.points).toHaveLength(3);
		expect(selfLoop.points).toEqual([]);
		expect(selfLoop.routing).toBeUndefined();
		// Its ends stay where they were.
		expect(selfLoop.source).toEqual(before.source);
		expect(selfLoop.target).toEqual(before.target);
	});

	it("moves a container whose geometry is not a rect's whole, keeping its size", () => {
		const state = createState(buildOvalRegionDoc(), ["oval-1", "rect-3"]);

		const result = runLayout(state);

		const frameOf = (target: CanvasControllerState) =>
			target.objects["oval-1"] as unknown as {
				cx: number;
				cy: number;
				width: number;
				height: number;
			};
		expect(frameOf(result).width).toBe(frameOf(state).width);
		expect(frameOf(result).height).toBe(frameOf(state).height);
		expect(frameOf(result)).not.toEqual(frameOf(state));
		expect(topLeftOf(result, "rect-2").y).toBeGreaterThan(
			topLeftOf(result, "rect-1").y,
		);
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

	describe("on shapes hanging a caption below their box", () => {
		it("arranges and restacks in one commit, which one undo takes back", () => {
			const state = createState(buildCaptionedDoc());

			const result = runLayout(state);

			expect(result.commitVersion).toBe(state.commitVersion + 1);
			expect(result.history.past).toHaveLength(state.history.past.length + 1);
			const rootIndexOf = (id: string) => result.rootIds.indexOf(id);
			expect(rootIndexOf("connector-1")).toBe(rootIndexOf("captioned-1") - 2);
			expect(rootIndexOf("connector-2")).toBe(rootIndexOf("captioned-1") - 1);
			expect(rootIndexOf("connector-5")).toBe(rootIndexOf("group-1") - 1);
			expect(topLeftOf(result, "captioned-2")).not.toEqual(
				topLeftOf(state, "captioned-2"),
			);

			const undone = reducer(result, { type: "COMMAND", commandId: "undo" });
			expect(undone.rootIds).toEqual(state.rootIds);
			expect(topLeftOf(undone, "captioned-2")).toEqual(
				topLeftOf(state, "captioned-2"),
			);
		});

		it("restacks a drawing arranged before, its lines still on top, in a commit of its own", () => {
			const once = runLayout(createState(buildCaptionedDoc()));
			// Where it was arranged, but with every line on top in the order drawn.
			const isConnector = (id: string) => id.startsWith("connector-");
			const arrangedBefore = {
				...once,
				rootIds: [
					...once.rootIds.filter((id) => !isConnector(id)),
					...once.rootIds.filter(isConnector).sort(),
				],
			};

			const result = runLayout(arrangedBefore);

			expect(result.commitVersion).toBe(arrangedBefore.commitVersion + 1);
			expect(result.rootIds).toEqual(once.rootIds);
			expect(topLeftOf(result, "captioned-2")).toEqual(
				topLeftOf(once, "captioned-2"),
			);
		});

		it("restacks a line inside a group among the group's children", () => {
			const doc = buildCaptionedDoc();
			// connector-5 joins the group's two members; written into the group by hand.
			const connector = doc.root.find(({ id }) => id === "connector-5");
			doc.root = doc.root.filter(({ id }) => id !== "connector-5");
			const group = doc.root.find(({ id }) => id === "group-1") as unknown as {
				children: unknown[];
			};
			group.children.push(connector);

			const result = runLayout(createState(doc));

			const childIdsOf = (target: CanvasControllerState) =>
				(target.objects["group-1"] as unknown as { childIds: string[] })
					.childIds;
			expect(childIdsOf(result)).toEqual([
				"connector-5",
				"captioned-4",
				"rect-2",
			]);
			expect(result.rootIds).not.toContain("connector-5");

			// Brought back to the front of the group, it is restacked in a commit of its own.
			const raised = {
				...result,
				objects: {
					...result.objects,
					"group-1": {
						...result.objects["group-1"],
						childIds: ["captioned-4", "rect-2", "connector-5"],
					} as ObjectState,
				},
			};
			const again = runLayout(raised);
			expect(again.commitVersion).toBe(raised.commitVersion + 1);
			expect(childIdsOf(again)).toEqual(childIdsOf(result));
		});
	});
});
