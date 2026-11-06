import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { describe, expect, it } from "vitest";

import {
	buildCaptionedDoc,
	buildCaptionedFanDoc,
	buildCaptionedKeptEndDoc,
	buildChainDoc,
	buildKeptEndsDoc,
	buildMixedDoc,
	buildOutlinedDoc,
	buildOvalRegionDoc,
	buildRegionDoc,
	buildRotatedCutTopDoc,
	buildRotatedOutlinedDoc,
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

/** The stacking order of a doc: each parent's children in drawing order, the root's under "". */
const stackingOf = (doc: CanvasDoc): Record<string, string[]> => {
	const childIdsByParentId: Record<string, string[]> = {};
	const visit = (parentId: string, objects: readonly ObjectDoc[]): void => {
		childIdsByParentId[parentId] = objects.map(({ id }) => id);
		for (const object of objects) {
			const { children } = object as { children?: ObjectDoc[] };
			if (children !== undefined) {
				visit(object.id, children);
			}
		}
	};
	visit("", doc.root);
	return childIdsByParentId;
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
 *
 * @returns The state the command left
 */
const expectSameAsDocOps = (
	doc: CanvasDoc,
	selectedIds: readonly string[],
	commandId: string,
	direction: "TB" | "LR",
): CanvasControllerState => {
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
	const commandDoc = canvasToDoc(viaCommand, layoutRegistries.objectMapper);
	const docOpsDoc = canvasToDoc(docOpsState, layoutRegistries.objectMapper);
	expect(indexWithoutPoints(commandDoc)).toEqual(indexWithoutPoints(docOpsDoc));
	expect(stackingOf(commandDoc)).toEqual(stackingOf(docOpsDoc));
	// The reducer moves a route's two outer corners onto the drawn ends, so the doc
	// op's corners are compared after the same pass.
	expect(reconciledPointsOf(viaCommand)).toEqual(
		reconciledPointsOf(docOpsState),
	);
	return viaCommand;
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

	it("for an end on a declared connect point and a self loop", () => {
		expectSameAsDocOps(
			buildKeptEndsDoc(),
			["ported-1", "rect-1", "rect-2"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
	});

	it("for a container moved whole", () => {
		expectSameAsDocOps(
			buildOvalRegionDoc(),
			["oval-1", "rect-3"],
			LayoutLeftToRightCommand.id,
			"LR",
		);
	});

	it("for shapes whose outline is not their box", () => {
		expectSameAsDocOps(
			buildOutlinedDoc(),
			["slanted-1", "rect-1", "rect-2"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
		expectSameAsDocOps(
			buildOutlinedDoc(),
			["region-1", "cut-top-1"],
			LayoutLeftToRightCommand.id,
			"LR",
		);
		expectSameAsDocOps(
			buildRotatedOutlinedDoc(),
			["slanted-1", "rect-1", "rect-2"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
	});

	it("for shapes hanging a caption below their box, restacking the lines under them", () => {
		const captionedIds = [
			"region-1",
			"captioned-1",
			"captioned-2",
			"captioned-3",
			"rect-1",
			"group-1",
		];
		const viaCommand = expectSameAsDocOps(
			buildCaptionedDoc(),
			captionedIds,
			LayoutTopToBottomCommand.id,
			"TB",
		);
		// Each line leaving a caption downward is just beneath its shape, the one in the
		// group just beneath the group.
		expect(viaCommand.rootIds).toEqual([
			"region-1",
			"connector-1",
			"connector-2",
			"captioned-1",
			"captioned-2",
			"connector-3",
			"captioned-3",
			"rect-1",
			"connector-5",
			"group-1",
			"connector-4",
		]);
		expectSameAsDocOps(
			buildCaptionedDoc(),
			captionedIds,
			LayoutLeftToRightCommand.id,
			"LR",
		);
		// A turned shape is laid out by its box alone, and nothing runs under its caption.
		const turned = buildCaptionedDoc();
		layoutDocOps.setRotation(turned, ["captioned-1"], 90);
		const viaTurned = expectSameAsDocOps(
			turned,
			captionedIds,
			LayoutTopToBottomCommand.id,
			"TB",
		);
		expect(viaTurned.rootIds.indexOf("connector-1")).toBeGreaterThan(
			viaTurned.rootIds.indexOf("captioned-1"),
		);
	});

	it("for a line under a caption whose route is left to the engine", () => {
		const viaCommand = expectSameAsDocOps(
			buildCaptionedKeptEndDoc(),
			["captioned-1", "captioned-2", "ported-1"],
			LayoutTopToBottomCommand.id,
			"TB",
		);
		expect(viaCommand.rootIds).toEqual([
			"connector-2",
			"captioned-1",
			"captioned-2",
			"ported-1",
			"connector-1",
		]);
	});

	it("for connectors restacking reorders, read in the shapes' order", () => {
		expectSameAsDocOps(
			buildCaptionedFanDoc(),
			Array.from({ length: 6 }, (_, index) => `captioned-${index + 1}`),
			LayoutTopToBottomCommand.id,
			"TB",
		);
	});

	it("for a rotated shape whose ends are stored on its anchor region", () => {
		const viaCommand = expectSameAsDocOps(
			buildRotatedCutTopDoc(),
			["rect-1", "cut-top-1"],
			LayoutLeftToRightCommand.id,
			"LR",
		);
		// The side's only end, in the middle of the body below the cut.
		const connector = viaCommand.objects["connector-1"];
		expect(isConnectorState(connector) && connector.target.anchor).toEqual({
			kind: "edge",
			side: "left",
			t: 0.5,
		});
	});
});
