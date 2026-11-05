import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { describe, expect, it } from "vitest";

import {
	buildChainDoc,
	buildMixedDoc,
	buildRegionDoc,
	layoutDocOps,
	layoutRegistries,
} from "./support/layoutFixtures";
import { canvasToDoc } from "../../../../../states/canvas/CanvasMapper";
import { isConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createCanvasReducer } from "../../../../reducer/canvasReducer";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { reconcileConnectorVertices } from "../../../../utils/reconcileConnectorVertices";
import { sortObjectIdsByZOrder } from "../../../../utils/sortObjectIdsByZOrder";
import {
	LayoutLeftToRightCommand,
	LayoutTopToBottomCommand,
} from "../LayoutCommands";
import { resolveLayoutScope } from "../resolveLayoutScope";

const reducer = createCanvasReducer(layoutRegistries);

/** Every object of a doc by id, groups' children included, with `points` set aside. */
const indexWithoutPoints = (doc: CanvasDoc): Map<string, unknown> => {
	const objectsById = new Map<string, unknown>();
	const visit = (objects: readonly ObjectDoc[]): void => {
		for (const object of objects) {
			const { points: _points, ...rest } = object as ObjectDoc & {
				points?: unknown;
			};
			objectsById.set(object.id, rest);
			const { children } = object as { children?: ObjectDoc[] };
			if (children !== undefined) {
				visit(children);
			}
		}
	};
	visit(doc.root);
	return objectsById;
};

/** Every connector's stored corners, after the vertex pass the reducer runs on a commit. */
const reconciledPointsOf = (
	state: CanvasControllerState,
): Record<string, unknown> =>
	Object.fromEntries(
		Object.values(reconcileConnectorVertices(state, layoutRegistries).objects)
			.filter(isConnectorState)
			.map((connector) => [connector.id, connector.points]),
	);

/**
 * Arrange `doc` through the command with `selectedIds` selected, and through the
 * doc op with the ids the command resolved, and compare what each wrote.
 */
const expectSameAsDocOps = (
	doc: CanvasDoc,
	selectedIds: readonly string[],
	commandId: string,
	direction: "TB" | "LR",
): void => {
	const state = {
		...createInitialControllerState(doc, layoutRegistries),
		selection: selectionOf(selectedIds),
	};
	// The doc op does not add a container's contents itself, so it is handed the
	// candidates the command resolved, in the same z order.
	const [graph] = resolveLayoutScope(state, layoutRegistries);
	const candidateIds = sortObjectIdsByZOrder(
		[...graph.nodes, ...graph.containers].map(({ id }) => id),
		state.objects,
		state.rootIds,
	);
	const viaCommand = reducer(state, { type: "COMMAND", commandId });

	const viaDocOps = structuredClone(doc);
	layoutDocOps.layoutObjects(viaDocOps, candidateIds, { direction });
	// Read back through the canvas, so both sides are spelled by the same mapper.
	const docOpsState = createInitialControllerState(viaDocOps, layoutRegistries);

	expect(viaCommand.commitVersion).toBe(state.commitVersion + 1);
	expect(
		indexWithoutPoints(canvasToDoc(viaCommand, layoutRegistries.objectMapper)),
	).toEqual(
		indexWithoutPoints(canvasToDoc(docOpsState, layoutRegistries.objectMapper)),
	);
	// The reducer moves a route's two outer corners onto the drawn ends, so the doc
	// op's corners are compared after the same pass.
	expect(reconciledPointsOf(viaCommand)).toEqual(
		reconciledPointsOf(docOpsState),
	);
};

describe("the layout commands write what the doc op writes", () => {
	it("for a labelled chain, top to bottom and left to right", () => {
		const chainIds = ["rect-1", "rect-2", "rect-3"];
		expectSameAsDocOps(
			buildChainDoc(),
			chainIds,
			LayoutTopToBottomCommand.id,
			"TB",
		);
		expectSameAsDocOps(
			buildChainDoc(),
			chainIds,
			LayoutLeftToRightCommand.id,
			"LR",
		);
	});

	it("for nodes of every geometry", () => {
		expectSameAsDocOps(
			buildMixedDoc(),
			["rect-1", "ellipse-1", "ellipse-2", "rect-2", "polygon-1"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
	});

	it("for a region with its contents and a line to the region", () => {
		expectSameAsDocOps(
			buildRegionDoc(),
			["region-1", "rect-3"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
		expectSameAsDocOps(
			buildRegionDoc(),
			["region-1", "rect-3"],
			LayoutLeftToRightCommand.id,
			"LR",
		);
	});
});
