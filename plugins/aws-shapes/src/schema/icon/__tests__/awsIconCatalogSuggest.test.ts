import { describe, expect, it } from "vitest";

import { awsIconCatalog } from "../awsIconCatalog";

const { suggestNames } = awsIconCatalog;

describe("awsIconCatalog.suggestNames", () => {
	it("finds the name whose words match, whatever the order", () => {
		expect(suggestNames("lambda-aws/service")).toContain("service/aws-lambda");
	});

	it("finds a name one typo away", () => {
		expect(suggestNames("service/aws-lambdaa")).toContain("service/aws-lambda");
	});

	it("offers the names that add a word to an incomplete one", () => {
		expect(suggestNames("resource/amazon-vpc/gateway")).toContain(
			"resource/amazon-vpc/internet-gateway",
		);
	});

	it("offers at most three candidates", () => {
		expect(suggestNames("service/amazon").length).toBeLessThanOrEqual(3);
	});

	it("says nothing for a name that resembles nothing", () => {
		expect(suggestNames("qqqqzzzzxxxxvvvv")).toEqual([]);
	});

	it("says nothing for a name that normalizes to nothing", () => {
		expect(suggestNames("---")).toEqual([]);
	});
});
