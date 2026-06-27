import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { isSelectedConnectorSelfLoop } from "../isSelectedConnectorSelfLoop";

const connector = (
	id: string,
	sourceOwnerId: string | undefined,
	targetOwnerId: string | undefined,
): ObjectState =>
	({
		id,
		type: "connector",
		source: { owner: sourceOwnerId ? { id: sourceOwnerId } : undefined },
		target: { owner: targetOwnerId ? { id: targetOwnerId } : undefined },
	}) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedConnectorId: string | null,
): CanvasControllerState =>
	({ objects, selectedConnectorId }) as unknown as CanvasControllerState;

describe("isSelectedConnectorSelfLoop", () => {
	it("コネクター未選択 → false", () => {
		expect(isSelectedConnectorSelfLoop(state({}, null))).toBe(false);
	});

	it("選択 ID がコネクターでない → false", () => {
		const rect = { id: "r", type: "rect" } as unknown as ObjectState;
		expect(isSelectedConnectorSelfLoop(state({ r: rect }, "r"))).toBe(false);
	});

	it("両端が同一 owner → true（自己ループ）", () => {
		const s = state({ c: connector("c", "n1", "n1") }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(true);
	});

	it("両端が別 owner → false", () => {
		const s = state({ c: connector("c", "n1", "n2") }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(false);
	});

	it("片端が未接続 → false", () => {
		const s = state({ c: connector("c", "n1", undefined) }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(false);
	});
});
