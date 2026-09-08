import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** UI strings owned by the container plugin, resolved via the canvas locale. */
type ContainerMessages = {
	/** Names the header color itself: the ObjectMenu button and the sidebar field. */
	menuHeaderColor: string;
	/** Label column of the sidebar row, which is too narrow for the full wording. */
	propertyRowHeader: string;
};

export const containerMessagesByLocale: LocaleMessages<ContainerMessages> = {
	en: { menuHeaderColor: "Header Color", propertyRowHeader: "Header" },
	ja: { menuHeaderColor: "ヘッダー色", propertyRowHeader: "ヘッダー" },
};
