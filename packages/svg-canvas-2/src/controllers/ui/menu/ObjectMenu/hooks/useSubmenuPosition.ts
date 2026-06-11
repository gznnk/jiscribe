import { type RefObject, useLayoutEffect, useRef, useState } from "react";

import { useCanvasViewportRef } from "../../../../contexts/CanvasViewportRefContext";

/**
 * メニューボタンとサブメニュー間の距離 (px)。
 * DropdownPanel の CSS（top: 40px / bottom: 40px）と対応する。
 */
const SUBMENU_DISTANCE = 40;

/** キャンバス領域の端からの最小マージン (px) */
const VIEWPORT_MARGIN = 8;

export type SubmenuPlacement = "down" | "up";

type SubmenuPositionResult = {
	/** サブメニュー要素（DropdownPanel）に渡す ref。実寸の計測に使用する */
	submenuRef: RefObject<HTMLDivElement | null>;
	/** サブメニューの上下の展開方向 */
	placement: SubmenuPlacement;
	/** ボタン中央揃え位置からの水平方向の補正量 (px) */
	offsetX: number;
};

/**
 * サブメニューがキャンバス領域からはみ出さないよう表示位置を補正する。
 *
 * - 縦方向: 下に展開すると領域下端からはみ出し、かつ上に十分なスペースがある場合は上へ反転する
 * - 横方向: ボタン中央揃えだと左右にはみ出す場合、はみ出す分だけ水平方向にずらす
 *
 * サブメニューは position: absolute のためキャンバスルート要素の overflow: hidden で
 * クリップされる。そのため境界にはキャンバスルート要素
 * （CanvasViewportRefContext 経由で取得）の getBoundingClientRect()
 * （ブラウザビューポート座標）を使う。
 *
 * サブメニューの実寸はレンダリング後の実 DOM を useLayoutEffect で計測する
 * （ペイント前に反映されるためちらつきは生じない）。
 *
 * @param menuItemRef - メニューボタンの ref（位置計算に使用）
 * @param isOpen - サブメニューが開いているかどうか（再計算トリガー用）
 * @returns サブメニュー用の ref と補正後の配置
 */
export function useSubmenuPosition(
	menuItemRef: RefObject<HTMLDivElement | null>,
	isOpen: boolean,
): SubmenuPositionResult {
	const viewportRef = useCanvasViewportRef();
	const submenuRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		placement: SubmenuPlacement;
		offsetX: number;
	}>({ placement: "down", offsetX: 0 });

	useLayoutEffect(() => {
		// 閉じている間はデフォルトに戻し、次回オープン時の計測を初期状態から始める
		if (!isOpen) {
			setPosition({ placement: "down", offsetX: 0 });
			return;
		}

		const menuItemElement = menuItemRef.current;
		const submenuElement = submenuRef.current;
		if (!menuItemElement || !submenuElement) {
			return;
		}

		const buttonRect = menuItemElement.getBoundingClientRect();
		const { width: submenuWidth, height: submenuHeight } =
			submenuElement.getBoundingClientRect();

		// キャンバス領域の矩形（ブラウザビューポート座標）。
		// Provider 外や ref 未設定の場合はブラウザウィンドウ全体にフォールバックする
		const viewportElement = viewportRef?.current ?? null;
		const areaRect = viewportElement
			? viewportElement.getBoundingClientRect()
			: {
					left: 0,
					top: 0,
					right: window.innerWidth,
					bottom: window.innerHeight,
				};

		// 縦方向: 下に表示した場合の下端が領域からはみ出るか判定
		let placement: SubmenuPlacement = "down";
		const submenuBottomIfDown =
			buttonRect.top + SUBMENU_DISTANCE + submenuHeight;
		if (submenuBottomIfDown > areaRect.bottom - VIEWPORT_MARGIN) {
			const submenuTopIfUp =
				buttonRect.bottom - SUBMENU_DISTANCE - submenuHeight;
			// 上に十分なスペースがある場合のみ反転する
			if (submenuTopIfUp >= areaRect.top + VIEWPORT_MARGIN) {
				placement = "up";
			}
		}

		// 横方向: ボタン中央揃えで配置した場合の左右端を求め、はみ出す分だけずらす。
		// 右端調整より左端調整を後に適用し、両側に収まらない場合は左端を優先する
		const buttonCenterX = (buttonRect.left + buttonRect.right) / 2;
		const submenuLeftIfCentered = buttonCenterX - submenuWidth / 2;
		const submenuRightIfCentered = buttonCenterX + submenuWidth / 2;

		let offsetX = 0;
		if (submenuRightIfCentered > areaRect.right - VIEWPORT_MARGIN) {
			offsetX = areaRect.right - VIEWPORT_MARGIN - submenuRightIfCentered;
		}
		if (submenuLeftIfCentered + offsetX < areaRect.left + VIEWPORT_MARGIN) {
			offsetX = areaRect.left + VIEWPORT_MARGIN - submenuLeftIfCentered;
		}

		setPosition({ placement, offsetX });
	}, [isOpen, menuItemRef, viewportRef]);

	return { submenuRef, ...position };
}
