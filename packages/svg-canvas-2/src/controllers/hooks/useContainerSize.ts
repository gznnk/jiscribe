import type { Dimensions } from "@workspace/geometry";
import { type RefObject, useEffect, useRef } from "react";

/**
 * コンテナ要素のサイズ変更を監視し、変更時にコールバックを実行するHook
 *
 * @param containerRef - 監視対象のコンテナ要素への参照
 * @param onResize - サイズ変更時に呼ばれるコールバック関数
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 *
 * useContainerSize(containerRef, (dimensions) => {
 *   console.log(`Container size: ${dimensions.width} x ${dimensions.height}`);
 * });
 * ```
 */
export function useContainerSize(
	containerRef: RefObject<HTMLElement>,
	onResize: (dimensions: Dimensions) => void,
): void {
	const lastDimensions = useRef<Dimensions | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateDimensions = (width: number, height: number) => {
			// 値が変更された場合のみコールバックを実行
			if (
				!lastDimensions.current ||
				lastDimensions.current.width !== width ||
				lastDimensions.current.height !== height
			) {
				const dimensions = { width, height };
				lastDimensions.current = dimensions;
				onResize(dimensions);
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
	}, [containerRef, onResize]);
}
