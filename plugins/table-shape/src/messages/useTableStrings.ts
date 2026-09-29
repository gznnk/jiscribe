import { usePluginStrings } from "@jiscribe/canvas-sdk";

import { TABLE_PLUGIN_ID, tableMessagesByLocale } from "./tableMessages";
import type { TableStrings } from "./tableMessages";

/**
 * The table's own strings for the canvas's locale, with the host's overrides
 * applied. Kept apart from the dictionary so the commands, which are plain state
 * transitions, can take their English labels from it without pulling React in.
 */
export const useTableStrings = (): TableStrings =>
	usePluginStrings(TABLE_PLUGIN_ID, tableMessagesByLocale);
