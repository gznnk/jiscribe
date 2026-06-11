import { type RefObject, useLayoutEffect, useState } from "react";

/** キャンバス領域の端からの最小マージン (px) */
const VIEWPORT_MARGIN = 8;

type ContextMenuPosition = {
	clientX: number;
	clientY: number;
};

type AdjustedMenuPosition = {
	left: number;
	top: number;
};

/**
 * 1 軸分のメニュー表示座標を算出する。
 *
 * クリック座標から正方向（右・下）に展開すると表示領域からはみ出る場合は
 * 負方向（左・上）へ反転し、それでも収まらない場合は表示領域内にクランプする。
 *
 * @param clickCoord - クリック座標（clientX または clientY）
 * @param menuSize - メニューの実寸（幅または高さ）
 * @param areaStartCoord - 表示領域の始端座標（left または top）
 * @param areaEndCoord - 表示領域の終端座標（right または bottom）
 * @returns 補正後の座標（left または top）
 */
function calcAdjustedAxisCoord(
	clickCoord: number,
	menuSize: number,
	areaStartCoord: number,
	areaEndCoord: number,
): number {
	let adjustedCoord = clickCoord;

	// 正方向にはみ出る場合は負方向へ反転
	if (clickCoord + menuSize > areaEndCoord - VIEWPORT_MARGIN) {
		adjustedCoord = clickCoord - menuSize;
	}

	// 反転してもはみ出る場合は表示領域内にクランプ
	const maxCoord = areaEndCoord - VIEWPORT_MARGIN - menuSize;
	if (adjustedCoord > maxCoord) {
		adjustedCoord = maxCoord;
	}
	if (adjustedCoord < areaStartCoord + VIEWPORT_MARGIN) {
		adjustedCoord = areaStartCoord + VIEWPORT_MARGIN;
	}

	return adjustedCoord;
}

/**
 * コンテキストメニューがキャンバス領域からはみ出さないよう表示座標を補正する。
 *
 * メニューは position: fixed（ブラウザビューポート座標）で配置されるため、
 * 境界にはキャンバスルート要素の getBoundingClientRect()（同じ座標系）を使う。
 * state.viewport はキャンバス内部のスクロール・zoom 状態なのでここでは使えない。
 *
 * メニューの高さは項目数に依存するため、レンダリング後の実 DOM を
 * useLayoutEffect で実測してから補正する（ペイント前に反映されるためちらつきは生じない）。
 *
 * @param position - 右クリック時のクリック座標
 * @param menuRef - メニュー要素の ref（実寸の計測に使用）
 * @param viewportRef - キャンバスルート要素（Viewport）の ref（表示領域の境界に使用）
 * @returns 補正後の表示座標
 */
export function useContextMenuPosition(
	position: ContextMenuPosition,
	menuRef: RefObject<HTMLDivElement | null>,
	viewportRef: RefObject<HTMLDivElement | null>,
): AdjustedMenuPosition {
	const [adjustedPosition, setAdjustedPosition] =
		useState<AdjustedMenuPosition>({
			left: position.clientX,
			top: position.clientY,
		});

	useLayoutEffect(() => {
		const menuElement = menuRef.current;
		if (!menuElement) {
			setAdjustedPosition({ left: position.clientX, top: position.clientY });
			return;
		}

		const { width: menuWidth, height: menuHeight } =
			menuElement.getBoundingClientRect();

		// キャンバス領域の矩形（ブラウザビューポート座標）。
		// ref が未設定の場合はブラウザウィンドウ全体にフォールバックする
		const viewportElement = viewportRef.current;
		const areaRect = viewportElement
			? viewportElement.getBoundingClientRect()
			: {
					left: 0,
					top: 0,
					right: window.innerWidth,
					bottom: window.innerHeight,
				};

		setAdjustedPosition({
			left: calcAdjustedAxisCoord(
				position.clientX,
				menuWidth,
				areaRect.left,
				areaRect.right,
			),
			top: calcAdjustedAxisCoord(
				position.clientY,
				menuHeight,
				areaRect.top,
				areaRect.bottom,
			),
		});
	}, [position, menuRef, viewportRef]);

	return adjustedPosition;
}
