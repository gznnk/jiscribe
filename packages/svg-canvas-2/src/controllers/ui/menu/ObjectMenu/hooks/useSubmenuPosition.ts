import { type RefObject, useMemo } from "react";

/**
 * サブメニューの概算サイズ定義。
 * 画面はみ出し判定に使用する。
 */
type SubmenuSize = {
	width: number;
	height: number;
};

/**
 * 各サブメニューの概算サイズ（px）。
 * 実際のサイズと多少の誤差があっても問題ないように、余裕を持たせた値を設定。
 */
const SUBMENU_SIZES = {
	stackOrder: { width: 180, height: 40 },
	borderStyle: { width: 220, height: 162 },
	arrowHead: { width: 200, height: 120 },
	backgroundColor: { width: 240, height: 140 },
	strokeColor: { width: 240, height: 140 },
	fontColor: { width: 240, height: 140 },
	fontSize: { width: 160, height: 80 },
	alignment: { width: 120, height: 50 },
	lineStyle: { width: 220, height: 120 },
} as const satisfies Record<string, SubmenuSize>;

/** サブメニューの識別子 */
type SubmenuId = keyof typeof SUBMENU_SIZES;

/** メニューボタンとサブメニュー間の距離 (px) */
const SUBMENU_DISTANCE = 40;

/** 画面端からの最小マージン (px) */
const VIEWPORT_MARGIN = 8;

export type SubmenuPlacement = "down" | "up";

type SubmenuPositionResult = {
	placement: SubmenuPlacement;
};

/**
 * サブメニューが画面からはみ出る場合に、表示方向を上下反転するかを判定する。
 *
 * @param menuItemRef - メニューボタンの ref（位置計算に使用）
 * @param submenuId - サブメニューの識別子（サイズ取得に使用）
 * @param isOpen - サブメニューが開いているかどうか（再計算トリガー用）
 * @returns サブメニューの配置方向
 */
export function useSubmenuPosition(
	menuItemRef: RefObject<HTMLDivElement | null>,
	submenuId: SubmenuId,
	isOpen: boolean,
): SubmenuPositionResult {
	const submenuSize: SubmenuSize = SUBMENU_SIZES[submenuId];

	return useMemo(() => {
		// サブメニューが閉じている場合は計算不要
		if (!isOpen) {
			return { placement: "down" };
		}

		// メニューボタンの位置を取得
		if (!menuItemRef.current) {
			return { placement: "down" };
		}

		const buttonRect = menuItemRef.current.getBoundingClientRect();
		// ブラウザウィンドウの高さを取得（viewport.heightはキャンバスの座標系なので使えない）
		const windowHeight = window.innerHeight;

		// CSSの top: 40px は MenuItemPositioner の top からの距離
		// サブメニューを下に表示した場合の下端位置（ブラウザビューポート座標）
		const submenuBottomIfDown =
			buttonRect.top + SUBMENU_DISTANCE + submenuSize.height;

		// ブラウザウィンドウの下端との距離を計算（正の値＝余裕あり、負の値＝はみ出る）
		const spaceBelow = windowHeight - submenuBottomIfDown - VIEWPORT_MARGIN;

		// 下にはみ出る場合は上に表示
		if (spaceBelow < 0) {
			// 念のため上にも十分なスペースがあるか確認
			// CSSの bottom: 40px は MenuItemPositioner の bottom からの距離
			const submenuTopIfUp =
				buttonRect.bottom - SUBMENU_DISTANCE - submenuSize.height;
			const spaceAbove = submenuTopIfUp - VIEWPORT_MARGIN;

			// 上にスペースがある場合は上に表示
			if (spaceAbove >= 0) {
				return { placement: "up" };
			}
		}

		// デフォルトは下に表示
		return { placement: "down" };
	}, [isOpen, submenuSize, menuItemRef]);
}
