import { AUTO_SCROLL_STEP_SIZE } from "../GestureRecognizerConstants";
import type { ScrollDelta } from "../GestureRecognizerTypes";

/**
 * エッジ近接方向に基づいてスクロールデルタ値を計算
 * この純粋関数は、カーソルがどのエッジに近いかに基づいて、
 * 各方向にどれだけスクロールするかを決定します。
 *
 * @param horizontal - 水平方向のエッジ近接 ("left" | "right" | null)
 * @param vertical - 垂直方向のエッジ近接 ("top" | "bottom" | null)
 * @returns deltaXとdeltaYを含むスクロール値オブジェクト
 */
export const calculateScrollDelta = (
	horizontal: "left" | "right" | null,
	vertical: "top" | "bottom" | null,
	zoom: number,
): ScrollDelta => {
	let deltaX = 0;
	let deltaY = 0;

	if (horizontal === "left") {
		deltaX = -AUTO_SCROLL_STEP_SIZE;
	} else if (horizontal === "right") {
		deltaX = AUTO_SCROLL_STEP_SIZE;
	}

	if (vertical === "top") {
		deltaY = -AUTO_SCROLL_STEP_SIZE;
	} else if (vertical === "bottom") {
		deltaY = AUTO_SCROLL_STEP_SIZE;
	}

	return { deltaX: deltaX / zoom, deltaY: deltaY / zoom };
};
