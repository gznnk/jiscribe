import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { getSelectedConnectorId } from "../getSelectedConnectorId";

const objects: Record<string, ObjectState> = {
	"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
	"conn-1": { id: "conn-1", type: "connector" } as unknown as ObjectState,
	"conn-2": { id: "conn-2", type: "connector" } as unknown as ObjectState,
};

describe("getSelectedConnectorId", () => {
	it("answers with a lone selected connector", () => {
		expect(
			getSelectedConnectorId({ selection: selectionOf(["conn-1"]), objects }),
		).toBe("conn-1");
	});

	it("gives null for a selected shape", () => {
		expect(
			getSelectedConnectorId({ selection: selectionOf(["rect-1"]), objects }),
		).toBeNull();
	});

	it("gives null while nothing is selected", () => {
		expect(
			getSelectedConnectorId({ selection: selectionOf([]), objects }),
		).toBeNull();
	});

	it("gives null for a multi-selection, connectors included", () => {
		expect(
			getSelectedConnectorId({
				selection: selectionOf(["conn-1", "conn-2"]),
				objects,
			}),
		).toBeNull();
	});

	it("gives null for an id the canvas does not hold", () => {
		expect(
			getSelectedConnectorId({ selection: selectionOf(["gone"]), objects }),
		).toBeNull();
	});
});
