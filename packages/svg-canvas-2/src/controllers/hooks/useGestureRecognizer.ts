import type React from "react";
import { useMemo, useRef } from "react";

import {
	GestureRecognizer,
	type Gesture,
	type GestureCallback,
	type GestureType,
	type HoveredElement,
	type Mods,
	type PointerEventHandlers,
} from "../gestures/recognizer/GestureRecognizer";

// 型を再エクスポート
export type { Gesture, GestureCallback, GestureType, HoveredElement, Mods };

export type UseGestureRecognizerParams = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
};

export const useGestureRecognizer = ({
	gestureCallback,
	containerRef,
	svgRef,
}: UseGestureRecognizerParams): PointerEventHandlers => {
	// GestureRecognizerインスタンスをrefで保持
	const recognizerRef = useRef<GestureRecognizer | null>(null);

	// gestureCallback、containerRef、svgRefが変更されたら新しいインスタンスを作成
	const handlers = useMemo(() => {
		recognizerRef.current = new GestureRecognizer({
			gestureCallback,
			containerRef,
			svgRef,
		});
		return recognizerRef.current.getHandlers();
	}, [gestureCallback, containerRef, svgRef]);

	return handlers;
};
