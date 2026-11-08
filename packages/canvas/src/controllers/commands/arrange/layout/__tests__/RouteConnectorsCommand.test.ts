import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { createFrameObjectFactory } from "@jiscribe/doc/model/objects/utils/createFrameObjectFactory";
import { createDocOps } from "@jiscribe/doc/ops";
import { builtinObjectDocDefinitions } from "@jiscribe/doc/plugin/builtinObjectDocDefinitions";
import type { TransformedFrame } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import {
	buildCaptionedDoc,
	buildCaptionedFanDoc,
	buildChainDoc,
	buildCrossingDoc,
	buildKeptEndsDoc,
	buildMixedDoc,
	buildOutlinedDoc,
	buildRegionDoc,
	buildUnroundedCornerDoc,
	layoutDocOps,
	layoutRegistries,
} from "./support/layoutFixtures";
import { defaultCanvasMessages } from "../../../../../foundation/i18n/CanvasMessages";
import type { CanvasPlugin } from "../../../../../plugin/CanvasPlugin";
import { defineObject } from "../../../../../plugin/ObjectTypeDefinition";
import { canvasToDoc } from "../../../../../states/canvas/CanvasMapper";
import { createFrameMapper } from "../../../../../states/objects/base/FrameMapper";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import { createFrameBehavior } from "../../../../behaviors/base/FrameController";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createCanvasReducer } from "../../../../reducer/canvasReducer";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../../registries/CanvasRegistries";
import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { createMultiSelectGroup } from "../../../../selection/readers/createMultiSelectGroup";
import { reconcileConnectorVertices } from "../../../../utils/reconcileConnectorVertices";
import type { ExecutableCommand } from "../../../CommandTypes";
import { resolveCommandLabel } from "../../../CommandUtils";
import { ROUTE_CONNECTORS_COMMAND_ID } from "../RouteConnectorsCommand";

const reducer = createCanvasReducer(layoutRegistries);

const routeCommand = layoutRegistries.command.get(
	ROUTE_CONNECTORS_COMMAND_ID,
) as ExecutableCommand;

const createState = (
	doc: CanvasDoc,
	selectedIds: readonly string[] = [],
	registries: CanvasRegistries = layoutRegistries,
): CanvasControllerState => {
	const state = createInitialControllerState(doc, registries);
	return deepFreezeState({
		...state,
		selection: selectionOf(selectedIds),
		multiSelectGroup: createMultiSelectGroup(
			selectedIds,
			state.objects,
			registries,
		),
	});
};

const runRoute = (state: CanvasControllerState): CanvasControllerState =>
	reducer(deepFreezeState(state), {
		type: "COMMAND",
		commandId: ROUTE_CONNECTORS_COMMAND_ID,
	});

const connectorOf = (
	state: CanvasControllerState,
	id: string,
): ConnectorState => state.objects[id] as ConnectorState;

/** A doc with one group holding the chain's three rects and its two connectors outside it. */
const buildGroupedChainDoc = (): CanvasDoc => {
	const doc = buildChainDoc();
	layoutDocOps.groupObjects(doc, ["rect-1", "rect-2", "rect-3"]);
	return doc;
};

/**
 * Redraw `doc` through the command with `selectedIds` selected and through the doc op
 * with the same ids, and compare the two documents.
 */
const expectSameAsDocOp = (
	doc: CanvasDoc,
	selectedIds: readonly string[],
): void => {
	const state = createState(doc, selectedIds);
	const viaCommand = runRoute(state);

	const viaDocOp = structuredClone(doc);
	layoutDocOps.routeConnectors(
		viaDocOp,
		selectedIds.length > 0 ? selectedIds : undefined,
	);
	// Read back through the canvas and the vertex pass a commit runs, so both sides
	// are spelled by the same mapper.
	const docOpState = reconcileConnectorVertices(
		createInitialControllerState(viaDocOp, layoutRegistries),
		layoutRegistries,
	);

	expect(viaCommand.commitVersion).toBe(state.commitVersion + 1);
	expect(canvasToDoc(viaCommand, layoutRegistries.objectMapper)).toEqual(
		canvasToDoc(docOpState, layoutRegistries.objectMapper),
	);
};

describe("the routeConnectors command", () => {
	it("registers once under its id, in the arrange category, with no shortcut", () => {
		expect(routeCommand.id).toBe("routeConnectors");
		expect(routeCommand.category).toBe("arrange");
		expect(routeCommand.shortcuts).toBeUndefined();
	});

	it("is left out by a commands allow-list that does not name it", () => {
		const registries = createCanvasRegistries({ commands: ["undo"] });

		expect(registries.command.get("routeConnectors")).toBeUndefined();
	});

	it("names itself in both locales the canvas ships", () => {
		expect(resolveCommandLabel(routeCommand, defaultCanvasMessages, "en")).toBe(
			"Redraw lines only (shapes stay put)",
		);
		expect(resolveCommandLabel(routeCommand, defaultCanvasMessages, "ja")).toBe(
			"線だけ引き直す（図形は動かしません）",
		);
	});

	describe("writes what the doc op writes", () => {
		it("for every connector, with nothing selected", () => {
			for (const doc of [
				buildCrossingDoc(),
				buildChainDoc(),
				buildMixedDoc(),
				buildCaptionedDoc(),
			]) {
				expectSameAsDocOp(doc, []);
			}
		});

		it("for a selection of shapes", () => {
			expectSameAsDocOp(buildCrossingDoc(), ["rect-1", "rect-2"]);
		});

		it("for a selected connector", () => {
			expectSameAsDocOp(buildCrossingDoc(), ["connector-1"]);
		});

		it("for a group, standing for what it holds", () => {
			expectSameAsDocOp(buildGroupedChainDoc(), ["group-1"]);
		});

		it("for a container shape, standing for the shapes inside it", () => {
			expectSameAsDocOp(buildRegionDoc(), ["region-1"]);
		});
	});

	it("takes a line out of a shape it ran through", () => {
		const state = createState(buildCrossingDoc());

		const result = runRoute(state);

		const before = connectorOf(state, "connector-1");
		const after = connectorOf(result, "connector-1");
		expect(before.points).toEqual([]);
		expect(after.points.length).toBeGreaterThan(0);
	});

	it("keeps every shape where it is, down to the object", () => {
		const state = createState(buildCrossingDoc());

		const result = runRoute(state);

		for (const id of ["rect-1", "rect-2", "rect-3"]) {
			expect(result.objects[id]).toBe(state.objects[id]);
		}
	});

	it("redraws a hand-shaped connector in scope, and leaves one out of scope alone", () => {
		const allRedrawn = runRoute(createState(buildCrossingDoc()));
		expect(connectorOf(allRedrawn, "connector-2").points).not.toEqual([
			{ x: 50, y: 300 },
			{ x: 300, y: 300 },
		]);

		const state = createState(buildCrossingDoc(), ["connector-1"]);
		const result = runRoute(state);
		expect(result.objects["connector-2"]).toEqual(state.objects["connector-2"]);
	});

	describe("when nothing changes", () => {
		it("returns the state itself on a second run: no history entry, no save", () => {
			for (const doc of [
				buildCrossingDoc(),
				buildChainDoc(),
				buildMixedDoc(),
				buildRegionDoc(),
				buildCaptionedDoc(),
				buildCaptionedFanDoc(),
				buildOutlinedDoc(),
				buildKeptEndsDoc(),
				buildUnroundedCornerDoc(),
			]) {
				const once = runRoute(createState(doc));

				expect(routeCommand.execute(once, layoutRegistries)).toBe(once);
				const twice = runRoute(once);
				expect(twice.commitVersion).toBe(once.commitVersion);
				expect(twice.history.past).toHaveLength(once.history.past.length);
			}
		});

		it("returns the state itself when the selection joins nothing", () => {
			const state = createState(buildChainDoc(), ["rect-4", "rect-5"]);

			expect(routeCommand.execute(state, layoutRegistries)).toBe(state);
		});

		it("makes no commit for an out-of-scope connector whose corners lag", () => {
			const once = runRoute(createState(buildChainDoc(), ["connector-2"]));
			const lagging: CanvasControllerState = deepFreezeState({
				...once,
				objects: {
					...once.objects,
					"connector-1": {
						...connectorOf(once, "connector-1"),
						points: [{ x: 2, y: 2 }],
					} as ObjectState,
				},
			});
			expect(reconcileConnectorVertices(lagging, layoutRegistries)).not.toBe(
				lagging,
			);

			expect(routeCommand.execute(lagging, layoutRegistries)).toBe(lagging);
		});
	});

	describe("when only the stacking order changes", () => {
		const isConnector = (id: string): boolean => id.startsWith("connector-");

		it("commits a restack of the root's lines", () => {
			const once = runRoute(createState(buildCaptionedDoc()));
			const linesOnTop = {
				...once,
				rootIds: [
					...once.rootIds.filter((id) => !isConnector(id)),
					...once.rootIds.filter(isConnector).sort(),
				],
			};

			const result = runRoute(linesOnTop);

			expect(result.commitVersion).toBe(linesOnTop.commitVersion + 1);
			expect(result.rootIds).toEqual(once.rootIds);
		});

		it("commits a restack of a line inside a group", () => {
			const doc: CanvasDoc = { version: 1, root: [] };
			layoutDocOps.addObject(doc, "captioned", { x: 0, y: 0, text: "Queue" });
			layoutDocOps.addObject(doc, "rect", {
				x: 0,
				y: 300,
				width: 64,
				height: 60,
			});
			layoutDocOps.groupObjects(doc, ["captioned-1", "rect-1"]);
			layoutDocOps.connect(doc, {
				sourceId: "captioned-1",
				targetId: "rect-1",
			});
			// Joins the group's two members; written into the group by hand.
			const connector = doc.root.find(({ id }) => id === "connector-1");
			doc.root = doc.root.filter(({ id }) => id !== "connector-1");
			const group = doc.root.find(({ id }) => id === "group-1") as unknown as {
				children: unknown[];
			};
			group.children.push(connector);
			const childIdsOf = (target: CanvasControllerState): readonly string[] =>
				(target.objects["group-1"] as GroupState).childIds;
			const once = runRoute(createState(doc));
			expect(childIdsOf(once)[0]).toBe("connector-1");
			const raised = {
				...once,
				objects: {
					...once.objects,
					"group-1": {
						...once.objects["group-1"],
						childIds: ["captioned-1", "rect-1", "connector-1"],
					} as ObjectState,
				},
			};

			const result = runRoute(raised);

			expect(result.commitVersion).toBe(raised.commitVersion + 1);
			expect(childIdsOf(result)).toEqual(childIdsOf(once));
		});
	});

	it("puts an object the canvas holds aside back where the op leaves it", () => {
		const doc = buildCaptionedDoc();
		// Right behind a line the op moves, so a placement kept from before would follow it.
		const lineIndex = doc.root.findIndex(({ id }) => id === "connector-2");
		doc.root.splice(lineIndex + 1, 0, {
			id: "alien-1",
			type: "alien",
		} as ObjectDoc);
		const restacked = structuredClone(doc);
		expect(
			layoutDocOps.routeConnectors(restacked, undefined).restackedConnectorIds,
		).toContain("connector-2");

		expectSameAsDocOp(doc, []);
		expect(createState(doc).opaqueObjects).toHaveLength(1);
	});

	it("takes one Undo to restore everything, a moved label included", () => {
		const state = createState(buildCrossingDoc());

		const result = runRoute(state);

		expect(result.commitVersion).toBe(state.commitVersion + 1);
		expect(result.history.past).toHaveLength(state.history.past.length + 1);
		expect(connectorOf(result, "connector-1").label).not.toEqual(
			connectorOf(state, "connector-1").label,
		);
		const undone = reducer(result, { type: "COMMAND", commandId: "undo" });
		expect(undone.objects).toEqual(state.objects);
		expect(undone.rootIds).toEqual(state.rootIds);
	});

	it("leaves the previous state's objects as they were", () => {
		// Frozen, so a write through a shared `label` would throw rather than go unseen.
		const state = createState(buildCrossingDoc());
		const objectsBefore = structuredClone(state.objects);

		routeCommand.execute(state, layoutRegistries);

		expect(state.objects).toEqual(objectsBefore);
	});

	it("keeps the selection and rebuilds the multi-select frame around it", () => {
		const selectedIds = ["rect-1", "connector-1"];
		const state = createState(buildCrossingDoc(), selectedIds);

		const result = runRoute(state);

		expect(result.selection).toBe(state.selection);
		expect(result.multiSelectGroup).toEqual(
			createMultiSelectGroup(
				selectedIds,
				result.objects,
				layoutRegistries,
				state.multiSelectGroup,
			),
		);
	});

	describe("a picked vertex", () => {
		const vertexPart = {
			kind: "vertex",
			ranges: [{ anchorId: "0", focusId: "0" }],
		};

		it("is cleared on the connector just redrawn, which stays selected", () => {
			const state = deepFreezeState({
				...createState(buildCrossingDoc(), ["connector-2"]),
				selection: selectionOf(["connector-2"], vertexPart),
			});

			const result = routeCommand.execute(state, layoutRegistries);

			expect(result.selection.objectIds).toEqual(["connector-2"]);
			expect(result.selection.part).toBeNull();
		});

		it("is kept on a sole shape standing for the connectors redrawn", () => {
			const selection = selectionOf(["region-1"], vertexPart);
			const state = deepFreezeState({
				...createState(buildRegionDoc(), ["region-1"]),
				selection,
			});

			const result = routeCommand.execute(state, layoutRegistries);

			expect(result.commitVersion).toBe(state.commitVersion + 1);
			expect(result.selection).toBe(selection);
		});
	});

	describe("is offered", () => {
		const isOffered = (state: CanvasControllerState): boolean =>
			routeCommand.canExecute(state, layoutRegistries);

		it("with nothing selected, only when a connector joins two different objects", () => {
			const withoutLine = buildChainDoc();
			layoutDocOps.deleteObjects(withoutLine, ["connector-1", "connector-2"]);
			const selfLoopOnly = buildChainDoc();
			layoutDocOps.deleteObjects(selfLoopOnly, ["connector-1", "connector-2"]);
			layoutDocOps.connect(selfLoopOnly, {
				sourceId: "rect-1",
				targetId: "rect-1",
				sourceAnchor: "topCenter",
				targetAnchor: "rightCenter",
			});

			expect(isOffered(createState(buildChainDoc()))).toBe(true);
			expect(isOffered(createState(withoutLine))).toBe(false);
			expect(isOffered(createState(selfLoopOnly))).toBe(false);
		});

		it("for a selected connector, two shapes, a sole group or a sole container shape", () => {
			for (const state of [
				createState(buildChainDoc(), ["connector-1"]),
				createState(buildChainDoc(), ["rect-4", "rect-5"]),
				createState(buildGroupedChainDoc(), ["group-1"]),
				createState(buildRegionDoc(), ["region-1"]),
			]) {
				expect(isOffered(state)).toBe(true);
			}
		});

		it("for a connector selected after a shape", () => {
			expect(
				isOffered(createState(buildChainDoc(), ["rect-1", "connector-1"])),
			).toBe(true);
		});

		it("for a selection of two or more from its first two objects, however large", () => {
			const state = createState(buildChainDoc());
			let objectReadCount = 0;
			const countingObjects = new Proxy(state.objects, {
				get: (target, key, receiver) => {
					objectReadCount += 1;
					return Reflect.get(target, key, receiver) as unknown;
				},
			});

			expect(
				isOffered({
					...state,
					objects: countingObjects,
					selection: selectionOf([
						"rect-1",
						"rect-2",
						"rect-3",
						"rect-4",
						"rect-5",
					]),
				}),
			).toBe(true);
			expect(objectReadCount).toBe(2);
		});

		it("not for a sole plain shape, nor while text is edited", () => {
			const editing = {
				...createState(buildChainDoc(), ["connector-1"]),
				mode: { kind: "textEdit", draft: { kind: "shape", text: "" } },
			} as unknown as CanvasControllerState;

			expect(isOffered(createState(buildChainDoc(), ["rect-1"]))).toBe(false);
			expect(isOffered(editing)).toBe(false);
		});
	});

	describe("on a canvas whose objectTypes leave out a built-in a plugin supplies", () => {
		type RectLikeState = ObjectState & TransformedFrame;

		const pluginRectFeatures = {
			type: "rect",
			geometry: "rect",
			transform: true,
			connectable: true,
		} as const;

		const pluginRect: CanvasPlugin = {
			id: "plugin-rect",
			objects: {
				rect: defineObject({
					features: pluginRectFeatures,
					validateDoc: () => [],
					factory: createFrameObjectFactory({
						type: "rect",
						width: 100,
						height: 60,
					}),
					mapper: createFrameMapper<ObjectDoc, RectLikeState>(
						pluginRectFeatures,
					),
					stateValidator: () => true,
					component: () => null,
					behavior: createFrameBehavior<RectLikeState>(),
				}),
			},
		};

		it("redraws the line without calling the plugin's type a duplicate", () => {
			const registries = createCanvasRegistries({
				objectTypes: ["connector"],
				plugins: [pluginRect],
			});
			const docOps = createDocOps({
				presetDefinitions: {
					connector: builtinObjectDocDefinitions.connector,
				},
				plugins: [pluginRect],
			});
			const doc: CanvasDoc = { version: 1, root: [] };
			docOps.addObject(doc, "rect", { x: 0, y: 100 });
			docOps.addObject(doc, "rect", { x: 500, y: 100 });
			docOps.addObject(doc, "rect", { x: 250, y: 100 });
			docOps.connect(doc, {
				sourceId: "rect-1",
				targetId: "rect-2",
				sourceAnchor: "rightCenter",
				targetAnchor: "leftCenter",
			});
			const state = createState(doc, [], registries);
			const command = registries.command.get(
				"routeConnectors",
			) as ExecutableCommand;

			const result = command.execute(state, registries);

			expect(result.commitVersion).toBe(state.commitVersion + 1);
			expect(
				(result.objects["connector-1"] as ConnectorState).points.length,
			).toBeGreaterThan(0);
		});
	});
});
