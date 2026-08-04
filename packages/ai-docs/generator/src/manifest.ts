import {
	builtinObjectDocDefinitions,
	type ObjectDocDefinition,
} from "@workspace/canvas/doc";
import { annotationDocPlugin } from "@workspace/plugin-annotation-shapes/doc";
import { containerDocPlugin } from "@workspace/plugin-container-shapes/doc";
import { flowchartDocPlugin } from "@workspace/plugin-flowchart-shapes/doc";
import { generalDocPlugin } from "@workspace/plugin-general-shapes/doc";
import { markdownDocPlugin } from "@workspace/plugin-markdown-shape/doc";
import { stickyDocPlugin } from "@workspace/plugin-sticky-shape/doc";
import { umlDocPlugin } from "@workspace/plugin-uml-shapes/doc";

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
	"diamond",
	"stadium",
	"parallelogram",
	"hexagon",
	"cloud",
	"document",
	"multiDocument",
	"actor",
	// general-shapes の汎用ピクトグラム（記法に属さない実物・人・場）
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
	// annotation-shapes の汎用注釈（記法に属さない、図に説明を足す図形）
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
 * Types collapsed into one row of the "Flowchart box shapes" catalog table in
 * reference.md instead of getting an individual section. Types listed here must
 * declare `outlineDescription`.
 */
export const GROUPED_REFERENCE_TYPES = [
	"multiDocument",
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
	"diamond",
	"stadium",
	"parallelogram",
	"hexagon",
	"cloud",
	"document",
	"actor",
	"callout",
	"note",
	"brace",
	"bracketWithStem",
	"bracket",
	"db",
	"container",
] as const;

/** Built-ins plus the shipped plugins. */
const definitionSources: ReadonlyArray<
	[
		sourceName: string,
		definitions:
			| Readonly<Partial<Record<string, ObjectDocDefinition>>>
			| undefined,
	]
> = [
	["canvas built-in", builtinObjectDocDefinitions],
	[flowchartDocPlugin.id, flowchartDocPlugin.objects],
	[umlDocPlugin.id, umlDocPlugin.objects],
	[markdownDocPlugin.id, markdownDocPlugin.objects],
	[stickyDocPlugin.id, stickyDocPlugin.objects],
	[generalDocPlugin.id, generalDocPlugin.objects],
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
					`型 "${type}" が ${existingSource} と ${sourceName} で重複定義されています`,
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
				`型 "${type}" が定義されていますが CANONICAL_TYPE_ORDER に載っていません（収載するなら追記、しないなら集約から外す）`,
			);
		}
	}

	const manifest = new Map<CanonicalType, ObjectDocDefinition>();
	for (const type of CANONICAL_TYPE_ORDER) {
		const definition = aggregated[type];
		if (!definition) {
			errors.push(`CANONICAL_TYPE_ORDER の型 "${type}" の定義が見つかりません`);
			continue;
		}
		if (!definition.summary) {
			errors.push(`型 "${type}" に summary がありません`);
		}
		if (!TEMPLATE_DEF_TYPES.has(type)) {
			if (!definition.description) {
				errors.push(
					`型 "${type}" に description がありません（$def 生成に必須）`,
				);
			}
			if (!definition.defaults) {
				errors.push(`型 "${type}" に defaults がありません（$def 生成に必須）`);
			}
		}
		if (
			(GROUPED_REFERENCE_TYPES as readonly string[]).includes(type) &&
			!definition.outlineDescription
		) {
			errors.push(
				`型 "${type}" に outlineDescription がありません（集約表の行に必須）`,
			);
		}
		manifest.set(type, definition);
	}

	if (errors.length > 0) {
		throw new Error(`図形マニフェストの検証エラー:\n- ${errors.join("\n- ")}`);
	}
	return manifest;
}

/** Type name → $def name (e.g. "offPageConnector" → "OffPageConnectorDoc"). */
export function docDefName(type: string): string {
	return `${type.charAt(0).toUpperCase() + type.slice(1)}Doc`;
}
