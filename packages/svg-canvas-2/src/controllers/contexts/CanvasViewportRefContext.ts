import { createContext, type RefObject, useContext } from "react";

/**
 * キャンバスルート要素（Viewport）の ref を配下のコンポーネントへ配る Context。
 *
 * ポップアップ系 UI（コンテキストメニュー、サブメニューなど）が
 * キャンバス領域からのはみ出し判定に使う。値は ref オブジェクト（参照が安定）
 * のため、Provider 経由での再レンダリングは発生しない。
 *
 * Canvas.tsx が canvasRef を provide する。
 */
export const CanvasViewportRefContext =
	createContext<RefObject<HTMLDivElement | null> | null>(null);

/**
 * キャンバスルート要素（Viewport）の ref を取得する。
 *
 * Provider の外では null を返すため、呼び出し側は
 * ブラウザウィンドウ境界などへのフォールバックを持つこと。
 */
export function useCanvasViewportRef(): RefObject<HTMLDivElement | null> | null {
	return useContext(CanvasViewportRefContext);
}
