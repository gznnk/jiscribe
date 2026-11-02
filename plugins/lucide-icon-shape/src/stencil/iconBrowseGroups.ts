import type { StencilCategoryBrowseGroup } from "@jiscribe/canvas";

import { toIconStencilId } from "./toIconStencilId";
import type { IconCategoryId } from "../schema/icon/iconCategories.generated";
import {
	ICON_CATEGORY_TITLES,
	ICON_NAMES_BY_CATEGORY,
} from "../schema/icon/iconCategories.generated";

/** One section of the icon category's "show all" view, as declared. */
type IconBrowseGroupDeclaration = {
	/** Lucide's own category id; also the section's id. */
	id: IconCategoryId;
	/** Japanese label; the English one is lucide's own title (`ICON_CATEGORY_TITLES`). */
	ja: string;
};

/**
 * The sections of the "show all" view, one per lucide category, in the order a
 * diagram reaches for them rather than alphabetically. A test holds this to
 * exactly the categories the generated data has, so a lucide release adding one
 * fails it.
 */
export const ICON_BROWSE_GROUP_DECLARATIONS: readonly IconBrowseGroupDeclaration[] =
	[
		{ id: "account", ja: "アカウント・アクセス" },
		{ id: "devices", ja: "デバイス" },
		{ id: "development", ja: "開発" },
		{ id: "connectivity", ja: "接続" },
		{ id: "security", ja: "セキュリティ" },
		{ id: "files", ja: "ファイル" },
		{ id: "communication", ja: "コミュニケーション" },
		{ id: "mail", ja: "メール" },
		{ id: "notifications", ja: "通知" },
		{ id: "charts", ja: "グラフ" },
		{ id: "layout", ja: "レイアウト" },
		{ id: "arrows", ja: "矢印" },
		{ id: "navigation", ja: "ナビゲーション・場所" },
		{ id: "cursors", ja: "カーソル" },
		{ id: "shapes", ja: "図形" },
		{ id: "text", ja: "テキスト書式" },
		{ id: "design", ja: "デザイン" },
		{ id: "tools", ja: "ツール" },
		{ id: "time", ja: "時間・カレンダー" },
		{ id: "finance", ja: "金融" },
		{ id: "shopping", ja: "ショッピング" },
		{ id: "buildings", ja: "建物" },
		{ id: "home", ja: "家" },
		{ id: "transportation", ja: "交通" },
		{ id: "travel", ja: "旅行" },
		{ id: "multimedia", ja: "マルチメディア" },
		{ id: "photography", ja: "写真" },
		{ id: "social", ja: "ソーシャル" },
		{ id: "people", ja: "人物" },
		{ id: "accessibility", ja: "アクセシビリティ" },
		{ id: "math", ja: "数学" },
		{ id: "science", ja: "科学" },
		{ id: "medical", ja: "医療" },
		{ id: "weather", ja: "天気" },
		{ id: "nature", ja: "自然" },
		{ id: "sustainability", ja: "サステナビリティ" },
		{ id: "seasons", ja: "季節" },
		{ id: "animals", ja: "動物" },
		{ id: "food-beverage", ja: "飲食" },
		{ id: "gaming", ja: "ゲーム" },
		{ id: "sports", ja: "スポーツ" },
		{ id: "emoji", ja: "絵文字" },
	];

const ICON_BROWSE_GROUPS: readonly StencilCategoryBrowseGroup[] =
	ICON_BROWSE_GROUP_DECLARATIONS.map(({ id, ja }) => ({
		id,
		label: { en: ICON_CATEGORY_TITLES[id], ja },
		presetIds: ICON_NAMES_BY_CATEGORY[id].map(toIconStencilId),
	}));

/**
 * The "show all" view's sections in declaration order. An icon in several
 * categories appears in every one of them; each section lists its icons by name
 * as generated. Built once at load, so every call returns the same groups.
 */
export const listIconBrowseGroups = (): StencilCategoryBrowseGroup[] => [
	...ICON_BROWSE_GROUPS,
];
