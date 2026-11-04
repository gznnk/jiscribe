import { describe, expect, it } from "vitest";

import { normalizeIconSetName } from "../normalizeIconSetName";

describe("normalizeIconSetName", () => {
	it("rewrites the spellings a caller reaches for into the canonical one", () => {
		expect(normalizeIconSetName("Service/AWS-Lambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeIconSetName("service/awsLambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeIconSetName("service/aws_lambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeIconSetName("  service / aws lambda ")).toBe(
			"service/aws-lambda",
		);
	});

	it("leaves digits where they are", () => {
		expect(normalizeIconSetName("service/amazon-route-53")).toBe(
			"service/amazon-route-53",
		);
		expect(
			normalizeIconSetName(
				"resource/amazon-elastic-container-service/container-1",
			),
		).toBe("resource/amazon-elastic-container-service/container-1");
	});

	it("drops a label's ampersand", () => {
		expect(normalizeIconSetName("Web & Mobile")).toBe("web-mobile");
	});

	it("drops a label's parentheses", () => {
		expect(normalizeIconSetName("Cloud Services (Classic)")).toBe(
			"cloud-services-classic",
		);
	});

	it("returns an empty string when nothing survives", () => {
		expect(normalizeIconSetName("---")).toBe("");
		expect(normalizeIconSetName("&")).toBe("");
		expect(normalizeIconSetName("ストレージ")).toBe("");
	});
});
