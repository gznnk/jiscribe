import { type RefObject, useEffect } from "react";

/**
 * documentのwheelイベントを監視し、Ctrl押下時にコールバックを実行するHook
 *
 * @param svgRef - SVG要素への参照（座標変換に使用）
 * @param onWheel - wheelイベント発生時に呼ばれるコールバック関数
 *
 * @example
 * ```tsx
 * const svgRef = useRef<SVGSVGElement>(null);
 *
 * useDocumentWheel(svgRef, (e, svgPoint) => {
 *   console.log(`Wheel at SVG coords: ${svgPoint.x}, ${svgPoint.y}`);
 * });
 * ```
 */
export function useDocumentWheel(
	svgRef: RefObject<SVGSVGElement | null>,
	onWheel: (e: WheelEvent) => void,
): void {
	useEffect(() => {
		const onDocumentWheel = (e: WheelEvent) => {
			e.preventDefault();
			onWheel(e);
		};

		document.addEventListener("wheel", onDocumentWheel, {
			passive: false,
			capture: true,
		});

		return () => {
			document.removeEventListener("wheel", onDocumentWheel, true);
		};
	}, [svgRef, onWheel]);
}
