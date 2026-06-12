import type React from "react";
import { type Dispatch, useMemo, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { GestureRecognizer } from "../gestures/recognizer/GestureRecognizer";
import type {
	GestureCallback,
	PointerEventHandlers,
} from "../gestures/recognizer/GestureRecognizerTypes";
import type { CanvasAction } from "../reducer/CanvasActions";

export type UseGestureRecognizerParams = {
	dispatch: Dispatch<CanvasAction>;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	canvasState: CanvasControllerState;
};

export type UseGestureRecognizerReturn = {
	pointerHandlers: PointerEventHandlers;
	wheelHandler: (e: WheelEvent) => void;
	resetGestureState: () => void;
};

export const useGestureRecognizer = ({
	dispatch,
	containerRef,
	svgRef,
	canvasState,
}: UseGestureRecognizerParams): UseGestureRecognizerReturn => {
	// GestureRecognizerインスタンスをrefで保持
	const recognizerRef = useRef<GestureRecognizer | null>(null);

	// canvasStateの最新値を常に保持するRef
	const canvasStateRef = useRef<CanvasControllerState>(canvasState);
	canvasStateRef.current = canvasState; // レンダリングごとに最新値を設定

	// 初回のみインスタンス作成
	const handlers = useMemo(() => {
		// 認識されたジェスチャーは GESTURE アクションとして reducer へ送る
		// （GestureRecognizer クラス自体はコールバック契約のまま React に依存しない）
		const gestureCallback: GestureCallback = (gesture) => {
			dispatch({ type: "GESTURE", gesture });
		};
		recognizerRef.current = new GestureRecognizer({
			gestureCallback,
			containerRef,
			svgRef,
			canvasStateRef,
		});
		return {
			pointerHandlers: recognizerRef.current.getHandlers(),
			wheelHandler: recognizerRef.current.getWheelHandler(),
			resetGestureState: () => recognizerRef.current?.resetGestureState(),
		};
	}, [dispatch, containerRef, svgRef]); // canvasStateは依存に含めない

	return handlers;
};
