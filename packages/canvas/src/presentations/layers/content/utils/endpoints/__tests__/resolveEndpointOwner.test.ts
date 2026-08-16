import { describe, it, expect } from "vitest";

import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { resolveEndpointOwner } from "../resolveEndpointOwner";

const rect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

const owned = (id: string): EndpointRef => ({
	owner: { id },
	anchor: { kind: "center" },
});

const free: EndpointRef = {
	anchor: { kind: "free", point: { x: 1, y: 2 } },
};

describe("resolveEndpointOwner", () => {
	it("resolves an owned endpoint to the shape in the map", () => {
		const objects = { a: rect("a"), b: rect("b") };
		expect(resolveEndpointOwner(objects, owned("b"))).toBe(objects.b);
	});

	it("returns null for a free endpoint", () => {
		expect(resolveEndpointOwner({ a: rect("a") }, free)).toBeNull();
	});

	it("returns null for a dangling owner id rather than undefined", () => {
		const result = resolveEndpointOwner({ a: rect("a") }, owned("gone"));
		expect(result).toBeNull();
		expect(result).not.toBeUndefined();
	});

	it("returns the same reference across calls so memoized renderers do not re-render", () => {
		const objects = { a: rect("a"), b: rect("b") };
		const first = resolveEndpointOwner(objects, owned("a"));
		const second = resolveEndpointOwner(
			{ ...objects, b: rect("b") },
			owned("a"),
		);
		expect(second).toBe(first);
	});
});
