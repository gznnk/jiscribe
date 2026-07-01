import { describe, expect, it } from "vitest";

import { getEditingEndpoint } from "../getEditingEndpoint";

describe("getEditingEndpoint", () => {
	it("returns source for an edit:source targetId", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:source")).toBe(
			"source",
		);
	});

	it("returns target for an edit:target targetId", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:target")).toBe(
			"target",
		);
	});

	it("returns target (default) when targetId is undefined", () => {
		expect(getEditingEndpoint(undefined)).toBe("target");
	});

	it("returns target for a create-mode targetId", () => {
		expect(
			getEditingEndpoint("connection-anchor:create:rect-1:topCenter"),
		).toBe("target");
	});

	it("returns target when the endpoint part is an unknown value", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1:middle")).toBe(
			"target",
		);
	});

	it("returns target on a format mismatch (wrong number of parts)", () => {
		expect(getEditingEndpoint("connection-anchor:edit:c1")).toBe("target");
	});
});
