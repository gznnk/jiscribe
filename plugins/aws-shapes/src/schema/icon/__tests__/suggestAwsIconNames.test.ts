import { describe, expect, it } from "vitest";

import { suggestAwsIconNames } from "../suggestAwsIconNames";

describe("suggestAwsIconNames", () => {
	it("finds the name whose words match, whatever the order", () => {
		expect(suggestAwsIconNames("lambda-aws/service")).toContain(
			"service/aws-lambda",
		);
	});

	it("finds a name one typo away", () => {
		expect(suggestAwsIconNames("service/aws-lambdaa")).toContain(
			"service/aws-lambda",
		);
	});

	it("offers the names that add a word to an incomplete one", () => {
		expect(suggestAwsIconNames("resource/amazon-vpc/gateway")).toContain(
			"resource/amazon-vpc/internet-gateway",
		);
	});

	it("offers at most three candidates", () => {
		expect(suggestAwsIconNames("service/amazon").length).toBeLessThanOrEqual(3);
	});

	it("says nothing for a name that resembles nothing", () => {
		expect(suggestAwsIconNames("qqqqzzzzxxxxvvvv")).toEqual([]);
	});

	it("says nothing for a name that normalizes to nothing", () => {
		expect(suggestAwsIconNames("---")).toEqual([]);
	});
});
