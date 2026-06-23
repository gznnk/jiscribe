import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isValidConnectorState } from "../../../../states/objects/connections/connector/validateConnectorState";
import { isValidGroupState } from "../../../../states/objects/primitives/group/validateGroupState";
import { isValidRectState } from "../../../../states/objects/primitives/rect/validateRectState";
import { objectStateValidatorRegistry } from "../../../../states/registry/ObjectStateValidatorRegistry";
import { isClipboardData } from "../ClipboardData";

const rect = (id: string) => ({
	id,
	type: "rect",
	cx: 0,
	cy: 0,
	width: 10,
	height: 10,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

const group = (id: string, childIds: string[]) => ({
	id,
	type: "group",
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	childIds,
});

/**
 * source を owner（owned 端点）、target を free にした connector。
 * connector は少なくとも一方の端点が owned である必要があるため、テストの最小形。
 */
const connector = (id: string, sourceOwnerId: string) => ({
	id,
	type: "connector",
	points: [],
	source: {
		owner: { id: sourceOwnerId, type: "rect" },
		anchor: { kind: "center" },
	},
	target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
});

const baseClipboard = (
	objects: Record<string, unknown>,
	rootIds: string[],
) => ({
	__type: "jiscribe-canvas-clipboard",
	version: 1,
	center: { x: 0, y: 0 },
	rootIds,
	objects,
});

describe("isClipboardData", () => {
	beforeEach(() => {
		objectStateValidatorRegistry.clear();
		objectStateValidatorRegistry.register("rect", isValidRectState);
		objectStateValidatorRegistry.register("group", isValidGroupState);
		objectStateValidatorRegistry.register("connector", isValidConnectorState);
	});
	afterEach(() => {
		objectStateValidatorRegistry.clear();
	});

	describe("基本構造", () => {
		it("妥当なクリップボードデータは true", () => {
			const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(true);
		});

		it("__type / version / center / rootIds が不正なら false", () => {
			const ok = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData({ ...ok, __type: "other" })).toBe(false);
			expect(isClipboardData({ ...ok, version: 2 })).toBe(false);
			expect(isClipboardData({ ...ok, center: { x: 0 } })).toBe(false);
			expect(isClipboardData({ ...ok, rootIds: [1] })).toBe(false);
			expect(isClipboardData(null)).toBe(false);
		});

		it("rootIds が objects に存在しない id を含むなら false", () => {
			const data = baseClipboard({ r1: rect("r1") }, ["r1", "missing"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("マップのキーとオブジェクト id が不一致なら false", () => {
			// キー "kX" だが id は "r1"。参照は id で解決するため自己完結性が崩れる。
			const data = baseClipboard({ kX: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});

	describe("型別検証の委譲", () => {
		it("構造不正（width 欠落）は false", () => {
			const broken = { ...rect("r1"), width: undefined };
			expect(isClipboardData(baseClipboard({ r1: broken }, ["r1"]))).toBe(
				false,
			);
		});

		it("CSS インジェクションを含む stroke は false", () => {
			const malicious = {
				...rect("r1"),
				stroke: "red; } body { background: url(x)",
			};
			expect(isClipboardData(baseClipboard({ r1: malicious }, ["r1"]))).toBe(
				false,
			);
		});

		it("未登録の型は false", () => {
			const unknown = { id: "x1", type: "evil", cx: 0, cy: 0 };
			expect(isClipboardData(baseClipboard({ x1: unknown }, ["x1"]))).toBe(
				false,
			);
		});

		it("レジストリ未初期化（空）の場合は既知の型でも false", () => {
			objectStateValidatorRegistry.clear();
			const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});

	describe("参照整合性（自己完結性 / #40）", () => {
		it("childIds / endpoint が自己完結する group・connector は true", () => {
			const objects = {
				r1: rect("r1"),
				g1: group("g1", ["r1"]),
				c1: connector("c1", "r1"),
			};
			const data = baseClipboard(objects, ["g1", "c1"]);
			expect(isClipboardData(data)).toBe(true);
		});

		it("group の childIds が objects に存在しない id を指すなら false（参照ハイジャック）", () => {
			// "ghost" は objects に無い。貼り付け先キャンバスの既存 id を取り込みうる。
			const objects = { r1: rect("r1"), g1: group("g1", ["r1", "ghost"]) };
			const data = baseClipboard(objects, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("connector の endpoint owner が objects に存在しない id を指すなら false", () => {
			// owner "ghost" は objects に無い。既存オブジェクトへ勝手に bind しうる。
			const objects = { c1: connector("c1", "ghost") };
			const data = baseClipboard(objects, ["c1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("両端 free の connector は false（少なくとも一方が owned 必須）", () => {
			const floating = {
				id: "c1",
				type: "connector",
				points: [],
				source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
				target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
			};
			const data = baseClipboard({ c1: floating }, ["c1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("空 childIds の group は false", () => {
			const data = baseClipboard({ g1: group("g1", []) }, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});
});
