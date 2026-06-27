import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedRouting } from "../getSelectedRouting";

const connector = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "connector", ...extra }) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedConnectorId: string | null,
): CanvasControllerState =>
	({ objects, selectedConnectorId }) as unknown as CanvasControllerState;

describe("getSelectedRouting", () => {
	it("コネクター未選択 → 既定の orthogonal", () => {
		expect(getSelectedRouting(state({}, null))).toBe("orthogonal");
	});

	it("routing 省略 → orthogonal", () => {
		const s = state({ c: connector("c") }, "c");
		expect(getSelectedRouting(s)).toBe("orthogonal");
	});

	it("routing が 'straight' → straight", () => {
		const s = state({ c: connector("c", { routing: "straight" }) }, "c");
		expect(getSelectedRouting(s)).toBe("straight");
	});

	it("routing が 'orthogonal' → orthogonal", () => {
		const s = state({ c: connector("c", { routing: "orthogonal" }) }, "c");
		expect(getSelectedRouting(s)).toBe("orthogonal");
	});
});
