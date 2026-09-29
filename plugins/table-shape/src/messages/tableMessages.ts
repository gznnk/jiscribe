import type { LocaleMessages, PluginMessages } from "@jiscribe/canvas-sdk";

/**
 * The id the plugin registers under, and with it the namespace its strings live
 * in: a host overrides one of them as `pluginStrings["table-shape.<key>"]`.
 * Named here rather than in `plugin.ts` so the components reading the strings can
 * take it without importing the plugin declaration, which pulls in the whole
 * shape.
 */
export const TABLE_PLUGIN_ID = "table-shape";

/** Every command the table contributes, so a label cannot be written for a fifth one. */
export type TableCommandId =
	| "table.insertRowAbove"
	| "table.insertRowBelow"
	| "table.insertColumnLeft"
	| "table.insertColumnRight"
	| "table.deleteRow"
	| "table.deleteColumn";

/** UI strings the table draws itself, read through `useTableStrings`. */
export type TableStrings = {
	/** Names the cell background itself: the title of the ObjectMenu button and of its swatch. */
	menuCellColor: string;
	/**
	 * Button that takes the background off the cells again. Worded as the absence
	 * rather than as a color, the point being that the cells go back to showing
	 * whatever the table is drawn over.
	 */
	cellColorNone: string;
};

/**
 * Menu wording of the six grid commands. They name the track and the side it
 * appears on rather than the act on the selection ("Insert Row Above", not "Insert
 * Above"), because the right-click menu is the one place they are read without a
 * grip or a cell in view to say which axis is meant.
 */
const TABLE_COMMAND_LABELS: LocaleMessages<Record<TableCommandId, string>> = {
	en: {
		"table.insertRowAbove": "Insert Row Above",
		"table.insertRowBelow": "Insert Row Below",
		"table.insertColumnLeft": "Insert Column Left",
		"table.insertColumnRight": "Insert Column Right",
		"table.deleteRow": "Delete Row",
		"table.deleteColumn": "Delete Column",
	},
	ja: {
		"table.insertRowAbove": "上に行を挿入",
		"table.insertRowBelow": "下に行を挿入",
		"table.insertColumnLeft": "左に列を挿入",
		"table.insertColumnRight": "右に列を挿入",
		"table.deleteRow": "行を削除",
		"table.deleteColumn": "列を削除",
	},
};

const TABLE_STRINGS: LocaleMessages<TableStrings> = {
	en: {
		menuCellColor: "Cell Color",
		cellColorNone: "No fill",
	},
	ja: {
		menuCellColor: "セルの色",
		cellColorNone: "塗りなし",
	},
};

/**
 * Everything the table has to say, wired in through `CanvasPlugin.messages`. The
 * canvas resolves it for its own locale and lets the host overrule any of it.
 */
export const tableMessagesByLocale: LocaleMessages<
	PluginMessages<TableStrings>
> = {
	en: {
		commandLabels: TABLE_COMMAND_LABELS.en,
		strings: TABLE_STRINGS.en,
	},
	ja: {
		commandLabels: TABLE_COMMAND_LABELS.ja,
		strings: TABLE_STRINGS.ja,
	},
};

/**
 * English label of one grid command — what a `Command` carries as its own
 * `label`, and so what `getCommandLabel` lands on for a locale neither the canvas
 * nor this plugin has a dictionary for.
 *
 * @param commandId - Id of one of the six; the union is what keeps the two
 * spellings of it, here and in the command spec, from drifting apart.
 */
export const tableCommandLabel = (commandId: TableCommandId): string =>
	TABLE_COMMAND_LABELS.en[commandId];
