import type { ObjectDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { awsGroupDocDefinition } from "../../doc";
// The doc side is checked against what the canvas draws; a test ships nothing.
// eslint-disable-next-line no-restricted-imports
import { calcAwsGroupLabelTextRegion } from "../../presentation/calcAwsGroupLabelTextRegion";
import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_HEADER_HEIGHT,
	AWS_GROUP_PADDING,
} from "../AwsGroupDoc";
import { calcAwsGroupTitleRegion } from "../calcAwsGroupTitleRegion";

const BOX = { width: 320, height: 200 } as const;

/** The right edge of the label as the canvas places it for the same frame. */
const calcDrawnLabelRight = (doc: {
	width: number;
	height: number;
	kind?: string;
	text: string;
	fontSize?: number;
}): number => {
	const { text, fontSize, ...frame } = doc;
	const region = calcAwsGroupLabelTextRegion(
		{
			...frame,
			text: {
				body: { text, ...(fontSize !== undefined ? { fontSize } : {}) },
			},
		},
		"body",
	);
	return region.x + region.width;
};

describe("calcAwsGroupTitleRegion", () => {
	it.each([
		["a kind with a corner badge", "vpc"],
		["a kind with no badge", "availability-zone"],
	])(
		"runs from the frame's left edge to the drawn label's right edge for %s",
		(_, kind) => {
			const doc = { ...BOX, kind, text: "Production" };

			expect(calcAwsGroupTitleRegion(doc)).toEqual({
				x: -BOX.width / 2,
				y: -BOX.height / 2,
				width: calcDrawnLabelRight(doc) + BOX.width / 2,
				height: AWS_GROUP_HEADER_HEIGHT,
			});
		},
	);

	it("measures the label in the document's own font size, as the canvas draws it", () => {
		const doc = { ...BOX, kind: "vpc", text: "Production", fontSize: 24 };
		const region = calcAwsGroupTitleRegion(doc);

		expect((region?.x as number) + (region?.width as number)).toBe(
			calcDrawnLabelRight(doc),
		);
		expect(region?.width).toBeGreaterThan(
			calcAwsGroupTitleRegion({ ...doc, fontSize: undefined })?.width as number,
		);
	});

	it.each([
		["an empty label", { text: "" }],
		["no label", {}],
	])("ends after the corner badge for %s", (_, label) => {
		expect(calcAwsGroupTitleRegion({ ...BOX, kind: "vpc", ...label })).toEqual({
			x: -BOX.width / 2,
			y: -BOX.height / 2,
			width: AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE,
			height: AWS_GROUP_HEADER_HEIGHT,
		});
	});

	it.each([
		["a kind with no badge", "availability-zone"],
		["no kind, read as the default one with no badge", undefined],
	])("is 0 wide for an empty label on %s", (_, kind) => {
		expect(calcAwsGroupTitleRegion({ ...BOX, kind, text: "" })).toMatchObject({
			x: -BOX.width / 2,
			width: 0,
		});
	});

	it("is never wider than the box, however long the label", () => {
		expect(
			calcAwsGroupTitleRegion({ ...BOX, kind: "vpc", text: "V".repeat(200) }),
		).toMatchObject({ x: -BOX.width / 2, width: BOX.width });
	});

	it.each([
		["width missing", { height: 200 }],
		["height missing", { width: 320 }],
		["width not finite", { width: Number.NaN, height: 200 }],
		["height not finite", { width: 320, height: Number.POSITIVE_INFINITY }],
	])("answers nothing with %s", (_, box) => {
		expect(
			calcAwsGroupTitleRegion({ ...box, kind: "vpc", text: "VPC" }),
		).toBeUndefined();
	});
});

describe("awsGroupDocDefinition.layoutContainerTitleRegion", () => {
	it("is calcAwsGroupTitleRegion", () => {
		const doc = {
			id: "awsGroup-1",
			type: "awsGroup",
			...BOX,
			kind: "vpc",
			text: "VPC",
		} as ObjectDoc;

		expect(awsGroupDocDefinition.layoutContainerTitleRegion?.(doc)).toEqual(
			calcAwsGroupTitleRegion(doc),
		);
	});
});
