import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import type { SemanticDiagnostic } from "../types";
import { validateStructure } from "../validateStructure";

// validateStructure は型別検証・既知 type 判定をレジストリへ委譲する。
// 本番では parseCanvasText が初期化を保証するため、単体テストでも同じ前提を揃える。
beforeAll(() => {
	initializeObjectDocValidatorRegistry();
});

// ─── フィクスチャヘルパー ─────────────────────────────────────────
const rect = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});
const ellipse = (id: string) => ({
	id,
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 5,
	ry: 5,
});
const polyline = (id: string) => ({
	id,
	type: "polyline",
	points: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 },
	],
});
const group = (id: string, children: unknown[]) => ({
	id,
	type: "group",
	children,
});
const ownedRef = (ownerId: string) => ({
	owner: { type: "rect", id: ownerId },
	anchor: { kind: "center" },
});
const connector = (id: string, source: unknown, target: unknown) => ({
	id,
	type: "connector",
	points: [],
	source,
	target,
});
const doc = (root: unknown[], over: Record<string, unknown> = {}) => ({
	version: 1,
	root,
	...over,
});

const has = (
	errors: SemanticDiagnostic[],
	path: string,
	substr: string,
): boolean => errors.some((e) => e.path === path && e.message.includes(substr));

// ─── ドキュメント直下の構造 ───────────────────────────────────────
describe("validateStructure: ドキュメント直下", () => {
	it.each([
		["null", null],
		["配列", []],
		["文字列", "x"],
		["数値", 42],
	])("非オブジェクト（%s）は '/' エラー", (_label, input) => {
		const errors = validateStructure(input);
		expect(has(errors, "/", "must be an object")).toBe(true);
	});

	it("version 欠落はエラー", () => {
		expect(has(validateStructure({ root: [] }), "version", "must be 1")).toBe(
			true,
		);
	});

	it.each([
		["文字列 '1'", "1"],
		["v2（厳格化: フォーマットは v1 のみ）", 2],
		["小数 1.5", 1.5],
		["0", 0],
		["負数", -1],
	])("version が不正（%s）はエラー", (_label, version) => {
		const errors = validateStructure({ version, root: [] });
		expect(has(errors, "version", "must be 1")).toBe(true);
	});

	it("version=1 + 空 root は構造エラーなし（空キャンバスは正当）", () => {
		expect(validateStructure(doc([]))).toEqual([]);
	});

	it.each([
		["欠落", {}],
		["オブジェクト", { root: {} }],
		["文字列", { root: "x" }],
	])("root が配列でない（%s）はエラー", (_label, partial) => {
		const errors = validateStructure({ version: 1, ...partial });
		expect(has(errors, "root", "must be an array")).toBe(true);
	});

	it("複数の不備は蓄積される（version + root）", () => {
		const errors = validateStructure({ version: 2, root: 5 });
		expect(has(errors, "version", "must be 1")).toBe(true);
		expect(has(errors, "root", "must be an array")).toBe(true);
	});
});

// ─── 旧フォーマット connectors フィールド ─────────────────────────
describe("validateStructure: 旧 connectors フィールド", () => {
	it("top-level connectors があると fail-fast でエラー", () => {
		const errors = validateStructure({ version: 1, root: [], connectors: [] });
		expect(errors.some((e) => e.path === "connectors")).toBe(true);
	});

	it("connectors キーが無ければエラーにならない", () => {
		expect(
			validateStructure(doc([])).some((e) => e.path === "connectors"),
		).toBe(false);
	});
});

// ─── ノード共通フィールド（validateObjectNode） ───────────────────
describe("validateStructure: ノード共通フィールド", () => {
	it.each([
		["null", null],
		["文字列", "x"],
		["数値", 1],
		["配列", []],
	])(
		"root 要素が非オブジェクト（%s）は 'must be an object'",
		(_label, node) => {
			const errors = validateStructure(doc([node]));
			expect(has(errors, "root[0]", "must be an object")).toBe(true);
		},
	);

	it.each([
		["欠落", {}],
		["空文字", { id: "" }],
		["数値", { id: 1 }],
	])("id が不正（%s）は non-empty string エラー", (_label, idPart) => {
		const errors = validateStructure(doc([{ type: "rect", ...idPart }]));
		expect(has(errors, "root[0].id", "non-empty string")).toBe(true);
	});

	it("type 欠落は type エラーのみで型別検証は走らない（早期 return）", () => {
		// width を壊しても、type が無いので rect 検証へ進まない
		const errors = validateStructure(doc([{ id: "x", width: "bad" }]));
		expect(has(errors, "root[0].type", "must be a string")).toBe(true);
		expect(errors.some((e) => e.path === "root[0].width")).toBe(false);
	});

	it("type が数値は type エラー", () => {
		const errors = validateStructure(doc([{ id: "x", type: 1 }]));
		expect(has(errors, "root[0].type", "must be a string")).toBe(true);
	});
});

// ─── 未知 type ────────────────────────────────────────────────────
describe("validateStructure: 未知の type", () => {
	it("root 直下の未知 type を Unknown object type エラーにする", () => {
		const errors = validateStructure(doc([{ id: "x1", type: "rectangle" }]));
		expect(has(errors, "root[0].type", 'Unknown object type "rectangle"')).toBe(
			true,
		);
	});

	it("group の子の未知 type も弾く", () => {
		const errors = validateStructure(
			doc([group("g1", [{ id: "c1", type: "nope" }])]),
		);
		expect(
			has(errors, "root[0].children[0].type", 'Unknown object type "nope"'),
		).toBe(true);
	});

	it("既知 type は Unknown エラーを出さない", () => {
		const errors = validateStructure(doc([group("g1", [rect("r1")])]));
		expect(errors.some((e) => e.message.includes("Unknown object type"))).toBe(
			false,
		);
	});
});

// ─── 型別検証への委譲 ─────────────────────────────────────────────
describe("validateStructure: 型別検証への委譲", () => {
	it("rect の width 欠落が structure 経由で浮く", () => {
		const errors = validateStructure(
			doc([{ id: "r", type: "rect", x: 0, y: 0, height: 10 }]),
		);
		expect(has(errors, "root[0].width", "must be a number")).toBe(true);
	});

	it("ellipse の cx 欠落が浮く", () => {
		const errors = validateStructure(
			doc([{ id: "e", type: "ellipse", cy: 0, rx: 5, ry: 5 }]),
		);
		expect(has(errors, "root[0].cx", "must be a number")).toBe(true);
	});

	it("正しい rect は型別エラーなし", () => {
		expect(validateStructure(doc([rect("r")]))).toEqual([]);
	});
});

// ─── group の children ────────────────────────────────────────────
describe("validateStructure: group の children", () => {
	it("children 欠落は 'must be an array'", () => {
		const errors = validateStructure(doc([{ id: "g1", type: "group" }]));
		expect(has(errors, "root[0].children", "must be an array")).toBe(true);
	});

	it("空 children はエラー", () => {
		const errors = validateStructure(doc([group("g1", [])]));
		expect(has(errors, "root[0].children", "at least one child")).toBe(true);
	});

	it("ネストした空 group も弾く", () => {
		const errors = validateStructure(
			doc([group("g1", [rect("r1"), group("g2", [])])]),
		);
		expect(
			has(errors, "root[0].children[1].children", "at least one child"),
		).toBe(true);
	});

	it("子が非オブジェクトは 'must be an object'", () => {
		const errors = validateStructure(doc([group("g1", [null])]));
		expect(has(errors, "root[0].children[0]", "must be an object")).toBe(true);
	});

	it("子の型別エラーが正しい path で浮く", () => {
		const errors = validateStructure(
			doc([group("g1", [{ id: "r", type: "rect", x: 0, y: 0, width: 10 }])]),
		);
		expect(has(errors, "root[0].children[0].height", "must be a number")).toBe(
			true,
		);
	});

	it("深いネスト（group>group>rect）の path が正確", () => {
		const errors = validateStructure(
			doc([
				group("g1", [
					group("g2", [{ id: "r", type: "rect", x: 0, y: 0, width: 10 }]),
				]),
			]),
		);
		expect(
			has(errors, "root[0].children[0].children[0].height", "must be a number"),
		).toBe(true);
	});

	it("子を持つ group はエラーにならない", () => {
		expect(validateStructure(doc([group("g1", [rect("r1")])]))).toEqual([]);
	});
});

// ─── コネクターは top-level のみ ──────────────────────────────────
describe("validateStructure: コネクターの配置", () => {
	const conn = connector("c1", ownedRef("r1"), ownedRef("r2"));

	it("group の children にコネクターがあるとエラー", () => {
		const errors = validateStructure(doc([group("g1", [conn])]));
		expect(has(errors, "root[0].children[0]", "top-level")).toBe(true);
	});

	it("root 直下のコネクターは『group 内』エラーにならない", () => {
		const errors = validateStructure(doc([conn]));
		expect(errors.some((e) => e.message.includes("inside a group"))).toBe(
			false,
		);
	});

	it("両端 free のコネクターは型別検証で弾かれる（境界で free-free を拒否）", () => {
		const freeRef = (x: number, y: number) => ({
			anchor: { kind: "free", point: { x, y } },
		});
		const errors = validateStructure(
			doc([connector("c1", freeRef(0, 0), freeRef(9, 9))]),
		);
		expect(has(errors, "root[0]", "at least one owned endpoint")).toBe(true);
	});
});

// ─── 正常系（happy path） ────────────────────────────────────────
describe("validateStructure: 正常系", () => {
	it("rect / ellipse / polyline / group(子あり) / connector の混在は無エラー", () => {
		const valid = doc([
			rect("r1"),
			ellipse("e1"),
			polyline("p1"),
			group("g1", [rect("gr1")]),
			connector("c1", ownedRef("r1"), ownedRef("e1")),
		]);
		expect(validateStructure(valid)).toEqual([]);
	});
});
