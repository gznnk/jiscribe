import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
	createDocValidatorRegistry,
	validateDocKeys,
} from "@jiscribe/doc/unstable";
import {
	standardDocPlugins,
	standardObjectDocDefinitions,
} from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

// The guard against a shipped type losing a property it legitimately holds. The
// parser's registry reports every name a type's definition does not account for
// as an unknown property, and answers by taking that field out of the document it
// hands back — so a name missing from `extraKeys` (or from a key constant of one of
// the containers doc owns: a run, a slot, a vertex, an endpoint, an anchor, a
// label) is a value the next save deletes. The published JSON schema is the other
// statement of what a type may hold, and the `$def`s that matter most here are
// hand-written (group, connector, svg, image, polyline, polygon), which makes it an
// independent list to hold the registry against.
//
// Asked of the registry rather than of a parsed document on purpose: the check is
// about names, and a document holding every name of every branch at once is not one
// the parser would accept. The values are filled in from the schema's own types
// (buildLeaf) rather than with nulls, so that a type's validator says nothing at the
// paths this pass watches — one that did would hide the warning it is looking for.

const require = createRequire(import.meta.url);

type SchemaNode = {
	[key: string]: unknown;
	$ref?: string;
	const?: unknown;
	enum?: unknown[];
	properties?: Record<string, SchemaNode>;
	items?: SchemaNode;
	anyOf?: SchemaNode[];
	oneOf?: SchemaNode[];
	allOf?: SchemaNode[];
};

const schema: { $defs: Record<string, SchemaNode> } = JSON.parse(
	readFileSync(require.resolve("@jiscribe/doc-schema/schema"), "utf8"),
);

/** The node a local pointer names, `#/$defs/Point` and `#/$defs/TextStyle/properties/fontSize` alike. */
const resolveRef = (ref: string): SchemaNode => {
	const [defName, ...rest] = ref.replace("#/$defs/", "").split("/");
	return rest.reduce<SchemaNode>(
		(node, segment) => node[segment] as SchemaNode,
		schema.$defs[defName],
	);
};

/**
 * Every property a node states, the ones it inherits through `allOf` included, as
 * the nodes themselves so a value can be built for each.
 *
 * `visited` holds the refs followed to get here: a `$def` reachable from itself (a
 * group's children hold groups) would otherwise never bottom out.
 */
const collectPropertyNodes = (
	node: SchemaNode,
	visited: readonly string[],
): Record<string, SchemaNode> => {
	if (node.$ref !== undefined) {
		return visited.includes(node.$ref)
			? {}
			: collectPropertyNodes(resolveRef(node.$ref), [...visited, node.$ref]);
	}
	return {
		...Object.fromEntries(
			(node.allOf ?? []).flatMap((entry) =>
				Object.entries(collectPropertyNodes(entry, visited)),
			),
		),
		...node.properties,
	};
};

const isObjectNode = (node: SchemaNode): boolean =>
	node.properties !== undefined || node.type === "object";

/**
 * A value of the type the node declares, so that the type's own validator accepts
 * it and reports nothing at the path this pass is watching — a validator error
 * there would hide the unknown-property warning (validateDocKeys drops a warning a
 * validator already spoke at). The value itself is never read: `1` clears every
 * minimum the shipped schema states, and a string is accepted wherever one belongs.
 */
const buildLeaf = (node: SchemaNode): unknown => {
	if (node.default !== undefined) {
		return node.default;
	}
	switch (node.type) {
		case "number":
		case "integer":
			return 1;
		case "string":
			return "a";
		case "boolean":
			return false;
		case "array":
			return [];
		default:
			return null;
	}
};

/**
 * One object per branch a single property offers, the other properties kept at
 * their first: every shape the schema admits is reached without multiplying the
 * branches out against each other.
 */
const buildObjectVariants = (
	node: SchemaNode,
	visited: readonly string[],
): unknown[] => {
	const variantsByName = Object.entries(
		collectPropertyNodes(node, visited),
	).map(([name, child]) => [name, buildVariants(child, visited)] as const);
	const base = Object.fromEntries(
		variantsByName.map(([name, variants]) => [name, variants[0]]),
	);
	return [
		base,
		...variantsByName.flatMap(([name, variants]) =>
			variants.slice(1).map((value) => ({ ...base, [name]: value })),
		),
	];
};

/**
 * The values a node describes, one per branch it offers. A leaf yields `null`: the
 * check is about names, and a `const` (an anchor's `kind`) is the exception, being
 * what decides which names the object around it may carry.
 */
function buildVariants(
	node: SchemaNode,
	visited: readonly string[],
): unknown[] {
	if (node.$ref !== undefined) {
		return visited.includes(node.$ref)
			? [null]
			: buildVariants(resolveRef(node.$ref), [...visited, node.$ref]);
	}
	if (node.const !== undefined) {
		return [node.const];
	}
	if (node.enum !== undefined) {
		return [node.enum[0]];
	}
	if (isObjectNode(node)) {
		return buildObjectVariants(node, visited);
	}
	const branches = node.anyOf ?? node.oneOf ?? node.allOf;
	if (branches !== undefined) {
		return branches.flatMap((branch) => buildVariants(branch, visited));
	}
	if (node.items !== undefined) {
		return buildVariants(node.items, visited).map((item) => [item]);
	}
	return [buildLeaf(node)];
}

/** Object type name → the `$def` describing it. */
const defNameByType = new Map<string, string>(
	Object.keys(schema.$defs).flatMap((defName) => {
		const typeConst = schema.$defs[defName].properties?.type?.const;
		return typeof typeConst === "string"
			? [[typeConst, defName] as [string, string]]
			: [];
	}),
);

/** Every shape the schema lets a document write for one type, each holding all of its names. */
const buildDocFixtures = (type: string): Record<string, unknown>[] =>
	buildObjectVariants(schema.$defs[defNameByType.get(type)!], []) as Record<
		string,
		unknown
	>[];

// The very registry `createCanvasParser` builds for the shipped set.
const registry = createDocValidatorRegistry({ plugins: standardDocPlugins });

/** The names the registry reported as ones the type does not hold, located as it located them. */
const unknownKeyPathsOf = (
	type: string,
	doc: Record<string, unknown>,
): readonly (readonly (string | number)[])[] => {
	const keyDeclaration = registry.getKeyDeclaration(type);
	if (keyDeclaration === undefined) {
		throw new Error(`"${type}" is not in the shipped set`);
	}
	return validateDocKeys(
		doc,
		"root[0]",
		keyDeclaration,
		registry.validate(type, doc, "root[0]"),
	)
		.filter((diagnostic) => diagnostic.unknownKeyPath !== undefined)
		.map((diagnostic) => diagnostic.unknownKeyPath!);
};

describe("every shipped type's own property names", () => {
	it("covers the whole standard set, so no type is skipped unnoticed", () => {
		expect([...defNameByType.keys()].sort()).toEqual(
			[...standardObjectDocDefinitions.keys()].sort(),
		);
	});

	it.each([...defNameByType.keys()])(
		"is known to the parser for %s, nested ones included, so none of them is dropped on save",
		(type) => {
			expect(
				buildDocFixtures(type).flatMap((fixture) =>
					unknownKeyPathsOf(type, fixture),
				),
			).toEqual([]);
		},
	);

	it("builds fixtures that reach into the nested containers, so the check is not vacuous", () => {
		// Two the parser walks by shape: the anchor branches decide which names an
		// anchor may carry, and a run only exists inside a body written as an array.
		const anchorKinds = buildDocFixtures("connector").map(
			(fixture) =>
				(fixture.source as { anchor?: { kind?: unknown } } | null)?.anchor
					?.kind,
		);
		expect(new Set(anchorKinds)).toEqual(
			new Set(["center", "connectPoint", "edge", "free"]),
		);
		expect(
			buildDocFixtures("rect").some(
				(fixture) =>
					Array.isArray(fixture.text) &&
					typeof fixture.text[0] === "object" &&
					fixture.text[0] !== null,
			),
		).toBe(true);
	});

	it.each(["polygon", "polyline", "connector"])(
		"still reports a name %s does not hold, the poly family taking no frame validator",
		(type) => {
			// The doc is otherwise empty, so the type's own errors come with it.
			expect(unknownKeyPathsOf(type, { zzUnknown: 1 })).toEqual([
				["zzUnknown"],
			]);
		},
	);

	it.each([
		["a run", "rect", { text: [{ zzUnknown: 1 }] }, ["text", 0, "zzUnknown"]],
		[
			"a slot",
			"record",
			{ text: { name: { zzUnknown: 1 } } },
			["text", "name", "zzUnknown"],
		],
		[
			"an anchor",
			"connector",
			{ source: { anchor: { kind: "center", zzUnknown: 1 } } },
			["source", "anchor", "zzUnknown"],
		],
		[
			"a label",
			"connector",
			{ label: { zzUnknown: 1 } },
			["label", "zzUnknown"],
		],
		[
			"a vertex",
			"polyline",
			{ points: [{ zzUnknown: 1 }] },
			["points", 0, "zzUnknown"],
		],
	])(
		"reports a name %s of a %s does not hold, located inside it",
		(_container, type, doc, keyPath) => {
			expect(unknownKeyPathsOf(type, doc as Record<string, unknown>)).toEqual([
				keyPath,
			]);
		},
	);
});
