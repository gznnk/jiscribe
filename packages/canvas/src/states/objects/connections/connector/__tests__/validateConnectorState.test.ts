import { describe, expect, it } from "vitest";

import { isValidConnectorState } from "../validateConnectorState";

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
});
