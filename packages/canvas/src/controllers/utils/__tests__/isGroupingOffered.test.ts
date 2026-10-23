import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { isGroupingOffered } from "../isGroupingOffered";

const objectOf = (id: string, type: string): ObjectState =>
	({ id, type }) as unknown as ObjectState;

const makeState = (
	selectedIds: string[],
	objects: ObjectState[],
): Pick<CanvasControllerState, "selection" | "objects"> => ({
	selection: selectionOf(selectedIds),
	objects: Object.fromEntries(objects.map((object) => [object.id, object])),
});

describe("isGroupingOffered", () => {
	it("offers it for a multi-selection", () => {
		expect(
			isGroupingOffered(
				makeState(
					["r1", "r2"],
					[objectOf("r1", "rect"), objectOf("r2", "rect")],
				),
			),
		).toBe(true);
	});

	it("offers it for a multi-selection the group command refuses (connectors alone)", () => {
		expect(
			isGroupingOffered(
				makeState(
					["c1", "c2"],
					[objectOf("c1", "connector"), objectOf("c2", "connector")],
				),
			),
		).toBe(true);
	});

	it("offers it for a sole selected group", () => {
		expect(
			isGroupingOffered(makeState(["g1"], [objectOf("g1", "group")])),
		).toBe(true);
	});

	it("does not offer it for a sole selected object that is not a group", () => {
		expect(isGroupingOffered(makeState(["r1"], [objectOf("r1", "rect")]))).toBe(
			false,
		);
	});

	it("does not offer it while nothing is selected", () => {
		expect(isGroupingOffered(makeState([], []))).toBe(false);
	});
});
