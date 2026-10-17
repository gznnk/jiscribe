import { describe, expect, it } from "vitest";

import { getEditingEndpoint } from "../getEditingEndpoint";

describe("getEditingEndpoint", () => {
	it("returns source for an endpoint:source targetAction", () => {
		expect(getEditingEndpoint("endpoint:source")).toBe("source");
	});

	it("returns target for an endpoint:target targetAction", () => {
		expect(getEditingEndpoint("endpoint:target")).toBe("target");
	});

	it("returns target (default) when targetAction is undefined", () => {
		expect(getEditingEndpoint(undefined)).toBe("target");
	});

	it("returns target for a create-mode targetAction", () => {
		expect(getEditingEndpoint("anchor:topCenter")).toBe("target");
	});

	it("returns target when the endpoint is an unknown value", () => {
		expect(getEditingEndpoint("endpoint:middle")).toBe("target");
	});

	it("returns target on a format mismatch (no endpoint prefix)", () => {
		expect(getEditingEndpoint("endpoint")).toBe("target");
	});
});
