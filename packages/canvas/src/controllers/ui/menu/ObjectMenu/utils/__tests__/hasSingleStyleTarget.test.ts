import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { hasSingleStyleTarget } from "../hasSingleStyleTarget";

const rect = (id: string): ObjectState =>
	({ id, type: "rect" }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("hasSingleStyleTarget", () => {
	it("stands for one selected shape", () => {
		expect(hasSingleStyleTarget(["r1"], { r1: rect("r1") })).toBe(true);
	});

	it("does not stand for a selection of several, whose colors may disagree", () => {
		expect(
			hasSingleStyleTarget(["r1", "r2"], { r1: rect("r1"), r2: rect("r2") }),
		).toBe(false);
	});

	it("does not stand for a selected group, the write reaching its members", () => {
		expect(
			hasSingleStyleTarget(["g1"], {
				g1: group("g1", ["r1", "r2"]),
				r1: rect("r1"),
				r2: rect("r2"),
			}),
		).toBe(false);
	});

	it("stands for nothing when nothing is selected", () => {
		expect(hasSingleStyleTarget([], {})).toBe(false);
	});
});
