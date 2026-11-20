import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	isPointInBoundingBox,
} from "@jiscribe/geometry";
import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { theme } from "../../../foundation/theme/themeTokens";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { registerFrameLabelBackdrop } from "../../__tests__/support/registerFrameLabelBackdrop";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { buildIdsWithAncestors } from "../buildIdsWithAncestors";
import { createCowObjects } from "../cowObjects";
import { resolveLabelBackdrops } from "../resolveLabelBackdrops";

/** Where a probe caption's box sits in its shape's local space: 40 × 20, hung under a 40 × 40 box. */
const CAPTION_REGION: Rect = { x: -20, y: 25, width: 40, height: 20 };

const registries = createTestRegistries();
registerFrameLabelBackdrop(registries);
// A container-like frame: its body, then a title band over its top 30 units.
registries.objectLabelBackdrop.register("banded", (state, style) => {
	const { width, height } = state as ObjectState & {
		width: number;
		height: number;
	};
	return [
		{
			rect: { x: -width / 2, y: -height / 2, width, height },
			fill: style.fillColor,
			fillOpacity: style.fillAlpha,
		},
		{
			rect: { x: -width / 2, y: -height / 2, width, height: 30 },
			fill: "#00ff00",
			fillOpacity: style.fillAlpha,
		},
	];
});
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({ region: () => CAPTION_REGION }),
]);

type FrameOptions = {
	/** The backdrop type; "frame" (one region) unless given. */
	type?: string;
	fill?: string;
	fillOpacity?: number;
	rotation?: number;
	parentId?: string;
};

/** A backdrop frame centered on (cx, cy). */
const frame = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	{
		type = "frame",
		fill = "#ff0000",
		fillOpacity = 0.5,
		rotation = 0,
		parentId,
	}: FrameOptions = {},
): ObjectState =>
	({
		id,
		type,
		parentId,
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
		fill,
		fillOpacity,
	}) as unknown as ObjectState;

type CaptionedOptions = {
	text?: string;
	labelFill?: string;
	rotation?: number;
	parentId?: string;
};

/**
 * A 40 × 40 captioned shape centered on (cx, cy): its caption's box spans
 * x cx-20..cx+20 and y cy+25..cy+45 in world space.
 */
const captioned = (
	id: string,
	cx: number,
	cy: number,
	{
		text = "Caption",
		labelFill,
		rotation = 0,
		parentId,
	}: CaptionedOptions = {},
): ObjectState =>
	({
		id,
		type: "captioned",
		parentId,
		features: { type: "captioned", geometry: "rect", text: "label" },
		cx,
		cy,
		width: 40,
		height: 40,
		rotation,
		scaleX: 1,
		scaleY: 1,
		labelFill,
		text: { body: { text } },
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as GroupState;

/** A straight connector between two free points, labelled `text`. */
const labelledConnector = (
	id: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
	label: ConnectorState["label"],
): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: from } },
		target: { anchor: { kind: "free", point: to } },
		label,
	}) as unknown as ConnectorState;

const resolve = (
	objects: ObjectState[],
	rootIds: string[] = objects.map((obj) => obj.id),
	renderScope?: ReadonlySet<string>,
) =>
	resolveLabelBackdrops(
		Object.fromEntries(objects.map((obj) => [obj.id, obj])),
		rootIds,
		registries,
		renderScope,
	).layersByOwnerId;

const RED_LAYER = { fill: "#ff0000", fillOpacity: 0.5 };

describe("resolveLabelBackdrops", () => {
	it("gives a caption lying inside a frame the frame's fill", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 100, 80),
		]);
		expect(backdrops.get("shape")).toEqual([RED_LAYER]);
	});

	it("leaves a caption outside every frame out", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 500, 80),
		]);
		expect(backdrops.has("shape")).toBe(false);
	});

	it("gives a box straddling the frame's edge the frame's fill while its center is inside", () => {
		// The frame's right edge at x 200; the box spans x 175..215, its center at 195.
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 195, 80),
		]);
		expect(backdrops.get("shape")).toEqual([RED_LAYER]);
	});

	it("gives a box overlapping the frame nothing while its center is outside", () => {
		// The box spans x 185..225 over the frame's right edge at x 200, its center at 205.
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 205, 80),
		]);
		expect(backdrops.has("shape")).toBe(false);
	});

	it("counts a center on a region's edge as inside it, so a title band's lower edge is the band's", () => {
		// The band covers y 0..30 of a frame spanning y 0..200; the caption's box
		// spans y cy+25..cy+45, its center at cy+35.
		const layersWithCenterAt = (centerY: number) =>
			resolve([
				frame("frame", 100, 100, 200, 200, { type: "banded" }),
				captioned("shape", 100, centerY - 35),
			]).get("shape");
		expect(layersWithCenterAt(30)).toEqual([
			RED_LAYER,
			{ fill: "#00ff00", fillOpacity: 0.5 },
		]);
		expect(layersWithCenterAt(31)).toEqual([RED_LAYER]);
	});

	it("stacks nested frames bottom first", () => {
		const backdrops = resolve([
			frame("outer", 100, 100, 200, 200),
			frame("inner", 100, 100, 100, 100, { fill: "#0000ff", fillOpacity: 1 }),
			captioned("shape", 100, 80),
		]);
		expect(backdrops.get("shape")).toEqual([
			RED_LAYER,
			{ fill: "#0000ff", fillOpacity: 1 },
		]);
	});

	it("does not count a frame drawn over the caption", () => {
		const backdrops = resolve([
			captioned("shape", 100, 80),
			frame("frame", 100, 100, 200, 200),
		]);
		expect(backdrops.has("shape")).toBe(false);
	});

	it("walks a group's children where the group stands", () => {
		const objects = [
			group("group", ["frame", "shape"]),
			frame("frame", 100, 100, 200, 200, { parentId: "group" }),
			captioned("shape", 100, 80, { parentId: "group" }),
		];
		expect(resolve(objects, ["group"]).get("shape")).toEqual([RED_LAYER]);
	});

	it("judges a rotated frame by the same rule, the box's center taken into its space", () => {
		// Rotated 45°, the frame's corners swing out; the box's center (100, 115)
		// still lies inside it.
		const inside = resolve([
			frame("frame", 100, 100, 100, 100, { rotation: 45 }),
			captioned("shape", 100, 80),
		]);
		expect(inside.get("shape")).toEqual([RED_LAYER]);

		// The box (x 140..180, y 105..125) overlaps the rotated frame's right
		// corner, but its center (160, 115) lies outside it.
		const outside = resolve([
			frame("frame", 100, 100, 100, 100, { rotation: 45 }),
			captioned("shape", 160, 80),
		]);
		expect(outside.has("shape")).toBe(false);

		// Where only the rotation decides: (165, 100) lies in the rotated frame's
		// right corner, past the unrotated square's edge at x 150; (140, 140)
		// lies in the unrotated square's corner, outside the rotated one.
		const rotatedFrame = frame("frame", 100, 100, 100, 100, { rotation: 45 });
		expect(
			resolve([rotatedFrame, captioned("shape", 165, 65)]).get("shape"),
		).toEqual([RED_LAYER]);
		expect(
			resolve([rotatedFrame, captioned("shape", 140, 105)]).has("shape"),
		).toBe(false);
	});

	it("judges a rotated caption by the same rule, its box's center taken through its rotation", () => {
		// Rotated 180° about (100, 80), the box's center moves to (100, 45).
		const backdrops = resolve([
			frame("frame", 100, 25, 200, 50),
			captioned("shape", 100, 80, { rotation: 180 }),
		]);
		expect(backdrops.get("shape")).toEqual([RED_LAYER]);
		// Unrotated, the same box (y 105..125) would lie below that frame.
		expect(
			resolve([
				frame("frame", 100, 25, 200, 50),
				captioned("shape", 100, 80),
			]).has("shape"),
		).toBe(false);
	});

	it("leaves out a caption with its own color, a transparent one, or no text", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 400, 400),
			captioned("colored", 0, 0, { labelFill: "#00ff00" }),
			captioned("transparent", 50, 0, { labelFill: "transparent" }),
			captioned("empty", 100, 0, { text: "" }),
			captioned("auto", 150, 0, { labelFill: "auto" }),
		]);
		expect([...backdrops.keys()]).toEqual(["auto"]);
	});

	it("drops a frame region that paints nothing", () => {
		for (const options of [
			{ fill: "transparent" },
			{ fill: "rgba(255, 0, 0, 0)" },
			{ fill: "#ff000000" },
			{ fillOpacity: 0 },
		]) {
			const backdrops = resolve([
				frame("frame", 100, 100, 200, 200, options),
				captioned("shape", 100, 80),
			]);
			expect(backdrops.has("shape")).toBe(false);
		}
	});

	it("resolves an auto frame fill to the theme surface", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200, { fill: "auto" }),
			captioned("shape", 100, 80),
		]);
		expect(backdrops.get("shape")?.[0].fill).toBe(theme.objectSurface);
	});

	it("judges a connector's label by its anchor, the center its box is placed on", () => {
		const connector = labelledConnector(
			"connector",
			{ x: 0, y: 100 },
			{ x: 200, y: 100 },
			{ text: "go" },
		);
		// The label is centered on (100, 100); its box reaches past x 90 and x 110.
		expect(
			resolve([frame("frame", 55, 100, 110, 200), connector]).get("connector"),
		).toEqual([RED_LAYER]);
		expect(
			resolve([frame("frame", 45, 100, 90, 200), connector]).has("connector"),
		).toBe(false);

		const colored = resolve([
			frame("frame", 50, 100, 100, 200),
			labelledConnector(
				"connector",
				{ x: 0, y: 100 },
				{ x: 200, y: 100 },
				{
					text: "go",
					fill: "#00ff00",
				},
			),
		]);
		expect(colored.has("connector")).toBe(false);
	});

	it("takes an empty connector label only while it is open in the editor", () => {
		const objects = [
			frame("frame", 50, 100, 300, 200),
			labelledConnector(
				"connector",
				{ x: 0, y: 100 },
				{ x: 200, y: 100 },
				{ text: "" },
			),
		];
		expect(resolve(objects).has("connector")).toBe(false);
		const edited = resolveLabelBackdrops(
			Object.fromEntries(objects.map((obj) => [obj.id, obj])),
			objects.map((obj) => obj.id),
			registries,
			undefined,
			"connector",
		).layersByOwnerId;
		expect(edited.get("connector")).toEqual([RED_LAYER]);

		// Open in the editor or not, a label with a background of its own takes none.
		const colored = [
			frame("frame", 50, 100, 300, 200),
			labelledConnector(
				"connector",
				{ x: 0, y: 100 },
				{ x: 200, y: 100 },
				{ text: "", fill: "#00ff00" },
			),
		];
		const editedColored = resolveLabelBackdrops(
			Object.fromEntries(colored.map((obj) => [obj.id, obj])),
			colored.map((obj) => obj.id),
			registries,
			undefined,
			"connector",
		).layersByOwnerId;
		expect(editedColored.has("connector")).toBe(false);
	});

	it("reads a drag's copy-on-write view: lookups by id, a group's children, and an object the frame replaced", () => {
		const base = Object.fromEntries(
			[
				group("group", ["frame", "shape"]),
				frame("frame", 100, 100, 200, 200, { parentId: "group" }),
				captioned("shape", 100, 80, { parentId: "group" }),
				captioned("outside", 500, 80),
			].map((obj) => [obj.id, obj]),
		);
		// One frame of a drag: "shape" dragged out of the frame, "outside" into it.
		const view = createCowObjects(base);
		view.shape = captioned("shape", 500, 80, { parentId: "group" });
		view.outside = captioned("outside", 100, 80);

		const backdrops = resolveLabelBackdrops(
			view,
			["group", "outside"],
			registries,
		).layersByOwnerId;
		expect(backdrops.has("shape")).toBe(false);
		expect(backdrops.get("outside")).toEqual([RED_LAYER]);
	});

	it("turns away a center inside a rotated frame's upright box but outside the frame", () => {
		// Rotated 45°, the frame's upright box spans 100 ± 70.7; (140, 140) lies in
		// it, past the frame's edge.
		const rotatedFrame = frame("frame", 100, 100, 100, 100, { rotation: 45 });
		expect(
			resolve([rotatedFrame, captioned("shape", 140, 105)]).has("shape"),
		).toBe(false);
	});

	it("answers for every center as the exact test does, rotated, flipped or not", () => {
		const frames = [
			frame("frame", 100, 100, 120, 80),
			frame("frame", 100, 100, 120, 80, { rotation: 30 }),
			{
				...frame("frame", 100, 100, 120, 80, { rotation: 135 }),
				scaleX: -1,
			} as ObjectState,
			{ ...frame("frame", 100, 100, 120, 80), scaleY: -1 } as ObjectState,
		];
		for (const testedFrame of frames) {
			const { cx, cy, width, height, rotation, scaleX, scaleY } =
				testedFrame as ObjectState & {
					cx: number;
					cy: number;
					width: number;
					height: number;
					rotation: number;
					scaleX: number;
					scaleY: number;
				};
			// Every 5 units over a square the frame turns in, its corners and
			// edges among them.
			for (let x = 0; x <= 200; x += 5) {
				for (let y = 0; y <= 200; y += 5) {
					const local = calcInverseAffineTransformedPoint(
						x,
						y,
						scaleX,
						scaleY,
						degreesToRadians(rotation),
						cx,
						cy,
					);
					const isInside = isPointInBoundingBox(local, {
						left: -width / 2,
						top: -height / 2,
						right: width / 2,
						bottom: height / 2,
					});
					// The caption's center lies 35 below its shape's.
					const backdrops = resolve([
						testedFrame,
						captioned("shape", x, y - 35),
					]);
					expect(backdrops.has("shape"), `(${x}, ${y})`).toBe(isInside);
				}
			}
		}
	});

	it("counts only the frames inside the render scope", () => {
		const objects = [
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 100, 80),
		];
		const byId = Object.fromEntries(objects.map((obj) => [obj.id, obj]));
		const backdrops = resolve(
			objects,
			undefined,
			buildIdsWithAncestors(["shape"], byId),
		);
		expect(backdrops.has("shape")).toBe(false);
		expect(
			resolve(
				objects,
				undefined,
				buildIdsWithAncestors(["shape", "frame"], byId),
			).has("shape"),
		).toBe(true);
	});
});
