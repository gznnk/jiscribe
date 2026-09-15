import { describe, expect, it } from "vitest";

import { AWS_GROUP_KIND_STYLES } from "../../schema/awsGroupKinds";
import { resolveAwsGroupStroke } from "../resolveAwsGroupStroke";

const STROKE_WIDTH = 2;

describe("resolveAwsGroupStroke", () => {
	it("takes the colour and the line style from the kind when the object sets neither", () => {
		const resolved = resolveAwsGroupStroke(
			undefined,
			undefined,
			"vpc",
			STROKE_WIDTH,
		);
		expect(resolved.strokeColor).toBe(AWS_GROUP_KIND_STYLES.vpc.strokeColor);
		expect(resolved.strokeDasharray).toBeUndefined();
	});

	it("lets the object's own colour win over the kind's", () => {
		expect(
			resolveAwsGroupStroke("#123456", undefined, "vpc", STROKE_WIDTH)
				.strokeColor,
		).toBe("#123456");
	});

	it("lets the object's own line style win over the kind's", () => {
		// region defaults to dotted; writing solid wins over it.
		expect(
			resolveAwsGroupStroke(undefined, "solid", "region", STROKE_WIDTH)
				.strokeDasharray,
		).toBeUndefined();
	});

	it("scales the dash pattern with the line width", () => {
		expect(
			resolveAwsGroupStroke(undefined, undefined, "region", 2).strokeDasharray,
		).toBe("2 4");
		expect(
			resolveAwsGroupStroke(undefined, undefined, "availability-zone", 2)
				.strokeDasharray,
		).toBe("8 8");
	});

	it("resolves the theme-following colour of AWS Cloud to a CSS value", () => {
		const resolved = resolveAwsGroupStroke(
			undefined,
			undefined,
			"aws-cloud",
			STROKE_WIDTH,
		);
		expect(resolved.strokeColor).not.toBe("auto");
		expect(resolved.strokeColor).toContain("var(");
	});

	it("falls back to the default kind for an unknown one", () => {
		expect(
			resolveAwsGroupStroke(undefined, undefined, "subnet", STROKE_WIDTH),
		).toEqual(
			resolveAwsGroupStroke(undefined, undefined, undefined, STROKE_WIDTH),
		);
	});
});
