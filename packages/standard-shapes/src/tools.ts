// The AI tools the standard set's plugins offer for their own shapes, with no
// rendering layer behind them: what a host hands its canvas tool set beside
// standardDocPlugins.
//
// e.g. `import { standardAiToolPlugins } from "@jiscribe/standard-shapes/tools";`
import type { AiToolPlugin } from "@jiscribe/ai-tools-sdk";
import { tableAiToolPlugin } from "@jiscribe/plugin-table-shape/tools";
import { umlAiToolPlugin } from "@jiscribe/plugin-uml-shapes/tools";

/**
 * The tool bundles of the standard set's plugins, one per plugin that offers any,
 * each imported from that plugin's `./tools` entry. A tool here acts only on a type
 * standardDocPlugins registers, so hand the two to a host together.
 */
export const standardAiToolPlugins: readonly AiToolPlugin[] = [
	tableAiToolPlugin,
	umlAiToolPlugin,
];
