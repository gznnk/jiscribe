import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { createDocValidatorRegistry } from "@jiscribe/doc/unstable";
import {
	standardDocPlugins,
	standardObjectDocDefinitions,
} from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

// The guard against a shipped type losing a property it legitimately holds. The
// parser's registry reports every name a type's definition does not account for
// as an unknown property, and answers by taking that field out of the document it
// hands back — so a name missing from `extraKeys` is a value the next save
// deletes. The published JSON schema is the other statement of what a type may
// hold, and the `$def`s that matter most here are hand-written (group, connector,
// svg, image, polyline, polygon), which makes it an independent list to hold the
// registry against.
//
// Asked of the registry rather than of a parsed document on purpose: the check is
// about names, so the values are filled in with nulls, and a document of those
// would fail the parser on its values long before it could report a name.

const require = createRequire(import.meta.url);

type SchemaDef = {
	properties?: Record<string, unknown>;
	allOf?: { $ref?: string }[];
};

const schema: { $defs: Record<string, SchemaDef> } = JSON.parse(
	readFileSync(require.resolve("@jiscribe/doc-schema/schema"), "utf8"),
);

/** The `$def` name a local `#/$defs/Xxx` reference points at. */
const refName = (ref: string): string => ref.replace("#/$defs/", "");

/** Every property name a `$def` states, the ones it inherits through `allOf` included. */
const collectSchemaProperties = (defName: string): string[] => {
	const def = schema.$defs[defName];
	if (def === undefined) {
		return [];
	}
	return [
		...Object.keys(def.properties ?? {}),
		...(def.allOf ?? []).flatMap((entry) =>
			entry.$ref === undefined
				? []
				: collectSchemaProperties(refName(entry.$ref)),
		),
	];
};

/** Object type name → the properties the schema lets a document write on it. */
const schemaPropertiesByType = new Map<string, string[]>(
	Object.keys(schema.$defs).flatMap((defName) => {
		const typeConst = (
			schema.$defs[defName].properties?.type as { const?: unknown } | undefined
		)?.const;
		return typeof typeConst === "string"
			? [[typeConst, collectSchemaProperties(defName)] as [string, string[]]]
			: [];
	}),
);

// The very registry `createCanvasParser` builds for the shipped set.
const registry = createDocValidatorRegistry({ plugins: standardDocPlugins });

describe("every shipped type's own property names", () => {
	it("covers the whole standard set, so no type is skipped unnoticed", () => {
		expect([...schemaPropertiesByType.keys()].sort()).toEqual(
			[...standardObjectDocDefinitions.keys()].sort(),
		);
	});

	it.each([...schemaPropertiesByType.keys()])(
		"is known to the parser for %s, so none of them is dropped on save",
		(type) => {
			// The values do not matter: an unknown-property warning is about the name
			// alone, and every other diagnostic is filtered out here.
			const everyProperty = Object.fromEntries(
				schemaPropertiesByType.get(type)!.map((name) => [name, null]),
			);
			const unknown = registry
				.validate(type, everyProperty, "root[0]")
				.filter((diagnostic) => diagnostic.unknownKeyPath !== undefined)
				.map((diagnostic) => diagnostic.unknownKeyPath);
			expect(unknown).toEqual([]);
		},
	);

	it.each(["polygon", "polyline", "connector"])(
		"still reports a name %s does not hold, the poly family taking no frame validator",
		(type) => {
			// The doc is otherwise empty, so the type's own errors come with it.
			expect(
				registry
					.validate(type, { zzUnknown: 1 }, "root[0]")
					.filter((diagnostic) => diagnostic.unknownKeyPath !== undefined),
			).toEqual([
				{
					path: "root[0].zzUnknown",
					message: `Unknown property "zzUnknown" on a "${type}": it was ignored and will be dropped on save.`,
					severity: "warning",
					unknownKeyPath: ["zzUnknown"],
				},
			]);
		},
	);
});
