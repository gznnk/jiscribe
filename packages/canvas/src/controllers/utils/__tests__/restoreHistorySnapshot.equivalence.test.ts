import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { createCanvasParser } from "@jiscribe/doc/parse";
import { describe, expect, it } from "vitest";

import {
	canvasToDoc,
	canvasToState,
} from "../../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "../../reducer/__tests__/support/createTestState";
import { runCommands } from "../../reducer/__tests__/support/dispatch";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";

/**
 * Undo and redo restore the state an entry holds rather than rebuilding it
 * from the entry's Doc (restoreHistorySnapshot). The two are only the same
 * thing if a settled state survives a round trip through its Doc exactly, for
 * every type a document can hold — which is what this pins.
 */

const registries = createTestRegistries();

const SVG_TEXT =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

/** One of every core type, nested groups and the connector variants among them. */
const everyCoreTypeSource = {
	version: 1,
	background: "#fafafa",
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 120,
			height: 60,
			rotation: 15,
			flipX: true,
			text: "Rotated rect",
			fill: "#ffeecc",
			strokeDashType: "dashed",
		},
		// Height left to its text, so the box is derived
		{
			id: "rect-auto",
			type: "rect",
			x: 300,
			y: 0,
			width: 100,
			text: "A rect whose height follows a longer body of text",
		},
		{
			id: "ellipse-1",
			type: "ellipse",
			cx: 40,
			cy: 225,
			rx: 40,
			ry: 25,
			text: "Ellipse",
		},
		{ id: "text-label", type: "text", x: 200, y: 200, text: "Label text" },
		{
			id: "text-block",
			type: "text",
			x: 400,
			y: 200,
			width: 120,
			textLayout: "block",
			text: "A block text that wraps over a few lines at its width",
		},
		{
			id: "polygon-1",
			type: "polygon",
			points: [
				{ x: 0, y: 400 },
				{ x: 60, y: 380 },
				{ x: 90, y: 450 },
			],
		},
		{
			id: "polyline-1",
			type: "polyline",
			points: [
				{ x: 200, y: 400 },
				{ x: 260, y: 420 },
				{ x: 300, y: 380 },
			],
			endArrow: "FilledTriangle",
		},
		{
			id: "image-1",
			type: "image",
			x: 400,
			y: 400,
			width: 64,
			height: 48,
			src: "data:image/png;base64,iVBORw0KGgo=",
		},
		{
			id: "svg-1",
			type: "svg",
			x: 500,
			y: 400,
			width: 40,
			height: 40,
			svgText: SVG_TEXT,
		},
		{
			id: "group-outer",
			type: "group",
			rotation: 10,
			children: [
				{
					id: "group-inner",
					type: "group",
					children: [
						{
							id: "rect-in-1",
							type: "rect",
							x: 0,
							y: 600,
							width: 50,
							height: 50,
						},
						{
							id: "ellipse-in-1",
							type: "ellipse",
							cx: 125,
							cy: 625,
							rx: 25,
							ry: 25,
						},
					],
				},
				{
					id: "rect-in-2",
					type: "rect",
					x: 200,
					y: 650,
					width: 50,
					height: 50,
					text: "In group",
				},
			],
		},
		{
			id: "conn-owned",
			type: "connector",
			source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
			target: {
				owner: { id: "ellipse-1" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			},
		},
		{
			id: "conn-free",
			type: "connector",
			source: {
				owner: { id: "text-label" },
				anchor: { kind: "edge", side: "right", t: 0.25 },
			},
			target: { anchor: { kind: "free", point: { x: 380, y: 320 } } },
			endArrow: "FilledTriangle",
		},
		{
			id: "conn-vertices",
			type: "connector",
			routing: "orthogonal",
			source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "image-1" }, anchor: { kind: "center" } },
			points: [
				{ x: 150, y: 420 },
				{ x: 150, y: 520 },
			],
			label: { text: "Labelled", position: 0.3, offset: 6 },
		},
		{
			id: "conn-self",
			type: "connector",
			source: {
				owner: { id: "rect-auto" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { id: "rect-auto" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			},
		},
		{
			id: "conn-into-group",
			type: "connector",
			source: { owner: { id: "rect-in-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "ellipse-1" }, anchor: { kind: "center" } },
			label: { text: "Across" },
		},
	],
};

/** The fixture as the parser hands it over, so no type is fed a field it lacks. */
const parseFixture = (): CanvasDoc => {
	const parsed = createCanvasParser().parse(
		JSON.stringify(everyCoreTypeSource),
	);
	if (parsed.kind !== "ok") {
		throw new Error(`fixture does not parse: ${JSON.stringify(parsed)}`);
	}
	expect(parsed.warnings).toEqual([]);
	return parsed.doc;
};

const everyCoreTypeDoc = parseFixture();

const ALL_IDS = [
	"rect-1",
	"rect-auto",
	"ellipse-1",
	"text-label",
	"text-block",
	"polygon-1",
	"polyline-1",
	"image-1",
	"svg-1",
	"group-outer",
	"conn-owned",
	"conn-free",
	"conn-vertices",
	"conn-self",
	"conn-into-group",
];

/** The document half of a state, the part a history entry holds. */
const documentOf = (state: CanvasState): CanvasState => ({
	objects: state.objects,
	rootIds: state.rootIds,
	background: state.background,
	view: state.view,
	...(state.opaqueObjects !== undefined
		? { opaqueObjects: state.opaqueObjects }
		: {}),
});

/** What restoring through the Doc, as undo did before it restored state, gives. */
const rebuiltThroughDoc = (state: CanvasState): CanvasState =>
	documentOf(
		canvasToState(
			canvasToDoc(state, registries.objectMapper),
			registries.objectMapper,
			registries.objectContentResizer,
		),
	);

const expectRoundTripExact = (state: CanvasControllerState): void => {
	expect(rebuiltThroughDoc(state)).toStrictEqual(documentOf(state));
};

describe("restoring an entry's state equals rebuilding it through its Doc", () => {
	it("holds for a freshly loaded document of every core type", () => {
		const loaded = createTestState(everyCoreTypeDoc);
		// Every type is really there, connectors and nesting included.
		expect(Object.keys(loaded.objects).sort()).toEqual(
			[
				...ALL_IDS,
				"group-inner",
				"rect-in-1",
				"ellipse-in-1",
				"rect-in-2",
			].sort(),
		);

		expectRoundTripExact(loaded);
	});

	it("holds for the state a committed move leaves, connectors reconciled", () => {
		const loaded = createTestState(everyCoreTypeDoc, {
			selection: selectionOf(ALL_IDS),
		});
		const moved = runCommands(loaded, "move-right", "move-down");
		expect(moved.commitVersion).toBeGreaterThan(loaded.commitVersion);

		expectRoundTripExact(moved);
	});

	it("holds for a committed move of one end of the connectors alone", () => {
		const loaded = createTestState(everyCoreTypeDoc, {
			selection: selectionOf(["image-1", "rect-auto", "rect-in-1"]),
		});
		const moved = runCommands(loaded, "move-left", "move-up");

		expectRoundTripExact(moved);
	});
});
