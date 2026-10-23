import { BODY_TEXT_SLOT_ID, createCanvasRegistries } from "@jiscribe/canvas";
import type { ICanvasRegistries, StyleContext } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { awsShapesPlugin } from "../../plugin";
import { AWS_ICON_ENTRIES } from "../../schema/icon/iconData.generated";
import { AWS_TIER1_ICON_NAMES } from "../../schema/icon/tier1Icons";
import type { AwsIconState } from "../../state/AwsIconState";

const S3 = "service/amazon-simple-storage-service";
const LAMBDA = "service/aws-lambda";

/** Registered through the plugin, so what is tested is the entry the canvas reads. */
const registries = createCanvasRegistries({
	plugins: [awsShapesPlugin],
}) as unknown as ICanvasRegistries;

const ctx: StyleContext = {
	selected: true,
	shapeStyleDefaults: registries.objectShapeStyleDefaults,
	textStyleDefaults: registries.objectTextStyleDefaults,
	objectPartKind: registries.objectPartKind,
	textEditRange: null,
};

const iconEntry = registries.objectStyle.get("awsIcon")?.icon;
if (iconEntry === undefined) {
	throw new Error("awsIcon registers no icon entry");
}

const iconOf = (icon: string | undefined, label: string): AwsIconState =>
	({
		id: "a-1",
		type: "awsIcon",
		icon,
		text: { [BODY_TEXT_SLOT_ID]: { text: label, fontWeight: "bold" } },
	}) as unknown as AwsIconState;

const applyIcon = (object: AwsIconState, icon: string) =>
	iconEntry.apply(object, null, icon, ctx) as AwsIconState | null;

describe("the awsIcon icon entry", () => {
	it("carries a label the stencil placed over to the new icon's, keeping the slot's typography", () => {
		const updated = applyIcon(iconOf(S3, "S3"), LAMBDA);
		expect(updated?.icon).toBe(LAMBDA);
		expect(updated?.text?.[BODY_TEXT_SLOT_ID]).toEqual({
			text: "Lambda",
			fontWeight: "bold",
		});
	});

	it("reads an omitted icon as the default and the asset label outside tier 1", () => {
		const outsideTier1 = Object.keys(AWS_ICON_ENTRIES).find(
			(name) => !AWS_TIER1_ICON_NAMES.includes(name),
		)!;
		const updated = applyIcon(iconOf(undefined, "EC2"), outsideTier1);
		expect(updated?.text?.[BODY_TEXT_SLOT_ID]?.text).toBe(
			AWS_ICON_ENTRIES[outsideTier1]?.label,
		);
	});

	it("leaves a label the user wrote, an empty one included", () => {
		for (const label of ["Uploads bucket", ""]) {
			const updated = applyIcon(iconOf(S3, label), LAMBDA);
			expect(updated?.icon).toBe(LAMBDA);
			expect(updated?.text?.[BODY_TEXT_SLOT_ID]?.text).toBe(label);
		}
	});

	it("answers with the object itself when the icon is already that one", () => {
		const object = iconOf(S3, "S3");
		expect(applyIcon(object, S3)).toBe(object);
	});
});
