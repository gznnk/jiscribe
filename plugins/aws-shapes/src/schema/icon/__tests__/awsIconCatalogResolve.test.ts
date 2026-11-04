import { describe, expect, it } from "vitest";

import { awsIconCatalog, listAwsIconShorthands } from "../awsIconCatalog";
import { AWS_ICON_ALIASES } from "../iconAliases";
import { AWS_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";

const { isKnownName, readEntry, readLabel, resolveName } = awsIconCatalog;

describe("listAwsIconShorthands", () => {
	it("drops the layer prefix, then the vendor prefix as well", () => {
		expect(listAwsIconShorthands("service/aws-lambda")).toEqual([
			"aws-lambda",
			"lambda",
		]);
		expect(listAwsIconShorthands("resource/amazon-ec2/instance")).toEqual([
			"amazon-ec2/instance",
			"ec2/instance",
		]);
		expect(listAwsIconShorthands("general/user")).toEqual(["user"]);
	});
});

describe("awsIconCatalog.resolveName", () => {
	it("passes a canonical name through", () => {
		expect(resolveName("service/aws-lambda")).toBe("service/aws-lambda");
		expect(resolveName("resource/amazon-ec2/instance")).toBe(
			"resource/amazon-ec2/instance",
		);
		expect(resolveName("general/user")).toBe("general/user");
	});

	it("resolves the short names of the alias table", () => {
		expect(resolveName("s3")).toBe("service/amazon-simple-storage-service");
		expect(resolveName("alb")).toBe(
			"resource/elastic-load-balancing/application-load-balancer",
		);
		expect(resolveName("igw")).toBe("resource/amazon-vpc/internet-gateway");
	});

	it("resolves a name with the layer prefix dropped", () => {
		expect(resolveName("aws-lambda")).toBe("service/aws-lambda");
		expect(resolveName("amazon-ec2/instance")).toBe(
			"resource/amazon-ec2/instance",
		);
	});

	it("resolves a name with the vendor prefix dropped as well", () => {
		expect(resolveName("ec2/instance")).toBe("resource/amazon-ec2/instance");
		expect(resolveName("cloudfront")).toBe("service/amazon-cloudfront");
	});

	it("resolves a spelling variant of any of those", () => {
		expect(resolveName("Service/AWS-Lambda")).toBe("service/aws-lambda");
		expect(resolveName("EC2")).toBe("service/amazon-ec2");
	});

	it("returns null for a name nothing answers to", () => {
		expect(resolveName("service/does-not-exist")).toBeNull();
		expect(isKnownName("service/does-not-exist")).toBe(false);
	});

	it("resolves the product name as written under the icon", () => {
		expect(resolveName("Amazon DynamoDB")).toBe("service/amazon-dynamodb");
	});

	// Neither is the name under an icon: the first two are not the icon's own,
	// the last two are shared by several.
	it("does not resolve a vendor spelling that is not an icon's name", () => {
		expect(resolveName("Amazon S3")).toBeNull();
		expect(resolveName("Amazon Simple Storage Service (Amazon S3)")).toBeNull();
		expect(resolveName("AWS Management Console")).toBeNull();
		expect(resolveName("Shield")).toBeNull();
	});

	it("does not mistake a name of Object.prototype for an icon", () => {
		expect(resolveName("constructor")).toBeNull();
		expect(resolveName("toString")).toBeNull();
	});
});

describe("awsIconCatalog.readEntry", () => {
	it("returns the entry an alias points at", () => {
		expect(readEntry("lambda")).toBe(
			AWS_ICON_CATALOG_ENTRIES["service/aws-lambda"],
		);
	});

	it("returns null for a name that resolves to nothing", () => {
		expect(readEntry("service/does-not-exist")).toBeNull();
	});
});

describe("awsIconCatalog.readLabel", () => {
	it("prefers tier 1's short name, else the asset's label", () => {
		expect(readLabel("lambda")).toBe("Lambda");
		expect(readLabel("general/camera")).toBe(
			AWS_ICON_CATALOG_ENTRIES["general/camera"]?.label,
		);
		expect(readLabel("service/does-not-exist")).toBeNull();
	});
});

describe("awsIconCatalog.validateIconName", () => {
	const validate = (icon: unknown) =>
		awsIconCatalog.validateIconName({ icon } as never, "root[0]");

	it("names the set and the candidates in the message", () => {
		expect(validate("service/aws-lambdaa")).toEqual([
			{
				path: "root[0].icon",
				message:
					'unknown AWS icon "service/aws-lambdaa" — did you mean "service/aws-lambda"?',
				severity: "error",
				beyondSchema: true,
			},
		]);
		expect(validate("qqqqzzzzxxxxvvvv")[0]?.message).toBe(
			'unknown AWS icon "qqqqzzzzxxxxvvvv" (see the icon list in the AI reference)',
		);
	});

	it("accepts any spelling that resolves, and an absent icon", () => {
		expect(validate("s3")).toEqual([]);
		expect(validate(undefined)).toEqual([]);
	});
});

describe("AWS_ICON_ALIASES", () => {
	it("points every short name at an icon that exists", () => {
		const dangling = Object.entries(AWS_ICON_ALIASES).filter(
			([, target]) => AWS_ICON_CATALOG_ENTRIES[target] === undefined,
		);
		expect(dangling).toEqual([]);
	});

	it("never shadows a canonical name", () => {
		const shadowing = Object.keys(AWS_ICON_ALIASES).filter(
			(alias) => AWS_ICON_CATALOG_ENTRIES[alias] !== undefined,
		);
		expect(shadowing).toEqual([]);
	});
});
