import { describe, expect, it } from "vitest";

import type { ConnectorLabel } from "../../../../../../schemas/objects/connections/connector/ConnectorDoc";
import { applyLabelPlacement } from "../applyLabelPlacement";

const label: ConnectorLabel = { text: "Yes" };

describe("applyLabelPlacement", () => {
	it("writes the rounded placement", () => {
		expect(
			applyLabelPlacement(label, { position: 0.123456789, offset: 12.98765 }),
		).toEqual({ text: "Yes", position: 0.1235, offset: 12.9877 });
	});

	it("clamps position into [0, 1] (the state validator rejects anything else)", () => {
		expect(applyLabelPlacement(label, { position: -3, offset: 1 })).toEqual({
			text: "Yes",
			position: 0,
			offset: 1,
		});
		expect(applyLabelPlacement(label, { position: 7, offset: 1 })).toEqual({
			text: "Yes",
			position: 1,
			offset: 1,
		});
	});

	it("drops keys that land back on their default", () => {
		expect(applyLabelPlacement(label, { position: 0.5, offset: 0 })).toEqual({
			text: "Yes",
		});
		// Values that round onto the default are dropped as well, negative zero included.
		expect(
			applyLabelPlacement(label, { position: 0.500001, offset: -0.000001 }),
		).toEqual({ text: "Yes" });
	});

	it("replaces an existing placement instead of merging with it", () => {
		const placed: ConnectorLabel = { text: "Yes", position: 0.2, offset: 8 };
		expect(applyLabelPlacement(placed, { position: 0.5, offset: 0 })).toEqual({
			text: "Yes",
		});
		expect(applyLabelPlacement(placed, { position: 0.9, offset: 3 })).toEqual({
			text: "Yes",
			position: 0.9,
			offset: 3,
		});
	});

	it("keeps style keys untouched", () => {
		const styled: ConnectorLabel = {
			text: "Yes",
			fill: "#dc2626",
			fontWeight: "bold",
			strokeWidth: 2,
		};
		expect(applyLabelPlacement(styled, { position: 0.25, offset: 4 })).toEqual({
			text: "Yes",
			fill: "#dc2626",
			fontWeight: "bold",
			strokeWidth: 2,
			position: 0.25,
			offset: 4,
		});
	});
});
