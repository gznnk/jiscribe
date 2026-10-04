import { resolveLocaleMessages, useCanvasLocale } from "@jiscribe/canvas-sdk";

import { tableMessagesByLocale } from "./tableMessages";
import type { TableStrings } from "./tableMessages";

/**
 * The table's own strings for the canvas's locale. Both surfaces that draw them
 * (the ObjectMenu section and the sidebar row) read them through here, so the two
 * cannot resolve the dictionary differently.
 */
export const useTableStrings = (): TableStrings => {
	const locale = useCanvasLocale();
	return resolveLocaleMessages(tableMessagesByLocale, locale);
};
