import type { Dimensions } from "@workspace/geometry";
import { type Dispatch, type RefObject, useEffect, useRef } from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * コンテナ要素のサイズ変更を監視し、変更時に CONTAINER_RESIZE アクションを dispatch するHook
 *
 * @param containerRef - 監視対象のコンテナ要素への参照
 * @param dispatch - Canvas reducer の dispatch
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [state, dispatch] = useCanvasReducer(canvasDoc);
 *
 * useContainerResize(containerRef, dispatch);
 * ```
 */
export function useContainerResize(
	containerRef: RefObject<HTMLDivElement | null>,
	dispatch: Dispatch<CanvasAction>,
): void {
	const lastDimensions = useRef<Dimensions | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const updateDimensions = (width: number, height: number) => {
			// 値が変更された場合のみ dispatch を実行
			if (
				!lastDimensions.current ||
				lastDimensions.current.width !== width ||
				lastDimensions.current.height !== height
			) {
				const dimensions = { width, height };
				lastDimensions.current = dimensions;
				dispatch({ type: "CONTAINER_RESIZE", dimensions });
			}
		};

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				updateDimensions(width, height);
			}
		});

		resizeObserver.observe(container);

		// 初期サイズを設定
		const rect = container.getBoundingClientRect();
		updateDimensions(rect.width, rect.height);

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef, dispatch]);
}
