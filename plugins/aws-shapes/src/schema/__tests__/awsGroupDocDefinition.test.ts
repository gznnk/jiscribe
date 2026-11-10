import { describe, expect, it } from "vitest";

import { awsGroupDocDefinition, awsIconDocDefinition } from "../../doc";
import { AWS_GROUP_HEADER_HEIGHT } from "../AwsGroupDoc";

describe("awsGroupDocDefinition.layoutContainer", () => {
	it("declares the group a container whose title band is the badge row", () => {
		expect(
			awsGroupDocDefinition.layoutContainer?.({
				id: "awsGroup-1",
				type: "awsGroup",
			}),
		).toEqual({ titleHeight: AWS_GROUP_HEADER_HEIGHT });
	});

	it("leaves the icon a box like any other", () => {
		expect(awsIconDocDefinition.layoutContainer).toBeUndefined();
	});
});

describe("awsGroupDocDefinition's label", () => {
	it("is created without a background of its own, the label sitting on the frame's own fill", () => {
		const created = awsGroupDocDefinition.factory?.createDoc({ x: 0, y: 0 });
		expect(created).not.toHaveProperty("labelFill");
		expect(created).not.toHaveProperty("verticalAlign");
	});
});
