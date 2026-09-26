import { describe, expect, it } from "vitest";

import { findUnknownAnchorKind } from "../findUnknownAnchorKind";

const owned = (kind: unknown) => ({
	owner: { id: "r1" },
	anchor: { kind },
});

describe("findUnknownAnchorKind", () => {
	it("returns undefined when both endpoints name a known kind", () => {
		expect(
			findUnknownAnchorKind({
				type: "connector",
				source: owned("center"),
				target: owned("free"),
			}),
		).toBeUndefined();
	});

	it("names the endpoint and the kind it found", () => {
		expect(
			findUnknownAnchorKind({
				type: "connector",
				source: owned("center"),
				target: owned("magnetic"),
			}),
		).toEqual({ endpoint: "target", kind: "magnetic" });
	});

	it("reports the source before the target when both are unknown", () => {
		expect(
			findUnknownAnchorKind({
				type: "connector",
				source: owned("magnetic"),
				target: owned("gravity"),
			}),
		).toEqual({ endpoint: "source", kind: "magnetic" });
	});

	it.each([
		["a non-string kind", owned(42)],
		["an anchor of another shape", { owner: { id: "r1" }, anchor: 1 }],
		["an endpoint without an anchor", { owner: { id: "r1" } }],
		["an endpoint of another shape", "nope"],
	])(
		"passes over %s, which is corruption rather than unknown",
		(_label, ref) => {
			expect(
				findUnknownAnchorKind({ type: "connector", source: ref, target: ref }),
			).toBeUndefined();
		},
	);

	it("returns undefined for a connector without endpoints", () => {
		expect(findUnknownAnchorKind({ type: "connector" })).toBeUndefined();
	});
});
