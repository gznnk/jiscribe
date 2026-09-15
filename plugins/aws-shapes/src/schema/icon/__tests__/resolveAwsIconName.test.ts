import { describe, expect, it } from "vitest";

import { AWS_ICON_ALIASES } from "../iconAliases";
import { AWS_ICON_ENTRIES } from "../iconData.generated";
import { normalizeAwsIconName } from "../normalizeAwsIconName";
import {
	isKnownAwsIconName,
	readAwsIcon,
	resolveAwsIconName,
} from "../resolveAwsIconName";

describe("normalizeAwsIconName", () => {
	it("rewrites the spellings a caller reaches for into the canonical one", () => {
		expect(normalizeAwsIconName("Service/AWS-Lambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeAwsIconName("service/awsLambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeAwsIconName("service/aws_lambda")).toBe(
			"service/aws-lambda",
		);
		expect(normalizeAwsIconName("  service / aws lambda ")).toBe(
			"service/aws-lambda",
		);
	});

	it("leaves digits where they are", () => {
		expect(normalizeAwsIconName("service/amazon-route-53")).toBe(
			"service/amazon-route-53",
		);
		expect(
			normalizeAwsIconName(
				"resource/amazon-elastic-container-service/container-1",
			),
		).toBe("resource/amazon-elastic-container-service/container-1");
	});

	it("returns an empty string when nothing survives", () => {
		expect(normalizeAwsIconName("---")).toBe("");
	});
});

describe("resolveAwsIconName", () => {
	it("passes a canonical name through", () => {
		expect(resolveAwsIconName("service/aws-lambda")).toBe("service/aws-lambda");
		expect(resolveAwsIconName("resource/amazon-ec2/instance")).toBe(
			"resource/amazon-ec2/instance",
		);
		expect(resolveAwsIconName("general/user")).toBe("general/user");
	});

	it("resolves the short names of the alias table", () => {
		expect(resolveAwsIconName("s3")).toBe(
			"service/amazon-simple-storage-service",
		);
		expect(resolveAwsIconName("alb")).toBe(
			"resource/elastic-load-balancing/application-load-balancer",
		);
		expect(resolveAwsIconName("igw")).toBe(
			"resource/amazon-vpc/internet-gateway",
		);
	});

	it("resolves a name with the layer prefix dropped", () => {
		expect(resolveAwsIconName("aws-lambda")).toBe("service/aws-lambda");
		expect(resolveAwsIconName("amazon-ec2/instance")).toBe(
			"resource/amazon-ec2/instance",
		);
	});

	it("resolves a name with the vendor prefix dropped as well", () => {
		expect(resolveAwsIconName("ec2/instance")).toBe(
			"resource/amazon-ec2/instance",
		);
		expect(resolveAwsIconName("cloudfront")).toBe("service/amazon-cloudfront");
	});

	it("resolves a spelling variant of any of those", () => {
		expect(resolveAwsIconName("Service/AWS-Lambda")).toBe("service/aws-lambda");
		expect(resolveAwsIconName("EC2")).toBe("service/amazon-ec2");
	});

	it("returns null for a name nothing answers to", () => {
		expect(resolveAwsIconName("service/does-not-exist")).toBeNull();
		expect(isKnownAwsIconName("service/does-not-exist")).toBe(false);
	});

	it("does not mistake a name of Object.prototype for an icon", () => {
		expect(resolveAwsIconName("constructor")).toBeNull();
		expect(resolveAwsIconName("toString")).toBeNull();
	});
});

describe("readAwsIcon", () => {
	it("returns the drawing an alias points at", () => {
		expect(readAwsIcon("lambda")).toBe(AWS_ICON_ENTRIES["service/aws-lambda"]);
	});

	it("returns null for a name that resolves to nothing", () => {
		expect(readAwsIcon("service/does-not-exist")).toBeNull();
	});
});

describe("AWS_ICON_ALIASES", () => {
	it("points every short name at an icon that exists", () => {
		const dangling = Object.entries(AWS_ICON_ALIASES).filter(
			([, target]) => AWS_ICON_ENTRIES[target] === undefined,
		);
		expect(dangling).toEqual([]);
	});

	it("never shadows a canonical name", () => {
		const shadowing = Object.keys(AWS_ICON_ALIASES).filter(
			(alias) => AWS_ICON_ENTRIES[alias] !== undefined,
		);
		expect(shadowing).toEqual([]);
	});
});
