import type { LayoutVisualMargin } from "@jiscribe/layout";
import { describe, expect, it } from "vitest";

import { calcLabelTextBoxSize } from "../calcLabelTextBoxSize";
import {
	calcLabelTextLayoutMargin,
	listConnectorsUnderLabelText,
} from "../calcLabelTextLayoutMargin";
import { LABEL_TEXT_GAP } from "../calcLabelTextRegion";

const box = { width: 64, height: 64 };

describe("calcLabelTextLayoutMargin", () => {
	it("reaches below the box by the gap and the caption, and to the sides by what the caption is wider", () => {
		const caption = { text: "Application Load Balancer" };
		const size = calcLabelTextBoxSize(caption, undefined);
		expect(size.width).toBeGreaterThan(box.width);

		const margin = calcLabelTextLayoutMargin(
			"label",
			box,
			caption,
			undefined,
			false,
		);

		expect(margin?.top).toBe(0);
		expect(margin?.bottom).toBeCloseTo(LABEL_TEXT_GAP + size.height, 9);
		expect(margin?.left).toBeCloseTo((size.width - box.width) / 2, 9);
		expect(margin?.right).toBeCloseTo((size.width - box.width) / 2, 9);
	});

	it("reaches past no side but the bottom for a caption narrower than the box", () => {
		const margin = calcLabelTextLayoutMargin(
			"label",
			{ width: 400, height: 64 },
			{ text: "DB" },
			undefined,
			false,
		);

		expect(margin).toMatchObject({ top: 0, left: 0, right: 0 });
		expect(margin?.bottom).toBeGreaterThan(LABEL_TEXT_GAP);
	});

	it("measures the caption in the type's defaults where the caption sets nothing", () => {
		const plain = calcLabelTextLayoutMargin(
			"label",
			box,
			{ text: "Queue" },
			undefined,
			false,
		);
		const large = calcLabelTextLayoutMargin(
			"label",
			box,
			{ text: "Queue" },
			{ fontSize: 40 },
			false,
		);

		expect(large?.bottom).toBeGreaterThan(plain?.bottom ?? Infinity);
	});

	it("gives no margin to a type that hangs no caption, a turned shape or an empty caption", () => {
		const caption = { text: "Queue" };
		expect(
			calcLabelTextLayoutMargin("body", box, caption, undefined, false),
		).toBeUndefined();
		expect(
			calcLabelTextLayoutMargin(undefined, box, caption, undefined, false),
		).toBeUndefined();
		// An innerLabel caption sits inside its box, where the layout already keeps room.
		expect(
			calcLabelTextLayoutMargin("innerLabel", box, caption, undefined, false),
		).toBeUndefined();
		expect(
			calcLabelTextLayoutMargin("label", box, caption, undefined, true),
		).toBeUndefined();
		expect(
			calcLabelTextLayoutMargin("label", box, { text: "" }, undefined, false),
		).toBeUndefined();
		expect(
			calcLabelTextLayoutMargin("label", box, undefined, undefined, false),
		).toBeUndefined();
	});
});

describe("listConnectorsUnderLabelText", () => {
	const margin = { top: 0, right: 30, bottom: 26, left: 30 };
	const marginById = new Map<string, LayoutVisualMargin>([
		["a", margin],
		["b", margin],
		["flat", { left: 10, right: 10 }],
	]);
	const graphEdges = [
		{ id: "down", sourceId: "a", targetId: "b" },
		{ id: "up", sourceId: "b", targetId: "a" },
		{ id: "sideways", sourceId: "a", targetId: "b" },
		{ id: "plain", sourceId: "plain", targetId: "a" },
		{ id: "flat", sourceId: "flat", targetId: "b" },
		{ id: "kept", sourceId: "a", targetId: "b" },
	];
	const laidOut = (
		id: string,
		sourceSide: "top" | "right" | "bottom" | "left",
		targetSide: "top" | "right" | "bottom" | "left",
	) => ({
		id,
		source: { side: sourceSide, t: 0.5 },
		target: { side: targetSide, t: 0.5 },
		points: [],
	});

	it("names the owners whose bottom, where the caption hangs, an end sits on", () => {
		expect(
			listConnectorsUnderLabelText(
				[
					laidOut("down", "bottom", "top"),
					laidOut("up", "top", "bottom"),
					laidOut("sideways", "right", "left"),
					laidOut("plain", "bottom", "bottom"),
					laidOut("flat", "bottom", "top"),
					laidOut("kept", "bottom", "top"),
				],
				graphEdges,
				marginById,
				(connectorId) => connectorId !== "kept",
			),
		).toEqual([
			{ connectorId: "down", ownerIds: ["a"] },
			{ connectorId: "up", ownerIds: ["a"] },
			{ connectorId: "plain", ownerIds: ["a"] },
		]);
	});

	it("names both owners for a connector under both captions, the source's first", () => {
		expect(
			listConnectorsUnderLabelText(
				[laidOut("down", "bottom", "bottom")],
				graphEdges,
				marginById,
				() => true,
			),
		).toEqual([{ connectorId: "down", ownerIds: ["a", "b"] }]);
	});
});
