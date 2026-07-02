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
	it("no connector selected -> false", () => {
		expect(isSelectedConnectorSelfLoop(state({}, null))).toBe(false);
	});

	it("selected ID is not a connector -> false", () => {
		const rect = { id: "r", type: "rect" } as unknown as ObjectState;
		expect(isSelectedConnectorSelfLoop(state({ r: rect }, "r"))).toBe(false);
	});

	it("both ends share the same owner -> true (self-loop)", () => {
		const s = state({ c: connector("c", "n1", "n1") }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(true);
	});

	it("ends have different owners -> false", () => {
		const s = state({ c: connector("c", "n1", "n2") }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(false);
	});

	it("one end is unconnected -> false", () => {
		const s = state({ c: connector("c", "n1", undefined) }, "c");
		expect(isSelectedConnectorSelfLoop(s)).toBe(false);
	});
});
