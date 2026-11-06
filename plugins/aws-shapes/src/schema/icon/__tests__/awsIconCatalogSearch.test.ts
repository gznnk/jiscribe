import { describe, expect, it } from "vitest";

import { awsIconCatalog } from "../awsIconCatalog";
import { AWS_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";
import { AWS_TIER1_ICON_NAMES } from "../tier1Icons";

const { search } = awsIconCatalog;

/** The cap a search lays out at once; kept here because the kit does not export it */
const MAX_RESULTS = 105;

/** Every icon name in the category, whatever layer it sits on. */
const namesInCategory = (category: string): string[] =>
	Object.entries(AWS_ICON_CATALOG_ENTRIES)
		.filter(([, entry]) => entry.category === category)
		.map(([name]) => name);

describe("awsIconCatalog.search with an empty term", () => {
	it("shows tier 1 in the palette's order rather than the whole set", () => {
		const { names, total } = search("");

		expect(names).toEqual([...AWS_TIER1_ICON_NAMES]);
		expect(total).toBe(AWS_TIER1_ICON_NAMES.length);
	});

	// A term in Japanese, say, normalizes to nothing too; listing the palette
	// for it would pass the whole palette off as matches
	it("matches nothing for a term that normalizes to nothing", () => {
		expect(search("---")).toEqual({ names: [], total: 0 });
	});
});

describe("awsIconCatalog.search ranking", () => {
	it("puts the service itself first for the name it is known by", () => {
		expect(search("lambda").names[0]).toBe("service/aws-lambda");
	});

	// the prefix check looks past the layer prefix, so a longer name that opens
	// with the term outranks a shorter one that only holds it somewhere inside
	it("ranks a prefix match above a shorter name that merely contains the term", () => {
		const { names } = search("ec2");

		expect(names[0]).toBe("group/ec2-instance-contents");
		expect(names[1]).toBe("service/amazon-ec2");
		expect("group/ec2-instance-contents".length).toBeGreaterThan(
			"service/amazon-ec2".length,
		);
	});

	// None of these opens with the term, so length is the only tiebreak left
	it("puts the shorter name first among matches that are alike otherwise", () => {
		const { names } = search("lambda");

		const lengths = names.map((name) => name.length);
		expect(lengths).toEqual([...lengths].sort((left, right) => left - right));
	});

	it("normalizes the term, so the spelling a person types finds the same icon", () => {
		expect(search("AWS Lambda").names[0]).toBe("service/aws-lambda");
		expect(search("awsLambda").names[0]).toBe("service/aws-lambda");
	});
});

describe("awsIconCatalog.search matching", () => {
	it("finds an icon through its display label when the name is spelled otherwise", () => {
		// The label splits the run of capitals ("CloudFront" -> "cloud-front")
		// where the name keeps it together, so this reaches it by label alone
		const { names } = search("CloudFront");

		expect(names).toContain("service/amazon-cloudfront");
		expect("service/amazon-cloudfront".includes("cloud-front")).toBe(false);
	});

	it("finds an icon through a short name nothing else spells", () => {
		expect(search("igw")).toEqual({
			names: ["resource/amazon-vpc/internet-gateway"],
			total: 1,
		});
		expect(search("alb").names).toEqual([
			"resource/elastic-load-balancing/application-load-balancer",
		]);
	});

	it("returns nothing at all for a term that resembles nothing", () => {
		expect(search("qqqqzzzzxxxx")).toEqual({
			names: [],
			total: 0,
		});
	});
});

describe("awsIconCatalog.search truncation", () => {
	// "a" matches most of the set; the count the library weighs its "more
	// matched" line on has to be the whole match, not the page that fits on screen
	it("lays out at most MAX_RESULTS but counts every match in total", () => {
		const { names, total } = search("a");

		expect(names).toHaveLength(MAX_RESULTS);
		expect(total).toBeGreaterThan(MAX_RESULTS);
		expect(total).toBeLessThanOrEqual(
			Object.keys(AWS_ICON_CATALOG_ENTRIES).length,
		);
		expect(new Set(names).size).toBe(names.length);
	});

	it("leaves a result that fits untouched", () => {
		const { names, total } = search("cloudfront");

		expect(names).toHaveLength(total);
		expect(total).toBeLessThan(MAX_RESULTS);
	});
});

describe("awsIconCatalog.search by category", () => {
	it("finds every icon of a category through the category's name", () => {
		const { names } = search("compute");

		expect(names).toEqual(expect.arrayContaining(namesInCategory("Compute")));
	});

	it("normalizes the category name the way it does the term", () => {
		const { names } = search("Application Integration");

		expect(names).toEqual(
			expect.arrayContaining(namesInCategory("Application Integration")),
		);
	});
});
