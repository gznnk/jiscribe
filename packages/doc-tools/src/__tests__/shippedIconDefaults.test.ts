import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

// The icon an icon shape draws with `icon` omitted is stated twice: in the
// type's doc defaults, which the parser and the canvas use, and by hand in the
// schema generator's property overrides, which is what an AI reads. Nothing
// else ties the two together.

const require = createRequire(import.meta.url);

type IconProperty = { default?: unknown; description?: string };

const schema: {
	$defs: Record<string, { properties?: Record<string, IconProperty> }>;
} = JSON.parse(
	readFileSync(require.resolve("@jiscribe/doc-schema/schema"), "utf8"),
);

describe.each([
	{ type: "awsIcon", def: "AwsIconDoc" },
	{ type: "azureIcon", def: "AzureIconDoc" },
	{ type: "gcpIcon", def: "GcpIconDoc" },
])("the published schema's $type", ({ type, def }) => {
	const docDefault = standardObjectDocDefinitions.get(type)?.defaults?.icon;
	const icon = schema.$defs[def]?.properties?.icon;

	it("states the default icon the doc defaults draw", () => {
		expect(typeof docDefault).toBe("string");
		expect(icon?.default).toBe(docDefault);
	});

	it("names that same default in the description", () => {
		expect(icon?.description).toContain(`Omitted = "${String(docDefault)}"`);
	});
});
