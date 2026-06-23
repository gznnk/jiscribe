import { type RefObject, useEffect } from "react";

import { shouldUseNativeWheel } from "../gestures/recognizer/utils/shouldUseNativeWheel";

/**
 * キャンバスのコンテナ要素上の wheel イベントを監視し、コールバックを実行する Hook。
 *
 * リスナーは `document` ではなくコンテナ要素にスコープする。これにより、
 * - キャンバス外（ホストページのサイドパネル・ツールバー・本文など）で起きた
 *   wheel はネイティブスクロールのまま奪わない
 * - 複数の Canvas を同一ページに置いても、各 Canvas は自分の領域内の wheel
 *   だけを処理する（「アクティブな Canvas」を別途管理する必要がない）
 *
 * data-gesture="native-wheel" を持つスクロール可能要素（編集中の textarea など）
 * 上ではネイティブスクロールに任せ、preventDefault しない。
 * Ctrl 押下時はズーム操作のため常にキャンバス側で処理する。
 *
 * @param containerRef - キャンバスのコンテナ要素への参照
 * @param onWheel - wheel イベント発生時に呼ばれるコールバック関数
 */
export function useCanvasWheel(
	containerRef: RefObject<HTMLElement | null>,
	onWheel: (e: WheelEvent) => void,
): void {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const onContainerWheel = (e: WheelEvent) => {
			// スクロール可能な data-gesture="native-wheel" 要素（編集中の textarea など）上では
			// ネイティブスクロールに任せ、キャンバスのスクロールは行わない
			if (shouldUseNativeWheel(e.target, e.ctrlKey)) {
				return;
			}
			e.preventDefault();
			onWheel(e);
		};

		// capture: true でコンテナ内のどの要素で起きた wheel も子孫より先に捕捉する。
		// passive: false は preventDefault を呼ぶために必須。
		container.addEventListener("wheel", onContainerWheel, {
			passive: false,
			capture: true,
		});

		return () => {
			container.removeEventListener("wheel", onContainerWheel, {
				capture: true,
			});
		};
	}, [containerRef, onWheel]);
}
