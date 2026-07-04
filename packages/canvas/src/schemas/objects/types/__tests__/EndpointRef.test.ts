import { describe, expect, it } from "vitest";

import {
	ConnectPointIds,
	isConnectPointId,
	isFreeEndpointRef,
	isOwnedEndpointRef,
	isSameEndpoint,
} from "../EndpointRef";

describe("isConnectPointId", () => {
	it.each(ConnectPointIds)("accepts the ConnectPointId %s", (id) => {
		expect(isConnectPointId(id)).toBe(true);
	});

	it("rejects 'center' (the center is not a connect point)", () => {
		expect(isConnectPointId("center")).toBe(false);
	});

	it("rejects invalid strings", () => {
		expect(isConnectPointId("top")).toBe(false);
		expect(isConnectPointId("")).toBe(false);
		expect(isConnectPointId("Center")).toBe(false);
	});

	it("rejects non-string types", () => {
		expect(isConnectPointId(null)).toBe(false);
		expect(isConnectPointId(undefined)).toBe(false);
		expect(isConnectPointId(42)).toBe(false);
		expect(isConnectPointId({})).toBe(false);
	});
});

describe("isOwnedEndpointRef", () => {
	it("accepts an OwnedEndpointRef with a center anchor", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj1", type: "rect" },
				anchor: { kind: "center" },
			}),
		).toBe(true);
	});

	it("accepts an OwnedEndpointRef with a connectPoint anchor", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj2", type: "ellipse" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			}),
		).toBe(true);
	});

	it("rejects an object without an owner", () => {
		expect(
			isOwnedEndpointRef({
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("rejects an object whose owner is null", () => {
		expect(
			isOwnedEndpointRef({
				owner: null,
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("rejects when owner.id is not a string", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: 123, type: "rect" },
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("rejects when owner.type is not a string", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj1", type: null },
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("rejects null", () => {
		expect(isOwnedEndpointRef(null)).toBe(false);
	});

	it("rejects non-object types", () => {
		expect(isOwnedEndpointRef("string")).toBe(false);
		expect(isOwnedEndpointRef(42)).toBe(false);
	});
});

describe("isFreeEndpointRef", () => {
	it("accepts a FreeEndpointRef with a free anchor", () => {
		expect(
			isFreeEndpointRef({
				anchor: { kind: "free", point: { x: 10, y: 20 } },
			}),
		).toBe(true);
	});

	it("also accepts when owner is undefined", () => {
		expect(
			isFreeEndpointRef({
				owner: undefined,
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			}),
		).toBe(true);
	});

	it("rejects when an owner is present", () => {
		expect(
			isFreeEndpointRef({
				owner: { id: "obj1", type: "rect" },
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			}),
		).toBe(false);
	});

	it("rejects when anchor.kind is not free", () => {
		expect(
			isFreeEndpointRef({
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("rejects an object without an anchor", () => {
		expect(isFreeEndpointRef({})).toBe(false);
	});

	it("rejects an object whose anchor is null", () => {
		expect(
			isFreeEndpointRef({
				anchor: null,
			}),
		).toBe(false);
	});

	it("rejects null", () => {
		expect(isFreeEndpointRef(null)).toBe(false);
	});

	it("rejects non-object types", () => {
		expect(isFreeEndpointRef("string")).toBe(false);
	});
});

describe("isSameEndpoint", () => {
	describe("comparing two OwnedEndpointRefs", () => {
		it("returns true when owner and center anchor are the same", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
				),
			).toBe(true);
		});

		it("returns true when owner and connectPoint anchor are the same", () => {
			expect(
				isSameEndpoint(
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "topCenter" },
					},
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "topCenter" },
					},
				),
			).toBe(true);
		});

		it("returns false when owner.id differs", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "b", type: "rect" }, anchor: { kind: "center" } },
				),
			).toBe(false);
		});

		it("returns false when owner.type differs", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "a", type: "ellipse" }, anchor: { kind: "center" } },
				),
			).toBe(false);
		});

		it("returns false when the connectPoint id differs", () => {
			expect(
				isSameEndpoint(
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "topCenter" },
					},
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "bottomCenter" },
					},
				),
			).toBe(false);
		});

		it("returns false when the anchor kind differs", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "topCenter" },
					},
				),
			).toBe(false);
		});
	});

	describe("comparing two FreeEndpointRefs", () => {
		it("returns true for the same coordinates", () => {
			expect(
				isSameEndpoint(
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
				),
			).toBe(true);
		});

		it("returns false when coordinates differ", () => {
			expect(
				isSameEndpoint(
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
					{ anchor: { kind: "free", point: { x: 5, y: 99 } } },
				),
			).toBe(false);
		});
	});

	describe("mixing OwnedEndpointRef and FreeEndpointRef", () => {
		it("returns false when one has an owner and the other does not", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ anchor: { kind: "free", point: { x: 0, y: 0 } } },
				),
			).toBe(false);
		});
	});
});
