import { describe, expect, it } from "vitest";

import { isSelfLoopConnector } from "../isSelfLoopConnector";

const owned = (id: string) => ({
	owner: { id },
	anchor: { kind: "center" as const },
});

const free = (x: number, y: number) => ({
	anchor: { kind: "free" as const, point: { x, y } },
});

describe("isSelfLoopConnector", () => {
	it("true when both ends share the same owner", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: owned("r1") }),
		).toBe(true);
	});

	it("false when the ends have different owners", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: owned("r2") }),
		).toBe(false);
	});

	it("false when one end is free", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: free(10, 10) }),
		).toBe(false);
	});

	it("false when both ends are free (no owner, so not treated as identical)", () => {
		expect(
			isSelfLoopConnector({ source: free(0, 0), target: free(10, 10) }),
		).toBe(false);
	});
});
