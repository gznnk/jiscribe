import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { resolveGroupingCommandId } from "../resolveGroupingCommandId";

const objectOf = (id: string, type: string): ObjectState =>
	({ id, type }) as unknown as ObjectState;

const makeState = (
	selectedIds: string[],
	objects: ObjectState[],
): Pick<CanvasControllerState, "selection" | "objects"> => ({
	selection: selectionOf(selectedIds),
	objects: Object.fromEntries(objects.map((object) => [object.id, object])),
});

describe("resolveGroupingCommandId", () => {
	it("ungroups a sole selected group", () => {
		expect(
			resolveGroupingCommandId(makeState(["g1"], [objectOf("g1", "group")])),
		).toBe("ungroup");
	});

	it("groups a multi-selection, even one holding a group", () => {
		expect(
			resolveGroupingCommandId(
				makeState(
					["g1", "r1"],
					[objectOf("g1", "group"), objectOf("r1", "rect")],
				),
			),
		).toBe("group");
	});

	it("groups for a sole selected object that is not a group", () => {
		expect(
			resolveGroupingCommandId(makeState(["r1"], [objectOf("r1", "rect")])),
		).toBe("group");
	});

	it("groups for an empty selection or a selected id the objects lack", () => {
		expect(resolveGroupingCommandId(makeState([], []))).toBe("group");
		expect(resolveGroupingCommandId(makeState(["missing"], []))).toBe("group");
	});
});
