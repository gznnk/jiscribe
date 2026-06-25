import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { ObjectDoc } from "../../../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../../objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../../objects/primitives/group/GroupDoc";
import type { RectDoc } from "../../../objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "../../../objects/types/ObjectFeatures";
import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../../registry/ObjectDocValidatorRegistry";
import type { CanvasDoc } from "../../CanvasDoc";
import { validateSemantics } from "../validateSemantics";

const rect = (id: string): RectDoc =>
	({ id, type: "rect" }) as unknown as RectDoc;

const group = (id: string, children: unknown[]): GroupDoc =>
	({ id, type: "group", children }) as unknown as GroupDoc;

const ownedEndpoint = (type: string, id: string) => ({
	owner: { type, id },
	anchor: { kind: "center" },
});

const connector = (
	id: string,
	source: unknown,
	target: unknown,
): ConnectorDoc =>
	({ id, type: "connector", source, target }) as unknown as ConnectorDoc;

// connectable 判定は registry の features を参照するため、テスト用に最小登録する。
const noopValidate = () => [];
const features = (type: string, connectable: boolean): ObjectFeatures =>
	({ type, geometry: "rect", connectable }) as unknown as ObjectFeatures;

describe("validateSemantics", () => {
	beforeEach(() => {
		objectDocValidatorRegistry.clear();
		objectDocValidatorRegistry.register(
			"rect",
			noopValidate,
			features("rect", true),
		);
		objectDocValidatorRegistry.register(
			"group",
			noopValidate,
			features("group", false),
		);
		objectDocValidatorRegistry.register(
			"connector",
			noopValidate,
			features("connector", false),
		);
	});

	afterEach(() => {
		objectDocValidatorRegistry.clear();
	});

	describe("A. ID の一意性", () => {
		it("returns no errors for a valid tree", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [group("g1", [rect("r1")])],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("reports duplicate sibling ids as duplicates", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("dup"), rect("dup")],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toContain("duplicated");
		});

		it("reports an id reused within its own ancestor chain as a duplicate", () => {
			// ネストツリーでは循環は構造的に起きないため、同一 ID は重複として扱う。
			const doc: CanvasDoc = {
				version: 1,
				root: [group("g1", [group("g1", [])])],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].id).toBe("g1");
			expect(errors[0].message).toContain("duplicated");
		});

		it("reports a connector id that collides with an object id", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("x"),
					connector(
						"x",
						ownedEndpoint("rect", "x"),
						ownedEndpoint("rect", "x"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors.some((e) => e.message.includes("duplicated"))).toBe(true);
		});

		it("深くネストした重複 id を正しい path で報告する", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("dup"), group("g", [group("g2", [rect("dup")])])],
			};
			const errors = validateSemantics(doc);
			const hit = errors.find((e) => e.message.includes("duplicated"));
			expect(hit?.path).toBe("root[1].children[0].children[0]");
			expect(hit?.id).toBe("dup");
		});

		it("3つ同一 id があれば重複は 2 件報告される", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a"), rect("a"), rect("a")],
			};
			const errors = validateSemantics(doc).filter((e) =>
				e.message.includes("duplicated"),
			);
			expect(errors).toHaveLength(2);
		});
	});

	describe("B. connector の参照整合性", () => {
		it("accepts a connector between two connectable objects", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					rect("b"),
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "b"),
					),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("accepts free endpoints (no owner) without cross-document checks", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector("c1", ownedEndpoint("rect", "a"), {
						anchor: { kind: "free", point: { x: 0, y: 0 } },
					}),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("flags an endpoint owner that does not exist", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "missing"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1].target");
			expect(errors[0].message).toContain("does not exist");
		});

		it("flags an endpoint pointing at a non-connectable object", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					group("g1", []),
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("group", "g1"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[2].target");
			expect(errors[0].message).toContain("not connectable");
		});

		it("flags a connector pointing at another connector as not connectable", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "a"),
					),
					connector(
						"c2",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("connector", "c1"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(
				errors.some(
					(e) =>
						e.path === "root[2].target" &&
						e.message.includes("not connectable"),
				),
			).toBe(true);
		});

		it("flags a self-loop where source and target are the same object", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "a"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1]");
			expect(errors[0].message).toContain("same object");
		});

		it("source 側の参照切れも path 付きで報告する", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					rect("a"),
					connector(
						"c1",
						ownedEndpoint("rect", "missing"),
						ownedEndpoint("rect", "a"),
					),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("root[1].source");
			expect(errors[0].message).toContain("does not exist");
		});

		it("両端とも不正なら 2 件報告される（source / target）", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					connector(
						"c1",
						ownedEndpoint("rect", "m1"),
						ownedEndpoint("rect", "m2"),
					),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors.map((e) => e.path)).toEqual([
				"root[0].source",
				"root[0].target",
			]);
		});

		it("参照切れの端点があるとき self-loop は重ねて報告しない", () => {
			// owner が存在しないのに「同一オブジェクト」と述べる誤解を避ける。
			const doc: CanvasDoc = {
				version: 1,
				root: [
					connector(
						"c1",
						ownedEndpoint("rect", "z"),
						ownedEndpoint("rect", "z"),
					),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors.every((e) => e.message.includes("does not exist"))).toBe(
				true,
			);
			expect(errors.some((e) => e.message.includes("same object"))).toBe(false);
		});

		it("非接続可の端点があるとき self-loop は重ねて報告しない", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					group("g1", []),
					connector(
						"c1",
						ownedEndpoint("group", "g1"),
						ownedEndpoint("group", "g1"),
					),
				],
			};
			const errors = validateSemantics(doc);
			expect(errors.some((e) => e.message.includes("same object"))).toBe(false);
		});

		it("両端 free（owner なし）は self-loop と判定しない", () => {
			const freeEndpoint = { anchor: { kind: "free", point: { x: 0, y: 0 } } };
			const doc: CanvasDoc = {
				version: 1,
				root: [connector("c1", freeEndpoint, freeEndpoint)],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("group の子（ネスト）を参照するコネクターは有効", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					group("g", [rect("gr")]),
					rect("a"),
					connector(
						"c1",
						ownedEndpoint("rect", "gr"),
						ownedEndpoint("rect", "a"),
					),
				],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});
	});
});

// 上の describe はモックレジストリで connectable を仮定する。こちらは
// 実レジストリ（production の features）で connectable 判定を検証し、
// 誰かが Features.connectable を反転させた場合の回帰を防ぐ。
describe("validateSemantics（実レジストリの connectable）", () => {
	beforeEach(() => {
		initializeObjectDocValidatorRegistry();
	});
	afterEach(() => {
		objectDocValidatorRegistry.clear();
	});

	const targetDoc = (type: string): CanvasDoc => ({
		version: 1,
		root: [
			rect("a"),
			{ id: "t", type } as unknown as ObjectDoc,
			connector("c", ownedEndpoint("rect", "a"), ownedEndpoint(type, "t")),
		],
	});

	it.each(["rect", "ellipse", "diamond", "sticky"])(
		"%s は接続可（エラーなし）",
		(type) => {
			expect(validateSemantics(targetDoc(type))).toEqual([]);
		},
	);

	it.each(["polyline", "polygon", "svg", "group"])(
		"%s は非接続可（not connectable）",
		(type) => {
			const errors = validateSemantics(targetDoc(type));
			expect(
				errors.some(
					(e) =>
						e.path === "root[2].target" &&
						e.message.includes("not connectable"),
				),
			).toBe(true);
		},
	);
});
