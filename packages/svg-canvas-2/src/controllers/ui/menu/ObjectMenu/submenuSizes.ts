/**
 * サブメニューの概算サイズ定義。
 * 画面はみ出し判定に使用する。
 */

export type SubmenuSize = {
	width: number;
	height: number;
};

/**
 * 各サブメニューの概算サイズ（px）。
 * 実際のサイズと多少の誤差があっても問題ないように、余裕を持たせた値を設定。
 */
export const SUBMENU_SIZES = {
	stackOrder: { width: 180, height: 50 },
	borderStyle: { width: 220, height: 160 },
	arrowHead: { width: 200, height: 120 },
	backgroundColor: { width: 240, height: 180 },
	strokeColor: { width: 240, height: 180 },
	fontColor: { width: 240, height: 180 },
	fontSize: { width: 160, height: 80 },
	alignment: { width: 120, height: 50 },
	group: { width: 120, height: 50 },
	keepAspectRatio: { width: 120, height: 50 },
	bold: { width: 80, height: 50 },
} as const satisfies Record<string, SubmenuSize>;

export type SubmenuId = keyof typeof SUBMENU_SIZES;
