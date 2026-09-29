import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** UI strings owned by the table plugin, resolved via the canvas locale. */
type TableMessages = {
	/** Names the cell background itself: the title of the ObjectMenu button and of its swatch. */
	menuCellColor: string;
	/**
	 * Button that takes the background off the cells again. Worded as the absence
	 * rather than as a color, the point being that the cells go back to showing
	 * whatever the table is drawn over.
	 */
	cellColorNone: string;
};

export const tableMessagesByLocale: LocaleMessages<TableMessages> = {
	en: {
		menuCellColor: "Cell Color",
		cellColorNone: "No fill",
	},
	ja: {
		menuCellColor: "セルの色",
		cellColorNone: "塗りなし",
	},
};
