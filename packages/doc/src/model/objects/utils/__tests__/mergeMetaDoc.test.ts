import { describe, expect, it } from "vitest";

import { mergeMetaDoc } from "../mergeMetaDoc";

describe("mergeMetaDoc", () => {
	it("writes the fields given and keeps every other member", () => {
		const srcMeta = { name: "A", reference: "./b.jis", owner: { id: 7 } };

		const merged = mergeMetaDoc(srcMeta, { description: "about" });

		expect(merged).toEqual({
			name: "A",
			reference: "./b.jis",
			owner: { id: 7 },
			description: "about",
		});
		expect(srcMeta).toEqual({
			name: "A",
			reference: "./b.jis",
			owner: { id: 7 },
		});
	});

	it("drops a field given as null or as the empty string", () => {
		expect(
			mergeMetaDoc(
				{ name: "A", description: "B", reference: "r" },
				{
					name: null,
					description: "",
				},
			),
		).toEqual({ reference: "r" });
	});

	it("is undefined once no member is left, and for nothing stated on nothing", () => {
		expect(mergeMetaDoc({ name: "A" }, { name: null })).toBeUndefined();
		expect(mergeMetaDoc(undefined, { name: "" })).toBeUndefined();
	});
});
