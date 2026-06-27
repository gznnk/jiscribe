import { describe, expect, it } from "vitest";

import { isSelfLoopConnector } from "../isSelfLoopConnector";

const owned = (id: string) => ({
	owner: { type: "rect" as const, id },
	anchor: { kind: "center" as const },
});

const free = (x: number, y: number) => ({
	anchor: { kind: "free" as const, point: { x, y } },
});

describe("isSelfLoopConnector", () => {
	it("両端が同一 owner なら true", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: owned("r1") }),
		).toBe(true);
	});

	it("両端が別 owner なら false", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: owned("r2") }),
		).toBe(false);
	});

	it("片方が free なら false", () => {
		expect(
			isSelfLoopConnector({ source: owned("r1"), target: free(10, 10) }),
		).toBe(false);
	});

	it("両端 free なら false（owner が無いので同一とみなさない）", () => {
		expect(
			isSelfLoopConnector({ source: free(0, 0), target: free(10, 10) }),
		).toBe(false);
	});
});
