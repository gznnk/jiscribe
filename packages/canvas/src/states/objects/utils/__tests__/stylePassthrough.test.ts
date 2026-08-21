import { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, it, expect } from "vitest";

import { collectStyleKeys, pick } from "../stylePassthrough";

const features = (extra: Partial<ObjectFeatures> = {}): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

describe("collectStyleKeys", () => {
	it("collects nothing when no style group is enabled", () => {
		expect(collectStyleKeys(features())).toEqual([]);
	});

	it("collects the keys of each enabled group in stroke → fill → radius order", () => {
		expect(
			collectStyleKeys(
				features({ stroke: true, fill: true, text: "body", radius: true }),
			),
		).toEqual([...STROKE_STYLE_KEYS, ...FILL_STYLE_KEYS, ...RADIUS_STYLE_KEYS]);
	});

	it("excludes the whole text group, which the mappers rebuild per slot", () => {
		for (const textShape of ["body", "slots"] as const) {
			const keys = collectStyleKeys(features({ text: textShape }));
			expect(keys).not.toContain("text");
			expect(keys).not.toContain("textAlign");
		}
	});

	it("omits the groups that are off", () => {
		const keys = collectStyleKeys(features({ stroke: true, radius: true }));
		expect(keys).toEqual([...STROKE_STYLE_KEYS, ...RADIUS_STYLE_KEYS]);
		expect(keys).not.toContain("fill");
	});

	it("excludes geometry and transform, which the mappers rebuild", () => {
		const keys = collectStyleKeys(
			features({ transform: true, stroke: true, fill: true, text: "body" }),
		);
		for (const key of ["x", "y", "cx", "cy", "width", "height", "rotation"]) {
			expect(keys).not.toContain(key);
		}
	});
});

describe("pick", () => {
	it("keeps only the allow-listed keys the source owns", () => {
		const src = { a: 1, b: 2, c: 3 };
		expect(pick(src, ["a", "c", "missing"])).toEqual({ a: 1, c: 3 });
	});

	it("keeps an explicit undefined, since the key is owned", () => {
		expect(pick({ a: undefined }, ["a"])).toEqual({ a: undefined });
		expect("a" in pick({ a: undefined }, ["a"])).toBe(true);
	});

	it("ignores inherited properties", () => {
		const src = Object.create({ inherited: "nope" }) as Record<string, unknown>;
		src.own = "yes";
		expect(pick(src, ["own", "inherited"])).toEqual({ own: "yes" });
	});

	it("does not pull prototype members in through the allow-list", () => {
		expect(pick({}, ["toString", "constructor", "__proto__"])).toEqual({});
	});

	it("returns a fresh object and does not mutate the source", () => {
		const src = { a: 1 };
		const picked = pick(src, ["a"]);
		picked.a = 2;
		expect(src.a).toBe(1);
	});
});
