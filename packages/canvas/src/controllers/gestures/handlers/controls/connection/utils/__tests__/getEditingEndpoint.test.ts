import { describe, expect, it } from "vitest";

import { getEditingEndpoint } from "../getEditingEndpoint";

describe("getEditingEndpoint", () => {
	it("returns source for an endpoint:source targetPart", () => {
		expect(getEditingEndpoint("endpoint:source")).toBe("source");
	});

	it("returns target for an endpoint:target targetPart", () => {
		expect(getEditingEndpoint("endpoint:target")).toBe("target");
	});

	it("returns target (default) when targetPart is undefined", () => {
		expect(getEditingEndpoint(undefined)).toBe("target");
	});

	it("returns target for a create-mode targetPart", () => {
		expect(getEditingEndpoint("anchor:topCenter")).toBe("target");
	});

	it("returns target when the endpoint is an unknown value", () => {
		expect(getEditingEndpoint("endpoint:middle")).toBe("target");
	});

	it("returns target on a format mismatch (no endpoint prefix)", () => {
		expect(getEditingEndpoint("endpoint")).toBe("target");
	});
});
