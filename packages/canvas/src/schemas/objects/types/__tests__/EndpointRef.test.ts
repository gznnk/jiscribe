import { describe, expect, it } from "vitest";

import {
	ConnectPointIds,
	isConnectPointId,
	isFreeEndpointRef,
	isOwnedEndpointRef,
	isSameEndpoint,
} from "../EndpointRef";

describe("isConnectPointId", () => {
	it.each(ConnectPointIds)("ConnectPointId %s を受け入れる", (id) => {
		expect(isConnectPointId(id)).toBe(true);
	});

	it("不正な文字列を拒否する", () => {
		expect(isConnectPointId("top")).toBe(false);
		expect(isConnectPointId("")).toBe(false);
		expect(isConnectPointId("Center")).toBe(false);
	});

	it("非文字列型を拒否する", () => {
		expect(isConnectPointId(null)).toBe(false);
		expect(isConnectPointId(undefined)).toBe(false);
		expect(isConnectPointId(42)).toBe(false);
		expect(isConnectPointId({})).toBe(false);
	});
});

describe("isOwnedEndpointRef", () => {
	it("center アンカーの OwnedEndpointRef を受け入れる", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj1", type: "rect" },
				anchor: { kind: "center" },
			}),
		).toBe(true);
	});

	it("connectPoint アンカーの OwnedEndpointRef を受け入れる", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj2", type: "ellipse" },
				anchor: { kind: "connectPoint", id: "topCenter" },
			}),
		).toBe(true);
	});

	it("owner が無いオブジェクトを拒否する", () => {
		expect(
			isOwnedEndpointRef({
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("owner が null のオブジェクトを拒否する", () => {
		expect(
			isOwnedEndpointRef({
				owner: null,
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("owner.id が文字列でない場合を拒否する", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: 123, type: "rect" },
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("owner.type が文字列でない場合を拒否する", () => {
		expect(
			isOwnedEndpointRef({
				owner: { id: "obj1", type: null },
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("null を拒否する", () => {
		expect(isOwnedEndpointRef(null)).toBe(false);
	});

	it("非オブジェクト型を拒否する", () => {
		expect(isOwnedEndpointRef("string")).toBe(false);
		expect(isOwnedEndpointRef(42)).toBe(false);
	});
});

describe("isFreeEndpointRef", () => {
	it("free アンカーの FreeEndpointRef を受け入れる", () => {
		expect(
			isFreeEndpointRef({
				anchor: { kind: "free", point: { x: 10, y: 20 } },
			}),
		).toBe(true);
	});

	it("owner が undefined の場合も受け入れる", () => {
		expect(
			isFreeEndpointRef({
				owner: undefined,
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			}),
		).toBe(true);
	});

	it("owner が存在する場合を拒否する", () => {
		expect(
			isFreeEndpointRef({
				owner: { id: "obj1", type: "rect" },
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			}),
		).toBe(false);
	});

	it("anchor.kind が free でない場合を拒否する", () => {
		expect(
			isFreeEndpointRef({
				anchor: { kind: "center" },
			}),
		).toBe(false);
	});

	it("anchor が無いオブジェクトを拒否する", () => {
		expect(isFreeEndpointRef({})).toBe(false);
	});

	it("anchor が null のオブジェクトを拒否する", () => {
		expect(
			isFreeEndpointRef({
				anchor: null,
			}),
		).toBe(false);
	});

	it("null を拒否する", () => {
		expect(isFreeEndpointRef(null)).toBe(false);
	});

	it("非オブジェクト型を拒否する", () => {
		expect(isFreeEndpointRef("string")).toBe(false);
	});
});

describe("isSameEndpoint", () => {
	describe("OwnedEndpointRef 同士の比較", () => {
		it("owner と center アンカーが同じなら true", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
				),
			).toBe(true);
		});

		it("owner と connectPoint アンカーが同じなら true", () => {
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

		it("owner.id が異なれば false", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "b", type: "rect" }, anchor: { kind: "center" } },
				),
			).toBe(false);
		});

		it("owner.type が異なれば false", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ owner: { id: "a", type: "ellipse" }, anchor: { kind: "center" } },
				),
			).toBe(false);
		});

		it("connectPoint の id が異なれば false", () => {
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

		it("アンカーの kind が異なれば false", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{
						owner: { id: "a", type: "rect" },
						anchor: { kind: "connectPoint", id: "center" },
					},
				),
			).toBe(false);
		});
	});

	describe("FreeEndpointRef 同士の比較", () => {
		it("同じ座標なら true", () => {
			expect(
				isSameEndpoint(
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
				),
			).toBe(true);
		});

		it("座標が異なれば false", () => {
			expect(
				isSameEndpoint(
					{ anchor: { kind: "free", point: { x: 5, y: 10 } } },
					{ anchor: { kind: "free", point: { x: 5, y: 99 } } },
				),
			).toBe(false);
		});
	});

	describe("OwnedEndpointRef と FreeEndpointRef の混在", () => {
		it("owner の有無が異なれば false", () => {
			expect(
				isSameEndpoint(
					{ owner: { id: "a", type: "rect" }, anchor: { kind: "center" } },
					{ anchor: { kind: "free", point: { x: 0, y: 0 } } },
				),
			).toBe(false);
		});
	});
});
