import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** UI strings owned by the container plugin, resolved via the canvas locale. */
type ContainerMessages = {
	/** Names the header color itself: the ObjectMenu button and the sidebar field. */
	menuHeaderColor: string;
	/**
	 * Label column of both sidebar rows (header color in the Fill section, header
	 * height in the Layout section): the section names the aspect, the label the
	 * part, the way the core's "Color" rows read. The column is too narrow for
	 * the full wording, which the field's own label carries.
	 */
	propertyRowHeader: string;
	/** aria-label of the header height field. */
	fieldHeaderHeight: string;
};

export const containerMessagesByLocale: LocaleMessages<ContainerMessages> = {
	en: {
		menuHeaderColor: "Header Color",
		propertyRowHeader: "Header",
		fieldHeaderHeight: "Header height",
	},
	ja: {
		menuHeaderColor: "ヘッダー色",
		propertyRowHeader: "ヘッダー",
		fieldHeaderHeight: "ヘッダーの高さ",
	},
};
