import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** UI strings owned by the lucide-icon plugin, resolved via the canvas locale. */
type LucideIconMessages = {
	menuIcon: string;
	searchPlaceholder: string;
	noMatches: string;
	moreMatches: (shown: number, total: number) => string;
};

export const lucideIconMessagesByLocale: LocaleMessages<LucideIconMessages> = {
	en: {
		menuIcon: "Icon",
		searchPlaceholder: "Search icons",
		noMatches: "No icon by that name",
		moreMatches: (shown, total) => `${shown} of ${total} matches`,
	},
	ja: {
		menuIcon: "アイコン",
		searchPlaceholder: "アイコンを検索",
		noMatches: "その名前のアイコンはありません",
		moreMatches: (shown, total) => `${total} 件中 ${shown} 件`,
	},
};
