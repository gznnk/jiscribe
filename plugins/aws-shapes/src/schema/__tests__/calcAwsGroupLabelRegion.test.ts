import { calcLabelTextVisualBounds } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_LABEL_GAP,
	AWS_GROUP_PADDING,
} from "../AwsGroupDoc";
import { calcAwsGroupLabelRegion } from "../calcAwsGroupLabelRegion";

const BOX = { width: 320, height: 200 } as const;

const boxOf = (kind: string | undefined) => ({ ...BOX, kind });

/** The label region of a frame of `kind` labelled `text`, measured with no type defaults. */
const regionOf = (kind: string | undefined, text: string) =>
	calcAwsGroupLabelRegion(boxOf(kind), { text }, undefined);

describe("calcAwsGroupLabelRegion", () => {
	it("starts the label right of the corner icon when the kind has one", () => {
		const region = regionOf("vpc", "VPC");
		expect(region.x).toBe(
			-BOX.width / 2 +
				AWS_GROUP_PADDING +
				AWS_GROUP_CORNER_ICON_SIZE +
				AWS_GROUP_LABEL_GAP,
		);
	});

	it("starts the label at the padding when the kind has no corner icon", () => {
		const region = regionOf("availability-zone", "AZ");
		expect(region.x).toBe(-BOX.width / 2 + AWS_GROUP_PADDING);
	});

	it("treats an omitted or unknown kind as the default one (no corner icon)", () => {
		const omitted = regionOf(undefined, "x");
		const unknown = regionOf("subnet", "x");
		expect(omitted.x).toBe(-BOX.width / 2 + AWS_GROUP_PADDING);
		expect(unknown).toEqual(omitted);
	});

	it("sizes the box from the text, not from the frame", () => {
		const short = regionOf("vpc", "VPC");
		const long = regionOf(
			"vpc",
			"VPC 10.0.0.0/16 (production, shared services)",
		);
		expect(long.width).toBeGreaterThan(short.width);
		expect(long.height).toBe(short.height);
	});

	it("grows downward only where the author typed a newline", () => {
		const oneLine = regionOf("vpc", "VPC");
		const twoLines = regionOf("vpc", "VPC\n10.0.0.0/16");
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});

	it("measures the label in the type's own body defaults", () => {
		const plain = regionOf("vpc", "VPC");
		const larger = calcAwsGroupLabelRegion(
			boxOf("vpc"),
			{ text: "VPC" },
			{ fontSize: 30 },
		);
		expect(larger.height).toBeGreaterThan(plain.height);
	});

	it("centers the label on the corner icon's row", () => {
		const region = regionOf("vpc", "VPC");
		const rowCenterY =
			-BOX.height / 2 + AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE / 2;
		expect(region.y + region.height / 2).toBeCloseTo(rowCenterY);
	});
});

describe("calcAwsGroupLabelRegion as a label region the visual bounds widen by", () => {
	const frame = {
		x: -BOX.width / 2,
		y: -BOX.height / 2,
		width: BOX.width,
		height: BOX.height,
	};
	const boundsOf = (text: string | undefined) =>
		calcLabelTextVisualBounds(
			boxOf("vpc"),
			text === undefined ? undefined : { text },
			undefined,
			calcAwsGroupLabelRegion,
		);

	it("is the frame alone while the label is empty", () => {
		expect(boundsOf("")).toEqual(frame);
		expect(boundsOf(undefined)).toEqual(frame);
	});

	it("is the frame while the label fits inside it", () => {
		expect(boundsOf("VPC")).toEqual(frame);
	});

	it("widens to the right when the label runs past the frame", () => {
		const text = "V".repeat(200);
		const label = regionOf("vpc", text);
		const bounds = boundsOf(text);
		expect(label.x + label.width).toBeGreaterThan(frame.x + frame.width);
		expect(bounds.x).toBe(frame.x);
		expect(bounds.x + bounds.width).toBeCloseTo(label.x + label.width);
	});
});
