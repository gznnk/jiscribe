import { describe, expect, it } from "vitest";

import { awsGroupDocDefinition, awsIconDocDefinition } from "../../doc";
import { AWS_GROUP_HEADER_HEIGHT } from "../AwsGroupDoc";

describe("awsGroupDocDefinition.container", () => {
	it("declares the group a container whose title band is the badge row", () => {
		expect(
			awsGroupDocDefinition.container?.({ id: "awsGroup-1", type: "awsGroup" }),
		).toEqual({ titleHeight: AWS_GROUP_HEADER_HEIGHT });
	});

	it("leaves the icon a box like any other", () => {
		expect(awsIconDocDefinition.container).toBeUndefined();
	});
});
