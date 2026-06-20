import { describe, it, expect } from "vitest";

import { validateConnectorDoc } from "../validateConnectorDoc";

const validPoints = [
	{ x: 0, y: 0 },
	{ x: 100, y: 100 },
];
const ownedRef = {
	owner: { id: "rect-1", type: "rect" },
	anchor: { kind: "center" },
};
const freeRef = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

describe("validateConnectorDoc", () => {
	it("owned endpoint のみの有効な Connector はエラーなし", () => {
		const o = { points: validPoints, source: ownedRef, target: ownedRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("one-free（owned source + free target）の有効な Connector はエラーなし", () => {
		const o = { points: validPoints, source: ownedRef, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("両端 free（owner なし）はエラー（最低一方は owned 必須）", () => {
		const o = { points: validPoints, source: freeRef, target: freeRef };
		const errors = validateConnectorDoc(o, "root");
		const bothFree = errors.find(
			(e) => e.path === "root" && e.message.includes("owned endpoint"),
		);
		expect(bothFree).toBeDefined();
		// JSON スキーマでは検出されない validator 専用ルールなので、拡張側が
		// スキーマに委ねても取りこぼさないよう beyondSchema が立っていること。
		expect(bothFree?.beyondSchema).toBe(true);
	});

	it("startArrow / endArrow が有効な値はエラーなし", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			startArrow: "None",
			endArrow: "OpenArrow",
		};
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("points が空配列（直線コネクター）はエラーなし", () => {
		const o = { points: [], source: ownedRef, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("points が不正な場合はエラー", () => {
		const o = { points: [{ x: 0 }], source: freeRef, target: freeRef };
		expect(
			validateConnectorDoc(o, "root").some((e) => e.path === "root.points"),
		).toBe(true);
	});

	it("source の owner.id が数値はエラー", () => {
		const badRef = {
			owner: { id: 123, type: "rect" },
			anchor: { kind: "center" },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.owner.id")).toBe(true);
	});

	it("target の owner.type が数値はエラー", () => {
		const badRef = {
			owner: { id: "rect-1", type: 42 },
			anchor: { kind: "center" },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: freeRef, target: badRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.target.owner.type")).toBe(true);
	});

	it("source の connectPoint anchor（有効な id）はエラーなし", () => {
		const ref = {
			owner: { id: "rect-1", type: "rect" },
			anchor: { kind: "connectPoint", id: "leftCenter" },
		};
		const o = { points: validPoints, source: ref, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("source の connectPoint anchor で id が不正はエラー", () => {
		const badRef = {
			owner: { id: "rect-1", type: "rect" },
			anchor: { kind: "connectPoint", id: "invalid" },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.anchor.id")).toBe(true);
	});

	it("source の anchor.kind が free（owned には不正）はエラー", () => {
		const badRef = {
			owner: { id: "rect-1", type: "rect" },
			anchor: { kind: "free", point: { x: 0, y: 0 } },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.anchor.kind")).toBe(true);
	});

	it("target の free anchor で point.x が数値でない場合はエラー", () => {
		const badRef = { anchor: { kind: "free", point: { x: "0", y: 0 } } };
		const errors = validateConnectorDoc(
			{ points: validPoints, source: freeRef, target: badRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.target.anchor.point.x")).toBe(
			true,
		);
	});

	it("startArrow が不正な値はエラー", () => {
		const o = {
			points: validPoints,
			source: freeRef,
			target: freeRef,
			startArrow: "arrow",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.startArrow")).toBe(true);
	});

	it("strokeDashType が不正な値はエラー", () => {
		const o = {
			points: validPoints,
			source: freeRef,
			target: freeRef,
			strokeDashType: "double",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});
});
