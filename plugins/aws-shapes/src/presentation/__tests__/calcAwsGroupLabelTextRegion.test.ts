import { describe, expect, it } from "vitest";

import {
	AWS_GROUP_CORNER_ICON_SIZE,
	AWS_GROUP_LABEL_GAP,
	AWS_GROUP_PADDING,
} from "../../schema/AwsGroupDoc";
import {
	calcAwsGroupLabelTextRegion,
	calcAwsGroupVisualBounds,
} from "../calcAwsGroupLabelTextRegion";

const BOX = { width: 320, height: 200 } as const;
const SLOT = "body";

const withText = (kind: string | undefined, text: string) => ({
	...BOX,
	kind,
	text: { [SLOT]: { text } },
});

describe("calcAwsGroupLabelTextRegion", () => {
	it("starts the label right of the corner icon when the kind has one", () => {
		const region = calcAwsGroupLabelTextRegion(withText("vpc", "VPC"), SLOT);
		expect(region.x).toBe(
			-BOX.width / 2 +
				AWS_GROUP_PADDING +
				AWS_GROUP_CORNER_ICON_SIZE +
				AWS_GROUP_LABEL_GAP,
		);
	});

	it("starts the label at the padding when the kind has no corner icon", () => {
		const region = calcAwsGroupLabelTextRegion(
			withText("availability-zone", "AZ"),
			SLOT,
		);
		expect(region.x).toBe(-BOX.width / 2 + AWS_GROUP_PADDING);
	});

	it("treats an omitted or unknown kind as the default one (no corner icon)", () => {
		const omitted = calcAwsGroupLabelTextRegion(withText(undefined, "x"), SLOT);
		const unknown = calcAwsGroupLabelTextRegion(withText("subnet", "x"), SLOT);
		expect(omitted.x).toBe(-BOX.width / 2 + AWS_GROUP_PADDING);
		expect(unknown).toEqual(omitted);
	});

	it("sizes the box from the text, not from the frame", () => {
		const short = calcAwsGroupLabelTextRegion(withText("vpc", "VPC"), SLOT);
		const long = calcAwsGroupLabelTextRegion(
			withText("vpc", "VPC 10.0.0.0/16 (production, shared services)"),
			SLOT,
		);
		expect(long.width).toBeGreaterThan(short.width);
		expect(long.height).toBe(short.height);
	});

	it("grows downward only where the author typed a newline", () => {
		const oneLine = calcAwsGroupLabelTextRegion(withText("vpc", "VPC"), SLOT);
		const twoLines = calcAwsGroupLabelTextRegion(
			withText("vpc", "VPC\n10.0.0.0/16"),
			SLOT,
		);
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});

	it("centers the label on the corner icon's row", () => {
		const region = calcAwsGroupLabelTextRegion(withText("vpc", "VPC"), SLOT);
		const rowCenterY =
			-BOX.height / 2 + AWS_GROUP_PADDING + AWS_GROUP_CORNER_ICON_SIZE / 2;
		expect(region.y + region.height / 2).toBeCloseTo(rowCenterY);
	});
});

describe("calcAwsGroupVisualBounds", () => {
	const frame = {
		x: -BOX.width / 2,
		y: -BOX.height / 2,
		width: BOX.width,
		height: BOX.height,
	};

	it("is the frame alone while the label is empty", () => {
		expect(calcAwsGroupVisualBounds(withText("vpc", ""))).toEqual(frame);
		expect(calcAwsGroupVisualBounds({ ...BOX, kind: "vpc" })).toEqual(frame);
	});

	it("is the frame while the label fits inside it", () => {
		expect(calcAwsGroupVisualBounds(withText("vpc", "VPC"))).toEqual(frame);
	});

	it("widens to the right when the label runs past the frame", () => {
		const state = withText("vpc", "V".repeat(200));
		const label = calcAwsGroupLabelTextRegion(state, SLOT);
		const bounds = calcAwsGroupVisualBounds(state);
		expect(label.x + label.width).toBeGreaterThan(frame.x + frame.width);
		expect(bounds.x).toBe(frame.x);
		expect(bounds.x + bounds.width).toBeCloseTo(label.x + label.width);
	});
});
