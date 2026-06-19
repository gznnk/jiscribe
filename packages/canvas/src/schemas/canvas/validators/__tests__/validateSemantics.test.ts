import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { ConnectorDoc } from "../../../objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../../objects/primitives/group/GroupDoc";
import type { RectDoc } from "../../../objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "../../../objects/types/ObjectFeatures";
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
				connectors: [],
			};
			expect(validateSemantics(doc)).toEqual([]);
		});

		it("reports duplicate sibling ids as duplicates", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("dup"), rect("dup")],
				connectors: [],
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
				connectors: [],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].id).toBe("g1");
			expect(errors[0].message).toContain("duplicated");
		});

		it("reports a connector id that collides with an object id", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("x")],
				connectors: [
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
	});

	describe("B. connector の参照整合性", () => {
		it("accepts a connector between two connectable objects", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a"), rect("b")],
				connectors: [
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
				root: [rect("a")],
				connectors: [
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
				root: [rect("a")],
				connectors: [
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "missing"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("connectors[0].target");
			expect(errors[0].message).toContain("does not exist");
		});

		it("flags an endpoint pointing at a non-connectable object", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a"), group("g1", [])],
				connectors: [
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("group", "g1"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("connectors[0].target");
			expect(errors[0].message).toContain("not connectable");
		});

		it("flags a connector pointing at another connector as not connectable", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a")],
				connectors: [
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
						e.path === "connectors[1].target" &&
						e.message.includes("not connectable"),
				),
			).toBe(true);
		});

		it("flags a self-loop where source and target are the same object", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [rect("a")],
				connectors: [
					connector(
						"c1",
						ownedEndpoint("rect", "a"),
						ownedEndpoint("rect", "a"),
					),
				],
			};

			const errors = validateSemantics(doc);
			expect(errors).toHaveLength(1);
			expect(errors[0].path).toBe("connectors[0]");
			expect(errors[0].message).toContain("same object");
		});
	});
});
