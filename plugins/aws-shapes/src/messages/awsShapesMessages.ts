import type { LocaleMessages } from "@jiscribe/canvas-sdk";

/** The UI strings aws-shapes carries, resolved against the canvas's locale. */
type AwsShapesMessages = {
	menuIcon: string;
	searchPlaceholder: string;
	noMatches: string;
	moreMatches: (shown: number, total: number) => string;
	tierAll: string;
	tierService: string;
	tierResource: string;
	tierGeneral: string;
	tierGroup: string;
	categoryAll: string;
};

export const awsShapesMessagesByLocale: LocaleMessages<AwsShapesMessages> = {
	en: {
		menuIcon: "AWS Icon",
		searchPlaceholder: "Search AWS icons",
		noMatches: "No AWS icon by that name",
		moreMatches: (shown, total) => `${shown} of ${total} matches`,
		tierAll: "All",
		tierService: "Service",
		tierResource: "Resource",
		tierGeneral: "General",
		tierGroup: "Group",
		categoryAll: "All categories",
	},
	ja: {
		menuIcon: "AWS アイコン",
		searchPlaceholder: "AWS アイコンを検索",
		noMatches: "その名前の AWS アイコンはありません",
		moreMatches: (shown, total) => `${total} 件中 ${shown} 件`,
		tierAll: "すべて",
		tierService: "サービス",
		tierResource: "リソース",
		tierGeneral: "一般",
		tierGroup: "グループ",
		categoryAll: "すべてのカテゴリ",
	},
};
