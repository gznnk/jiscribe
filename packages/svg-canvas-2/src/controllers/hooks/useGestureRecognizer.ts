import type React from "react";
import { useMemo, useRef } from "react";

import type { Viewport } from "../../states/canvas/Viewport";
import { GestureRecognizer } from "../gestures/recognizer/GestureRecognizer";
import type {
	Gesture,
	GestureCallback,
	GestureType,
	HoveredElement,
	Mods,
	PointerEventHandlers,
} from "../gestures/recognizer/GestureRecognizerTypes";

// 型を再エクスポート
export type { Gesture, GestureCallback, GestureType, HoveredElement, Mods };

export type UseGestureRecognizerParams = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	viewport: Viewport;
};

export const useGestureRecognizer = ({
	gestureCallback,
	containerRef,
	svgRef,
	viewport,
}: UseGestureRecognizerParams): PointerEventHandlers => {
	// GestureRecognizerインスタンスをrefで保持
	const recognizerRef = useRef<GestureRecognizer | null>(null);

	// viewportの最新値を常に保持するRef
	const viewportRef = useRef<Viewport>(viewport);
	viewportRef.current = viewport; // レンダリングごとに最新値を設定

	// 初回のみインスタンス作成（viewportRefを渡す）
	const handlers = useMemo(() => {
		recognizerRef.current = new GestureRecognizer({
			gestureCallback,
			containerRef,
			svgRef,
			viewportRef,
		});
		return recognizerRef.current.getHandlers();
	}, [gestureCallback, containerRef, svgRef]); // viewportは依存に含めない

	return handlers;
};
