import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** UI strings the table draws itself, read through `useTableStrings`. */
export type TableStrings = {
	/**
	 * Names the cell background itself, on both surfaces: the title of the
	 * ObjectMenu button and of its swatch, and the label column of the sidebar row
	 * under the Fill heading.
	 */
	menuCellColor: string;
	/**
	 * Button that takes the background off the cells again, under the palette on
	 * both surfaces, and the word the sidebar row states while the cells carry no
	 * background. Worded as the absence rather than as a color, the point being
	 * that the cells go back to showing whatever the table is drawn over.
	 */
	cellColorNone: string;
};

export const tableMessagesByLocale: LocaleMessages<TableStrings> = {
	en: {
		menuCellColor: "Cell Color",
		cellColorNone: "No fill",
	},
	ja: {
		menuCellColor: "セルの色",
		cellColorNone: "塗りなし",
	},
};
