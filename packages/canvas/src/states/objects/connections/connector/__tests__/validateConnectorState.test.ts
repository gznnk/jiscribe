import { describe, expect, it } from "vitest";

import {
	isValidConnectorLabelState,
	isValidConnectorState,
} from "../validateConnectorState";

const ownedRef = {
	owner: { id: "r1", type: "rect" },
	anchor: { kind: "center" },
};
const freeRef = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

const validConnector = {
	id: "c1",
	type: "connector",
	points: [],
	stroke: "#000",
	source: ownedRef,
	target: freeRef,
};

describe("isValidConnectorState", () => {
	it("owned + free / owned + owned は true", () => {
		expect(isValidConnectorState(validConnector)).toBe(true);
		expect(isValidConnectorState({ ...validConnector, target: ownedRef })).toBe(
			true,
		);
	});

	it("中間経由点（points）は空配列でも true、点を持っても true", () => {
		expect(isValidConnectorState({ ...validConnector, points: [] })).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, points: [{ x: 5, y: 5 }] }),
		).toBe(true);
	});

	it("両端 free は false（少なくとも一方が owned 必須）", () => {
		expect(
			isValidConnectorState({
				...validConnector,
				source: freeRef,
				target: freeRef,
			}),
		).toBe(false);
	});

	it("source / target が欠落は false", () => {
		expect(
			isValidConnectorState({ ...validConnector, source: undefined }),
		).toBe(false);
		expect(
			isValidConnectorState({ ...validConnector, target: undefined }),
		).toBe(false);
	});

	it("owner.id が文字列でない端点は false", () => {
		const badRef = {
			owner: { id: 123, type: "rect" },
			anchor: { kind: "center" },
		};
		expect(isValidConnectorState({ ...validConnector, source: badRef })).toBe(
			false,
		);
	});

	it("不正な ArrowType は false", () => {
		expect(
			isValidConnectorState({ ...validConnector, endArrow: "diamond" }),
		).toBe(false);
	});

	it("routing は省略・straight・orthogonal を許容する", () => {
		expect(isValidConnectorState(validConnector)).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, routing: "straight" }),
		).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, routing: "orthogonal" }),
		).toBe(true);
	});

	it("未知の routing 値は false", () => {
		expect(
			isValidConnectorState({ ...validConnector, routing: "diagonal" }),
		).toBe(false);
	});

	it("label が不正な構造のコネクターは false（label 検証の配線確認）", () => {
		expect(
			isValidConnectorState({ ...validConnector, label: { text: 123 } }),
		).toBe(false);
		expect(
			isValidConnectorState({
				...validConnector,
				label: { text: "Yes", position: 0.5 },
			}),
		).toBe(true);
	});
});

describe("isValidConnectorLabelState", () => {
	it("未指定（undefined）はラベル無しとして true", () => {
		expect(isValidConnectorLabelState(undefined)).toBe(true);
	});

	it("text のみの最小ラベルは true", () => {
		expect(isValidConnectorLabelState({ text: "Yes" })).toBe(true);
	});

	it("位置・スタイルを正しい型で持てば true", () => {
		expect(
			isValidConnectorLabelState({
				text: "成功",
				position: 0.25,
				offset: -8,
				fontColor: "#2E7D32",
				fontSize: 14,
				fontWeight: "bold",
			}),
		).toBe(true);
	});

	it("背景（fill）・枠線（stroke/strokeWidth/strokeDashType）を正しい型で持てば true", () => {
		expect(
			isValidConnectorLabelState({
				text: "Yes",
				fill: "#ffffff",
				stroke: "auto",
				strokeWidth: 2,
				strokeDashType: "dashed",
			}),
		).toBe(true);
	});

	it("fill / stroke / strokeWidth / strokeDashType の型が合わないと false", () => {
		expect(isValidConnectorLabelState({ text: "x", fill: 0 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", stroke: 1 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", strokeWidth: "2" })).toBe(
			false,
		);
		expect(
			isValidConnectorLabelState({ text: "x", strokeDashType: "double" }),
		).toBe(false);
	});

	it("オブジェクトでない（文字列・null）は false", () => {
		expect(isValidConnectorLabelState("Yes")).toBe(false);
		expect(isValidConnectorLabelState(null)).toBe(false);
	});

	it("text が無い／文字列でないと false", () => {
		expect(isValidConnectorLabelState({})).toBe(false);
		expect(isValidConnectorLabelState({ text: 123 })).toBe(false);
	});

	it("存在する場合に型が合わないフィールドは false", () => {
		expect(isValidConnectorLabelState({ text: "x", position: "0.5" })).toBe(
			false,
		);
		expect(isValidConnectorLabelState({ text: "x", offset: "0" })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", fontSize: "14" })).toBe(
			false,
		);
		expect(isValidConnectorLabelState({ text: "x", fontColor: 0 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", fontWeight: 700 })).toBe(
			false,
		);
	});
});
