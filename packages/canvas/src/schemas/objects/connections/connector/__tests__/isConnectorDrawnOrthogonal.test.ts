import { describe, expect, it } from "vitest";

import { isConnectorDrawnOrthogonal } from "../isConnectorDrawnOrthogonal";

const owned = (id: string) =>
	({
		owner: { id },
		anchor: { kind: "connectPoint", id: "rightCenter" },
	}) as const;

const free = (x: number, y: number) =>
	({ anchor: { kind: "free", point: { x, y } } }) as const;

describe("isConnectorDrawnOrthogonal", () => {
	it("treats an omitted routing as orthogonal", () => {
		expect(
			isConnectorDrawnOrthogonal({ source: owned("r1"), target: owned("r2") }),
		).toBe(true);
	});

	it("follows an explicit routing between two different shapes", () => {
		expect(
			isConnectorDrawnOrthogonal({
				source: owned("r1"),
				target: owned("r2"),
				routing: "orthogonal",
			}),
		).toBe(true);
		expect(
			isConnectorDrawnOrthogonal({
				source: owned("r1"),
				target: owned("r2"),
				routing: "straight",
			}),
		).toBe(false);
	});

	it("follows an explicit straight when one end is free", () => {
		expect(
			isConnectorDrawnOrthogonal({
				source: owned("r1"),
				target: free(10, 10),
				routing: "straight",
			}),
		).toBe(false);
	});

	// The case the two answers part ways on: routing survives a re-anchor once set explicitly, so a
	// self-loop can carry "straight" while routeSelfLoop draws it at right angles anyway.
	it("reports right angles for a self-loop carrying straight", () => {
		expect(
			isConnectorDrawnOrthogonal({
				source: owned("r1"),
				target: owned("r1"),
				routing: "straight",
			}),
		).toBe(true);
	});

	it("reports right angles for a self-loop with no routing set", () => {
		expect(
			isConnectorDrawnOrthogonal({ source: owned("r1"), target: owned("r1") }),
		).toBe(true);
	});
});
