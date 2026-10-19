import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { hasSelectedConnectorLabelText } from "../hasSelectedConnectorLabelText";

const objectsOf = (connector: Record<string, unknown>) =>
	({ c1: { id: "c1", type: "connector", ...connector } }) as unknown as Record<
		string,
		ObjectState
	>;

describe("hasSelectedConnectorLabelText", () => {
	it("is true for a selected connector whose label has text", () => {
		expect(
			hasSelectedConnectorLabelText({
				selection: selectionOf(["c1"]),
				objects: objectsOf({ label: { text: "Yes" } }),
			}),
		).toBe(true);
	});

	it("is false when the label's text is empty", () => {
		expect(
			hasSelectedConnectorLabelText({
				selection: selectionOf(["c1"]),
				objects: objectsOf({ label: { text: "" } }),
			}),
		).toBe(false);
	});

	it("is false for a connector carrying no label", () => {
		expect(
			hasSelectedConnectorLabelText({
				selection: selectionOf(["c1"]),
				objects: objectsOf({}),
			}),
		).toBe(false);
	});

	it("is false when the selected id names no object", () => {
		expect(
			hasSelectedConnectorLabelText({
				selection: selectionOf(["missing"]),
				objects: {},
			}),
		).toBe(false);
	});

	it("is false when no connector is selected", () => {
		expect(
			hasSelectedConnectorLabelText({
				selection: selectionOf([]),
				objects: objectsOf({ label: { text: "Yes" } }),
			}),
		).toBe(false);
	});
});
