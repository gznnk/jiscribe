import { describe, it, expect } from "vitest";

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

describe("isSelectedConnectorSelfLoop", () => {
	it("no connector selected -> false", () => {
		expect(isSelectedConnectorSelfLoop(null, {})).toBe(false);
	});

	it("selected ID is not a connector -> false", () => {
		const rect = { id: "r", type: "rect" } as unknown as ObjectState;
		expect(isSelectedConnectorSelfLoop("r", { r: rect })).toBe(false);
	});

	it("both ends share the same owner -> true (self-loop)", () => {
		expect(
			isSelectedConnectorSelfLoop("c", { c: connector("c", "n1", "n1") }),
		).toBe(true);
	});

	it("ends have different owners -> false", () => {
		expect(
			isSelectedConnectorSelfLoop("c", { c: connector("c", "n1", "n2") }),
		).toBe(false);
	});

	it("one end is unconnected -> false", () => {
		expect(
			isSelectedConnectorSelfLoop("c", { c: connector("c", "n1", undefined) }),
		).toBe(false);
	});
});
