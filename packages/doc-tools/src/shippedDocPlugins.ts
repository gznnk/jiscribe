import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { builtinObjectDocDefinitions } from "@jiscribe/canvas/doc";
import { annotationDocPlugin } from "@jiscribe/plugin-annotation-shapes/doc";
import { containerDocPlugin } from "@jiscribe/plugin-container-shapes/doc";
import { flowchartDocPlugin } from "@jiscribe/plugin-flowchart-shapes/doc";
import { generalDocPlugin } from "@jiscribe/plugin-general-shapes/doc";
import { lucideIconDocPlugin } from "@jiscribe/plugin-lucide-icon-shape/doc";
import { markdownDocPlugin } from "@jiscribe/plugin-markdown-shape/doc";
import { stickyDocPlugin } from "@jiscribe/plugin-sticky-shape/doc";
import { umlDocPlugin } from "@jiscribe/plugin-uml-shapes/doc";

/**
 * The doc plugins of the shipped shape set, in the order the parser is given
 * them. The same eight the official JSON schema is generated from
 * (packages/ai-docs/generator/src/manifest.ts), so a document this package
 * accepts is one the schema accepts and the reverse — a plugin listed in only
 * one of the two would make the two validators of {@link validateDoc} disagree.
 */
export const SHIPPED_DOC_PLUGINS: readonly CanvasDocPlugin[] = [
	flowchartDocPlugin,
	containerDocPlugin,
	markdownDocPlugin,
	stickyDocPlugin,
	umlDocPlugin,
	generalDocPlugin,
	annotationDocPlugin,
	lucideIconDocPlugin,
];

/**
 * Every object type of the shipped set by name, the built-in types included:
 * what tells this package a type's geometry and whether it holds text at all
 * (`features`), without a rendering layer to ask.
 */
export const shippedObjectDocDefinitions: ReadonlyMap<
	string,
	ObjectDocDefinition
> = new Map<string, ObjectDocDefinition>(
	[
		...Object.entries(builtinObjectDocDefinitions),
		...SHIPPED_DOC_PLUGINS.flatMap((plugin) =>
			Object.entries(plugin.objects ?? {}),
		),
	].filter(
		(entry): entry is [string, ObjectDocDefinition] => entry[1] !== undefined,
	),
);
