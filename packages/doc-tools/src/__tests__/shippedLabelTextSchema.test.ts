import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { hasLabelFill, isCaptionText } from "@jiscribe/doc";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

// What the published schema offers a caption type has to be what its doc
// validator takes: no vertical placement, and the caption's background for a
// `features.text: "label"` type alone. The generator assembles that from the features; this pins the
// assembled result for every shipped type, whichever path its $def took.

const require = createRequire(import.meta.url);

type SchemaDef = {
	allOf?: { $ref: string }[];
	properties?: Record<string, unknown>;
};

const schema: { $defs: Record<string, SchemaDef> } = JSON.parse(
	readFileSync(require.resolve("@jiscribe/doc-schema/schema"), "utf8"),
);

/** Every property name a $def offers, the shared $defs it extends included. */
const offeredProperties = (defName: string): string[] => {
	const def = schema.$defs[defName];
	return [
		...Object.keys(def.properties ?? {}),
		...(def.allOf ?? []).flatMap((branch) =>
			offeredProperties(branch.$ref.replace("#/$defs/", "")),
		),
	];
};

const defNameOf = (type: string): string =>
	`${type.charAt(0).toUpperCase()}${type.slice(1)}Doc`;

const captionTypes = [...standardObjectDocDefinitions]
	.filter(([, definition]) => isCaptionText(definition.features.text))
	.map(([type]) => type);

const labelTypes = [...standardObjectDocDefinitions]
	.filter(([, definition]) => hasLabelFill(definition.features.text))
	.map(([type]) => type);

describe("the published schema's caption text types", () => {
	it("covers the sixteen shipped types drawing a caption sized from its own text", () => {
		expect(captionTypes.sort()).toEqual(
			[
				"actor",
				"awsGroup",
				"awsIcon",
				"azureIcon",
				"brace",
				"bracket",
				"bracketWithStem",
				"cross",
				"envelope",
				"extract",
				"gcpIcon",
				"gear",
				"lock",
				"package",
				"queue",
				"server",
			].sort(),
		);
	});

	it("gives every one but awsGroup a background behind the caption", () => {
		expect(captionTypes.filter((type) => !labelTypes.includes(type))).toEqual([
			"awsGroup",
		]);
	});

	it.each(captionTypes)(
		"offers %s the typography and no vertical placement",
		(type) => {
			const properties = offeredProperties(defNameOf(type));
			expect(properties).toContain("fontWeight");
			expect(properties).not.toContain("verticalAlign");
			expect(properties).not.toContain("textVerticalBasis");
		},
	);

	it.each(labelTypes)("offers %s the caption's background", (type) => {
		expect(offeredProperties(defNameOf(type))).toContain("labelFill");
	});

	it("offers awsGroup, whose title sits on its own fill, no caption background", () => {
		expect(offeredProperties("AwsGroupDoc")).not.toContain("labelFill");
	});

	it("offers no caption background to a type holding its text inside the box", () => {
		expect(offeredProperties("RectDoc")).not.toContain("labelFill");
		expect(offeredProperties("CloudDoc")).not.toContain("labelFill");
	});
});
