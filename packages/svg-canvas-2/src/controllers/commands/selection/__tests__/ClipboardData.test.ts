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

const baseClipboard = (
	objects: Record<string, unknown>,
	rootIds: string[],
) => ({
	__type: "jiscribe-canvas-clipboard",
	version: 1,
	center: { x: 0, y: 0 },
	rootIds,
	connectorIds: [],
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

	it("妥当なクリップボードデータは true", () => {
		const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
		expect(isClipboardData(data)).toBe(true);
	});

	it("group / connector を含む妥当なデータは true", () => {
		const objects = {
			r1: rect("r1"),
			g1: {
				id: "g1",
				type: "group",
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				childIds: ["r1"],
			},
			c1: {
				id: "c1",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
				],
				source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
				target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
			},
		};
		const data = {
			...baseClipboard(objects, ["g1"]),
			connectorIds: ["c1"],
		};
		expect(isClipboardData(data)).toBe(true);
	});

	it("構造不正（width 欠落）は false", () => {
		const broken = { ...rect("r1"), width: undefined };
		expect(isClipboardData(baseClipboard({ r1: broken }, ["r1"]))).toBe(false);
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
		expect(isClipboardData(baseClipboard({ x1: unknown }, ["x1"]))).toBe(false);
	});

	it("レジストリ未初期化（空）の場合は既知の型でも false", () => {
		objectStateValidatorRegistry.clear();
		const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
		expect(isClipboardData(data)).toBe(false);
	});
});
