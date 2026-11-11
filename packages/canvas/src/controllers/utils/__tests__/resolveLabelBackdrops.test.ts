import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { theme } from "../../../foundation/theme/themeTokens";
import { resolveConnectorLabelBox } from "../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { buildIdsWithAncestors } from "../buildIdsWithAncestors";
import { resolveLabelBackdrops } from "../resolveLabelBackdrops";

/** Where a probe caption's box sits in its shape's local space: 40 × 20, hung under a 40 × 40 box. */
const CAPTION_REGION: Rect = { x: -20, y: 25, width: 40, height: 20 };

const registries = createTestRegistries();
registries.objectLabelBackdrop.register("frame", (state, style) => {
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
	];
});
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({ region: () => CAPTION_REGION }),
]);

type FrameOptions = {
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
		fill = "#ff0000",
		fillOpacity = 0.5,
		rotation = 0,
		parentId,
	}: FrameOptions = {},
): ObjectState =>
	({
		id,
		type: "frame",
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
	);

const WHOLE_BOX = { x: 0, y: 0, width: 40, height: 20 };

describe("resolveLabelBackdrops", () => {
	it("covers the whole box of a caption lying inside a frame, in the frame's fill", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 100, 80),
		]);
		expect(backdrops.get("shape")).toEqual([
			{ rect: WHOLE_BOX, fill: "#ff0000", fillOpacity: 0.5 },
		]);
	});

	it("leaves a caption outside every frame out", () => {
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 500, 80),
		]);
		expect(backdrops.has("shape")).toBe(false);
	});

	it("paints only the part of a box straddling the frame's edge", () => {
		// The frame's right edge at x 200; the box spans x 190..230, y 105..125.
		const backdrops = resolve([
			frame("frame", 100, 100, 200, 200),
			captioned("shape", 210, 80),
		]);
		expect(backdrops.get("shape")).toEqual([
			{
				rect: { x: 0, y: 0, width: 10, height: 20 },
				fill: "#ff0000",
				fillOpacity: 0.5,
			},
		]);
	});

	it("stacks nested frames bottom first", () => {
		const backdrops = resolve([
			frame("outer", 100, 100, 200, 200),
			frame("inner", 100, 100, 100, 100, { fill: "#0000ff", fillOpacity: 1 }),
			captioned("shape", 100, 80),
		]);
		expect(backdrops.get("shape")).toEqual([
			{ rect: WHOLE_BOX, fill: "#ff0000", fillOpacity: 0.5 },
			{ rect: WHOLE_BOX, fill: "#0000ff", fillOpacity: 1 },
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
		expect(resolve(objects, ["group"]).get("shape")).toEqual([
			{ rect: WHOLE_BOX, fill: "#ff0000", fillOpacity: 0.5 },
		]);
	});

	it("judges a rotated frame by the box's center, covering the whole box", () => {
		// Rotated 45°, the frame's corners swing out; the box's center (100, 115)
		// still lies inside it.
		const inside = resolve([
			frame("frame", 100, 100, 100, 100, { rotation: 45 }),
			captioned("shape", 100, 80),
		]);
		expect(inside.get("shape")).toEqual([
			{ rect: WHOLE_BOX, fill: "#ff0000", fillOpacity: 0.5 },
		]);

		// The box (x 140..180, y 105..125) overlaps the rotated frame's right
		// corner, but its center (160, 115) lies outside it.
		const outside = resolve([
			frame("frame", 100, 100, 100, 100, { rotation: 45 }),
			captioned("shape", 160, 80),
		]);
		expect(outside.has("shape")).toBe(false);
	});

	it("judges a rotated caption by its box's center, covering the whole box", () => {
		// Rotated 180° about (100, 80), the box's center moves to (100, 45).
		const backdrops = resolve([
			frame("frame", 100, 25, 200, 50),
			captioned("shape", 100, 80, { rotation: 180 }),
		]);
		expect(backdrops.get("shape")).toEqual([
			{ rect: WHOLE_BOX, fill: "#ff0000", fillOpacity: 0.5 },
		]);
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

	it("cuts a connector's label against the frames under it", () => {
		const label = { text: "go" };
		const connector = labelledConnector(
			"connector",
			{ x: 0, y: 100 },
			{ x: 200, y: 100 },
			label,
		);
		// The frame covers x 0..100: the label, centered on (100, 100), is half on it.
		const backdrops = resolve([frame("frame", 50, 100, 100, 200), connector]);
		const box = resolveConnectorLabelBox(label);
		const layers = backdrops.get("connector");
		expect(layers).toHaveLength(1);
		expect(layers?.[0]).toMatchObject({ fill: "#ff0000", fillOpacity: 0.5 });
		expect(layers?.[0].rect.x).toBe(0);
		expect(layers?.[0].rect.y).toBe(0);
		expect(layers?.[0].rect.width).toBeCloseTo(box.width / 2, 6);
		expect(layers?.[0].rect.height).toBeCloseTo(box.height, 6);

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
