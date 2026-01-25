import type React from "react";
import { useMemo, useRef } from "react";

import type { CanvasState } from "../../states/canvas/CanvasState";
import { GestureRecognizer } from "../gestures/recognizer/GestureRecognizer";
import type {
	GestureCallback,
	PointerEventHandlers,
} from "../gestures/recognizer/GestureRecognizerTypes";

export type UseGestureRecognizerParams = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	canvasState: CanvasState;
};

export const useGestureRecognizer = ({
	gestureCallback,
	containerRef,
	svgRef,
	canvasState,
}: UseGestureRecognizerParams): PointerEventHandlers => {
	// GestureRecognizerインスタンスをrefで保持
	const recognizerRef = useRef<GestureRecognizer | null>(null);

	// canvasStateの最新値を常に保持するRef
	const canvasStateRef = useRef<CanvasState>(canvasState);
	canvasStateRef.current = canvasState; // レンダリングごとに最新値を設定

	// 初回のみインスタンス作成
	const handlers = useMemo(() => {
		recognizerRef.current = new GestureRecognizer({
			gestureCallback,
			containerRef,
			svgRef,
			canvasStateRef,
		});
		return recognizerRef.current.getHandlers();
	}, [gestureCallback, containerRef, svgRef]); // canvasStateは依存に含めない

	return handlers;
};
