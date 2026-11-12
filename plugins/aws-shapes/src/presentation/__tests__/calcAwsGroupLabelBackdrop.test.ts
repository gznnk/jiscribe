import { describe, expect, it } from "vitest";

import { awsGroupDefinition } from "../../definition";
import type { AwsGroupState } from "../../state/AwsGroupState";
import { calcAwsGroupLabelBackdrop } from "../calcAwsGroupLabelBackdrop";

const GROUP = { width: 320, height: 200 } as AwsGroupState;

describe("calcAwsGroupLabelBackdrop", () => {
	it("paints the whole box in the body's resolved fill", () => {
		expect(
			calcAwsGroupLabelBackdrop(GROUP, {
				fillColor: "#e9f3e6",
				fillAlpha: 0.8,
			}),
		).toEqual([
			{
				rect: { x: -160, y: -100, width: 320, height: 200 },
				fill: "#e9f3e6",
				fillOpacity: 0.8,
			},
		]);
	});

	it("is what the type declares as its backdrop", () => {
		expect(awsGroupDefinition.labelBackdrop).toBe(calcAwsGroupLabelBackdrop);
	});
});
