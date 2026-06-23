import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { validateStructure } from "../validateStructure";

// validateStructure は型別検証・既知 type 判定をレジストリへ委譲する。
// 本番では parseCanvasText が初期化を保証するため、単体テストでも同じ前提を揃える。
beforeAll(() => {
	initializeObjectDocValidatorRegistry();
});

/**
 * コネクターは root 直下のみ（group の children には置けない）という不変条件を
 * 構造検証が強制することを確認する。JSON スキーマ（GroupChildDoc）とは別に、
 * スキーマを持たない webview / MCP のためにバリデータ側でも担保する。
 */
describe("validateStructure: コネクターは top-level のみ", () => {
	const connectorNode = (id: string): unknown => ({
		id,
		type: "connector",
		points: [],
		source: { owner: { type: "rect", id: "r1" }, anchor: { kind: "center" } },
		target: { owner: { type: "rect", id: "r2" }, anchor: { kind: "center" } },
	});

	it("group の children にコネクターがあるとエラー", () => {
		const doc = {
			version: 1,
			root: [{ id: "g1", type: "group", children: [connectorNode("c1")] }],
		};
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].children[0]" && e.message.includes("top-level"),
			),
		).toBe(true);
	});

	it("root 直下のコネクターは『group 内』エラーにならない", () => {
		const doc = { version: 1, root: [connectorNode("c1")] };
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.message.includes("inside a group"))).toBe(
			false,
		);
	});

	it("旧フォーマットの top-level connectors フィールドは fail-fast でエラー", () => {
		const doc = { version: 1, root: [], connectors: [] };
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.path === "connectors")).toBe(true);
	});
});

/**
 * 未登録（未知）の type を構造検証で弾くことを確認する。これを通すと検証は ok を
 * 返すが canvasToState の mapper 解決で例外になりエディタごとクラッシュするため、
 * 境界で fail-fast する必要がある。
 */
describe("validateStructure: 未知の type", () => {
	const rect = (id: string) => ({
		id,
		type: "rect",
		x: 0,
		y: 0,
		width: 10,
		height: 10,
	});

	it("root 直下の未知 type を Unknown object type エラーにする", () => {
		const doc = { version: 1, root: [{ id: "x1", type: "rectangle" }] };
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].type" &&
					e.message.includes('Unknown object type "rectangle"'),
			),
		).toBe(true);
	});

	it("group の子の未知 type も弾く", () => {
		const doc = {
			version: 1,
			root: [
				{ id: "g1", type: "group", children: [{ id: "c1", type: "nope" }] },
			],
		};
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].children[0].type" &&
					e.message.includes('Unknown object type "nope"'),
			),
		).toBe(true);
	});

	it("既知 type（rect / group）は Unknown エラーを出さない", () => {
		const doc = {
			version: 1,
			root: [{ id: "g1", type: "group", children: [rect("r1")] }],
		};
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.message.includes("Unknown object type"))).toBe(
			false,
		);
	});
});

/**
 * 空 group（children: []）は bounds が定まらない退化状態のため、構造検証で弾く。
 */
describe("validateStructure: 空 group", () => {
	const rect = (id: string) => ({
		id,
		type: "rect",
		x: 0,
		y: 0,
		width: 10,
		height: 10,
	});

	it("children が空配列の group はエラー", () => {
		const doc = {
			version: 1,
			root: [{ id: "g1", type: "group", children: [] }],
		};
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].children" &&
					e.message.includes("at least one child"),
			),
		).toBe(true);
	});

	it("ネストした空 group も弾く", () => {
		const doc = {
			version: 1,
			root: [
				{
					id: "g1",
					type: "group",
					children: [rect("r1"), { id: "g2", type: "group", children: [] }],
				},
			],
		};
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].children[1].children" &&
					e.message.includes("at least one child"),
			),
		).toBe(true);
	});

	it("子を持つ group はエラーにならない", () => {
		const doc = {
			version: 1,
			root: [{ id: "g1", type: "group", children: [rect("r1")] }],
		};
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.message.includes("at least one child"))).toBe(
			false,
		);
	});
});
