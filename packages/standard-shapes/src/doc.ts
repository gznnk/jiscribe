// The headless half of the standard set: what a parser, a doc-ops or a schema
// generator needs, with no rendering layer and no react behind it.
//
// e.g. `import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";`
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
 * The doc plugins of the standard shape set, in the order a parser is given them.
 * The official JSON schema is generated from this same list, so a document one of
 * the two accepts is one the other accepts: a plugin registered in only one place
 * is how a host ends up with a document its own validators disagree about.
 */
export const standardDocPlugins: readonly CanvasDocPlugin[] = [
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
 * Every object type of the standard set by name, the canvas built-ins included:
 * a type's geometry and whether it holds text at all (`features`), answerable
 * without a rendering layer to ask.
 */
export const standardObjectDocDefinitions: ReadonlyMap<
	string,
	ObjectDocDefinition
> = new Map<string, ObjectDocDefinition>(
	[
		...Object.entries(builtinObjectDocDefinitions),
		...standardDocPlugins.flatMap((plugin) =>
			Object.entries(plugin.objects ?? {}),
		),
	].filter(
		(entry): entry is [string, ObjectDocDefinition] => entry[1] !== undefined,
	),
);
