import {
	builtinObjectDocDefinitions,
	type ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { annotationDocPlugin } from "@jiscribe/plugin-annotation-shapes/doc";
import { containerDocPlugin } from "@jiscribe/plugin-container-shapes/doc";
import { flowchartDocPlugin } from "@jiscribe/plugin-flowchart-shapes/doc";
import { generalDocPlugin } from "@jiscribe/plugin-general-shapes/doc";
import { lucideIconDocPlugin } from "@jiscribe/plugin-lucide-icon-shape/doc";
import { markdownDocPlugin } from "@jiscribe/plugin-markdown-shape/doc";
import { stickyDocPlugin } from "@jiscribe/plugin-sticky-shape/doc";
import { umlDocPlugin } from "@jiscribe/plugin-uml-shapes/doc";

/**
 * Total order of the types shipped in the official schema and AI docs. The
 * schema unions (AnyObjectDoc / GroupChildDoc), the ai-guide / reference tables,
 * and the $defs ordering all follow it. Add one line here when shipping a new
 * shape (a missing or leftover entry fails generation).
 */
export const CANONICAL_TYPE_ORDER = [
	"rect",
	"markdown",
	"ellipse",
	"text",
	"diamond",
	"stadium",
	"parallelogram",
	"hexagon",
	"cloud",
	"document",
	"multiDocument",
	"actor",
	// The general-purpose pictograms of general-shapes (things, people and places, belonging to no notation)
	"browserWindow",
	"terminalWindow",
	"smartphone",
	"laptop",
	"server",
	"gear",
	"package",
	"folder",
	"file",
	"envelope",
	"queue",
	"lock",
	"shield",
	// A named pictogram from the bundled Lucide set, belonging to no notation either
	"lucideIcon",
	// The general-purpose annotations of annotation-shapes (shapes that explain a diagram, belonging to no notation)
	"callout",
	"note",
	"brace",
	"bracketWithStem",
	"bracket",
	"db",
	"storedData",
	"subroutine",
	"trapezoid",
	"manualInput",
	"card",
	"delay",
	"loopLimit",
	"display",
	"extract",
	"cross",
	"offPageConnector",
	"record",
	// The rest of uml-shapes: notation shapes that are one box each, unlike record
	"umlPackage",
	"umlComponent",
	"polyline",
	"polygon",
	"group",
	"container",
	"sticky",
	"svg",
	"connector",
] as const;

export type CanonicalType = (typeof CANONICAL_TYPE_ORDER)[number];

/**
 * Types whose $def is taken verbatim from templates/handwrittenDefs.json instead
 * of being generated from features: either their structure is not the standard
 * rect/ellipse-geometry-plus-styles shape, or nearly every property description
 * is type-specific prose.
 */
export const TEMPLATE_DEF_TYPES: ReadonlySet<string> = new Set([
	"markdown",
	"record",
	"polyline",
	"polygon",
	"group",
	"svg",
	"connector",
]);

/**
 * Types collapsed into one row of the "Box-shape catalog" table in reference.md
 * instead of getting an individual section. Types listed here must declare
 * `outlineDescription`.
 */
export const GROUPED_REFERENCE_TYPES = [
	"diamond",
	"stadium",
	"parallelogram",
	"hexagon",
	"cloud",
	"document",
	"multiDocument",
	"actor",
	"db",
	"storedData",
	"subroutine",
	"trapezoid",
	"manualInput",
	"card",
	"delay",
	"loopLimit",
	"display",
	"extract",
	"cross",
	"offPageConnector",
] as const;

/** Types that get an individual section under Object details in reference.md (emitted in this order). */
export const DETAIL_SECTION_TYPES = [
	"rect",
	"ellipse",
	"text",
	"lucideIcon",
	"callout",
	"note",
	"brace",
	"bracketWithStem",
	"bracket",
	"container",
] as const;

/** Built-ins plus the shipped plugins. */
const definitionSources: ReadonlyArray<
	[
		sourceName: string,
		definitions:
			Readonly<Partial<Record<string, ObjectDocDefinition>>> | undefined,
	]
> = [
	["canvas built-in", builtinObjectDocDefinitions],
	[flowchartDocPlugin.id, flowchartDocPlugin.objects],
	[umlDocPlugin.id, umlDocPlugin.objects],
	[markdownDocPlugin.id, markdownDocPlugin.objects],
	[stickyDocPlugin.id, stickyDocPlugin.objects],
	[generalDocPlugin.id, generalDocPlugin.objects],
	[lucideIconDocPlugin.id, lucideIconDocPlugin.objects],
	[annotationDocPlugin.id, annotationDocPlugin.objects],
	[containerDocPlugin.id, containerDocPlugin.objects],
];

/** Merge the sources, failing on type-name collisions instead of last-wins. */
function aggregateDefinitions(
	errors: string[],
): Record<string, ObjectDocDefinition> {
	const aggregated: Record<string, ObjectDocDefinition> = {};
	const sourceByType = new Map<string, string>();
	for (const [sourceName, definitions] of definitionSources) {
		for (const [type, definition] of Object.entries(definitions ?? {})) {
			if (!definition) {
				continue;
			}
			const existingSource = sourceByType.get(type);
			if (existingSource) {
				errors.push(
					`Type "${type}" is defined twice, in ${existingSource} and ${sourceName}`,
				);
				continue;
			}
			sourceByType.set(type, sourceName);
			aggregated[type] = definition;
		}
	}
	return aggregated;
}

/**
 * Validate and return the shipped-shape manifest. Missing declarations
 * (description / summary / outlineDescription / defaults) and mismatches between
 * the shipped list and the aggregated definitions are all detected here.
 */
export function loadManifest(): ReadonlyMap<
	CanonicalType,
	ObjectDocDefinition
> {
	const errors: string[] = [];
	const aggregated = aggregateDefinitions(errors);

	for (const type of Object.keys(aggregated)) {
		if (!(CANONICAL_TYPE_ORDER as readonly string[]).includes(type)) {
			errors.push(
				`Type "${type}" is defined but missing from CANONICAL_TYPE_ORDER (add it to include the type, or drop it from the aggregation)`,
			);
		}
	}

	const manifest = new Map<CanonicalType, ObjectDocDefinition>();
	for (const type of CANONICAL_TYPE_ORDER) {
		const definition = aggregated[type];
		if (!definition) {
			errors.push(
				`No definition found for type "${type}" listed in CANONICAL_TYPE_ORDER`,
			);
			continue;
		}
		if (!definition.summary) {
			errors.push(`Type "${type}" has no summary`);
		}
		if (!TEMPLATE_DEF_TYPES.has(type)) {
			if (!definition.description) {
				errors.push(
					`Type "${type}" has no description (required to generate its $def)`,
				);
			}
			if (!definition.defaults) {
				errors.push(
					`Type "${type}" has no defaults (required to generate its $def)`,
				);
			}
		}
		if (
			(GROUPED_REFERENCE_TYPES as readonly string[]).includes(type) &&
			!definition.outlineDescription
		) {
			errors.push(
				`Type "${type}" has no outlineDescription (required for its row in the aggregate table)`,
			);
		}
		manifest.set(type, definition);
	}

	if (errors.length > 0) {
		throw new Error(
			`Shape manifest validation failed:\n- ${errors.join("\n- ")}`,
		);
	}
	return manifest;
}

/** Type name → $def name (e.g. "offPageConnector" → "OffPageConnectorDoc"). */
export function docDefName(type: string): string {
	return `${type.charAt(0).toUpperCase() + type.slice(1)}Doc`;
}
