import { describe, expect, it } from "vitest";

import { AWS_ICON_ENTRIES } from "../iconData.generated";
import { searchAwsIcons } from "../searchAwsIcons";
import { AWS_TIER1_ICON_NAMES } from "../tier1Icons";

/** The cap a search lays out at once; kept here because the module does not export it */
const MAX_RESULTS = 105;

/** Every icon name in the category, whatever layer it sits on. */
const namesInCategory = (category: string): string[] =>
	Object.entries(AWS_ICON_ENTRIES)
		.filter(([, entry]) => entry.category === category)
		.map(([name]) => name);

describe("searchAwsIcons with an empty term", () => {
	it("shows tier 1 in the palette's order rather than the whole set", () => {
		const { names, total } = searchAwsIcons({ query: "" });

		expect(names).toEqual([...AWS_TIER1_ICON_NAMES]);
		expect(total).toBe(AWS_TIER1_ICON_NAMES.length);
	});

	// The term is normalized before it is looked at, so one made of separators
	// alone is no term at all and falls back to the palette
	it("treats a term that normalizes to nothing as an empty one", () => {
		expect(searchAwsIcons({ query: "---" }).names).toEqual([
			...AWS_TIER1_ICON_NAMES,
		]);
	});
});

describe("searchAwsIcons ranking", () => {
	it("puts the service itself first for the name it is known by", () => {
		expect(searchAwsIcons({ query: "lambda" }).names[0]).toBe(
			"service/aws-lambda",
		);
	});

	// startsWithNeedle looks past the layer prefix, so a longer name that opens
	// with the term outranks a shorter one that only holds it somewhere inside
	it("ranks a prefix match above a shorter name that merely contains the term", () => {
		const { names } = searchAwsIcons({ query: "ec2" });

		expect(names[0]).toBe("group/ec2-instance-contents");
		expect(names[1]).toBe("service/amazon-ec2");
		expect("group/ec2-instance-contents".length).toBeGreaterThan(
			"service/amazon-ec2".length,
		);
	});

	// None of these opens with the term, so length is the only tiebreak left
	it("puts the shorter name first among matches that are alike otherwise", () => {
		const { names } = searchAwsIcons({ query: "lambda" });

		const lengths = names.map((name) => name.length);
		expect(lengths).toEqual([...lengths].sort((left, right) => left - right));
	});

	it("normalizes the term, so the spelling a person types finds the same icon", () => {
		expect(searchAwsIcons({ query: "AWS Lambda" }).names[0]).toBe(
			"service/aws-lambda",
		);
		expect(searchAwsIcons({ query: "awsLambda" }).names[0]).toBe(
			"service/aws-lambda",
		);
	});
});

describe("searchAwsIcons matching", () => {
	it("finds an icon through its display label when the name is spelled otherwise", () => {
		// The label splits the run of capitals ("CloudFront" -> "cloud-front")
		// where the name keeps it together, so this reaches it by label alone
		const { names } = searchAwsIcons({ query: "CloudFront" });

		expect(names).toContain("service/amazon-cloudfront");
		expect("service/amazon-cloudfront".includes("cloud-front")).toBe(false);
	});

	it("finds an icon through a short name nothing else spells", () => {
		expect(searchAwsIcons({ query: "igw" })).toEqual({
			names: ["resource/amazon-vpc/internet-gateway"],
			total: 1,
		});
		expect(searchAwsIcons({ query: "alb" }).names).toEqual([
			"resource/elastic-load-balancing/application-load-balancer",
		]);
	});

	it("returns nothing at all for a term that resembles nothing", () => {
		expect(searchAwsIcons({ query: "qqqqzzzzxxxx" })).toEqual({
			names: [],
			total: 0,
		});
	});
});

describe("searchAwsIcons truncation", () => {
	// "a" matches most of the set; the count the library weighs its "more
	// matched" line on has to be the whole match, not the page that fits on screen
	it("lays out at most MAX_RESULTS but counts every match in total", () => {
		const { names, total } = searchAwsIcons({ query: "a" });

		expect(names).toHaveLength(MAX_RESULTS);
		expect(total).toBeGreaterThan(MAX_RESULTS);
		expect(total).toBeLessThanOrEqual(Object.keys(AWS_ICON_ENTRIES).length);
		expect(new Set(names).size).toBe(names.length);
	});

	it("leaves a result that fits untouched", () => {
		const { names, total } = searchAwsIcons({ query: "cloudfront" });

		expect(names).toHaveLength(total);
		expect(total).toBeLessThan(MAX_RESULTS);
	});
});

describe("searchAwsIcons by category", () => {
	it("finds every icon of a category through the category's name", () => {
		const { names } = searchAwsIcons({ query: "compute" });

		expect(names).toEqual(expect.arrayContaining(namesInCategory("Compute")));
	});

	it("normalizes the category name the way it does the term", () => {
		const { names } = searchAwsIcons({ query: "Application Integration" });

		expect(names).toEqual(
			expect.arrayContaining(namesInCategory("Application Integration")),
		);
	});
});
