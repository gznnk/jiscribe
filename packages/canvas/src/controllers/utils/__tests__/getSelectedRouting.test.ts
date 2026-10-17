import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { getSelectedRouting } from "../getSelectedRouting";

const connector = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "connector", ...extra }) as unknown as ObjectState;

describe("getSelectedRouting", () => {
	it("no connector selected -> default orthogonal", () => {
		expect(
			getSelectedRouting({ selection: selectionOf([]), objects: {} }),
		).toBe("orthogonal");
	});

	it("routing omitted -> orthogonal", () => {
		expect(
			getSelectedRouting({
				selection: selectionOf(["c"]),
				objects: { c: connector("c") },
			}),
		).toBe("orthogonal");
	});

	it("routing is 'straight' -> straight", () => {
		expect(
			getSelectedRouting({
				selection: selectionOf(["c"]),
				objects: { c: connector("c", { routing: "straight" }) },
			}),
		).toBe("straight");
	});

	it("routing is 'orthogonal' -> orthogonal", () => {
		expect(
			getSelectedRouting({
				selection: selectionOf(["c"]),
				objects: { c: connector("c", { routing: "orthogonal" }) },
			}),
		).toBe("orthogonal");
	});
});
