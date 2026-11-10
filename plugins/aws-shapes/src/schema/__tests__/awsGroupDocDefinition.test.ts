import { createCanvasParser } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import {
	awsGroupDocDefinition,
	awsIconDocDefinition,
	awsShapesDocPlugin,
} from "../../doc";
import { AWS_GROUP_HEADER_HEIGHT } from "../AwsGroupDoc";

describe("awsGroupDocDefinition.layoutContainer", () => {
	it("declares the group a container whose title band is the badge row", () => {
		expect(
			awsGroupDocDefinition.layoutContainer?.({
				id: "awsGroup-1",
				type: "awsGroup",
			}),
		).toEqual({ titleHeight: AWS_GROUP_HEADER_HEIGHT });
	});

	it("leaves the icon a box like any other", () => {
		expect(awsIconDocDefinition.layoutContainer).toBeUndefined();
	});
});

describe("awsGroupDocDefinition's label", () => {
	it("is created without a background of its own, the label sitting on the frame's own fill", () => {
		const created = awsGroupDocDefinition.factory?.createDoc({ x: 0, y: 0 });
		expect(created).not.toHaveProperty("labelFill");
		expect(created).not.toHaveProperty("verticalAlign");
	});
});

describe("an awsGroup written with a label background", () => {
	// An "innerLabel" caption holds no labelFill, so one in a document (written
	// while awsGroup was a "label" type) is a name the type does not carry:
	// reported with the warning any unknown key gets and dropped.
	const parsed = createCanvasParser({ plugins: [awsShapesDocPlugin] }).parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "g-1",
					type: "awsGroup",
					x: 0,
					y: 0,
					width: 320,
					height: 200,
					text: "VPC",
					labelFill: "#ffffff",
					fontSize: 14,
				},
			],
		}),
	);

	it("parses, warns about the background as an unknown property, and keeps nothing of it", () => {
		expect(parsed.kind).toBe("ok");
		if (parsed.kind !== "ok") {
			return;
		}
		expect(parsed.warnings).toContainEqual(
			expect.objectContaining({
				path: "root[0].labelFill",
				severity: "warning",
				message: expect.stringContaining('Unknown property "labelFill"'),
			}),
		);
		const group = parsed.doc.root[0] as Record<string, unknown>;
		expect(group).not.toHaveProperty("labelFill");
		expect(group).toMatchObject({ text: "VPC", fontSize: 14 });
	});

	it("still refuses typography the caption could not be drawn with", () => {
		const refused = createCanvasParser({ plugins: [awsShapesDocPlugin] }).parse(
			JSON.stringify({
				version: 1,
				root: [
					{
						id: "g-1",
						type: "awsGroup",
						x: 0,
						y: 0,
						width: 320,
						height: 200,
						text: "VPC",
						fontSize: -1,
					},
				],
			}),
		);
		expect(refused.kind).not.toBe("ok");
	});
});
