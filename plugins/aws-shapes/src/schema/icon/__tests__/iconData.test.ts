import { describe, expect, it } from "vitest";

import { AWS_ICON_TIERS } from "../AwsIconNode";
import type { AwsIconNode } from "../AwsIconNode";
import {
	AWS_ICON_ENTRIES,
	AWS_ICON_RELEASE,
	AWS_ICON_SOURCE_URL,
} from "../iconData.generated";
import { resolveAwsIconName } from "../resolveAwsIconName";
import type { AwsTier1Icon } from "../tier1Icons";
import { AWS_TIER1_ICONS } from "../tier1Icons";

/** Flattens the node tree so the attributes can be looked at one by one. */
const walkNodes = function* (
	nodes: readonly AwsIconNode[],
): Generator<AwsIconNode> {
	for (const node of nodes) {
		yield node;
		yield* walkNodes(node[2] ?? []);
	}
};

const allNodes = [
	...walkNodes(
		Object.values(AWS_ICON_ENTRIES).flatMap((entry) => [
			...entry.nodes,
			...(entry.darkNodes ?? []),
		]),
	),
];

/** Seen through the contract's type, not the declaration's literal one, so the type does not pre-empt a comparison with "". */
const TIER1: readonly AwsTier1Icon[] = AWS_TIER1_ICONS;

describe("AWS_ICON_ENTRIES", () => {
	it("carries the source the drawings were taken from", () => {
		expect(AWS_ICON_SOURCE_URL).toMatch(/^https:\/\/.*\.zip$/);
		expect(AWS_ICON_RELEASE).toMatch(/^\d{8}$/);
	});

	it("holds every layer and nothing else", () => {
		const tiers = new Set(
			Object.values(AWS_ICON_ENTRIES).map((entry) => entry.tier),
		);
		expect([...tiers].sort()).toEqual([...AWS_ICON_TIERS].sort());
	});

	it("gives every entry a viewBox of four numbers", () => {
		const malformed = Object.entries(AWS_ICON_ENTRIES).filter(
			([, entry]) => !/^\d+ \d+ \d+ \d+$/.test(entry.viewBox),
		);
		expect(malformed).toEqual([]);
	});

	it("gives every entry a label, a category and at least one node", () => {
		const empty = Object.entries(AWS_ICON_ENTRIES).filter(
			([, entry]) =>
				entry.label === "" || entry.category === "" || entry.nodes.length === 0,
		);
		expect(empty).toEqual([]);
	});

	it("names every entry with its own layer prefix", () => {
		const mismatched = Object.entries(AWS_ICON_ENTRIES).filter(
			([name, entry]) => !name.startsWith(`${entry.tier}/`),
		);
		expect(mismatched).toEqual([]);
	});

	it("keeps an id only where a clipPath survived, under a name of its own", () => {
		const withId = allNodes.filter(([, attrs]) => "id" in attrs);
		expect(withId.map(([tag]) => tag)).toEqual(withId.map(() => "clipPath"));
		expect(new Set(withId.map(([, attrs]) => attrs.id)).size).toBe(
			withId.length,
		);
	});

	it("points every clip-path at a clipPath it carries", () => {
		const declared = new Set(
			allNodes
				.filter(([tag]) => tag === "clipPath")
				.map(([, attrs]) => `url(#${attrs.id})`),
		);
		const dangling = allNodes
			.map(([, attrs]) => attrs.clipPath)
			.filter((value) => value !== undefined && !declared.has(value));
		expect(dangling).toEqual([]);
	});

	// The drawings are redistributed unmodified (LICENSE-ICONS.md), so nothing
	// rounds their coordinates. AWS authors them at full precision, and finding
	// none would mean a rounding pass crept back into the generator.
	it("keeps the path data at the precision AWS authored it in", () => {
		const precise = allNodes.flatMap(([, attrs]) =>
			Object.values(attrs).filter((value) => /\d+\.\d{3,}/.test(value)),
		);
		expect(precise.length).toBeGreaterThan(0);
	});
});

describe("the light and dark renditions", () => {
	const paired = Object.entries(AWS_ICON_ENTRIES).filter(
		([, entry]) => entry.darkNodes !== undefined,
	);

	// AWS ships a Dark file for the General icons, the two AWS Cloud group icons
	// and AWS Marketplace: the drawings whose ink is meant for a white ground.
	it("carries a dark rendition wherever the asset package ships one", () => {
		expect(paired.length).toBeGreaterThan(40);
		expect(AWS_ICON_ENTRIES["general/user"]?.darkNodes).toBeDefined();
		expect(AWS_ICON_ENTRIES["group/aws-cloud"]?.darkNodes).toBeDefined();
		expect(
			AWS_ICON_ENTRIES["service/aws-marketplace"]?.darkNodes,
		).toBeDefined();
	});

	it("draws something different in the dark rendition", () => {
		const identical = paired.filter(
			([, entry]) =>
				JSON.stringify(entry.darkNodes) === JSON.stringify(entry.nodes),
		);
		expect(identical).toEqual([]);
	});

	it("leaves the category-coloured icons a single rendition", () => {
		expect(AWS_ICON_ENTRIES["service/aws-lambda"]?.darkNodes).toBeUndefined();
	});
});

describe("AWS_TIER1_ICONS", () => {
	it("names an icon that exists for every palette entry", () => {
		const missing = TIER1.filter(
			({ icon }) => AWS_ICON_ENTRIES[icon] === undefined,
		);
		expect(missing).toEqual([]);
	});

	it("names them canonically, so the palette writes what the picker shows", () => {
		const notCanonical = TIER1.filter(
			({ icon }) => resolveAwsIconName(icon) !== icon,
		);
		expect(notCanonical).toEqual([]);
	});

	it("lists no icon twice and gives each a label", () => {
		const names = TIER1.map(({ icon }) => icon);
		expect(new Set(names).size).toBe(names.length);
		expect(TIER1.filter(({ label }) => label.trim() === "")).toEqual([]);
	});
});
