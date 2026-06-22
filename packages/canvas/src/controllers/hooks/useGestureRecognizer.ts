import type React from "react";
import { type Dispatch, useEffect, useMemo, useRef } from "react";

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

	// インスタンスは ref への遅延初期化で「生成は1回だけ」を保証する。
	// （useMemo は React が記憶値を破棄して再計算しうるため、生成＝破棄の対が
	//  崩れてインスタンスがリークする恐れがある。ref なら破棄されない）
	// dispatch は useReducer 由来で同一性が保証されるため、初回クロージャで安全に束縛できる。
	if (recognizerRef.current === null) {
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
	}

	// アンマウント時に保留中の RAF をキャンセルし、
	// アンマウント後にジェスチャーコールバックが発火しないようにする。
	// 破棄後は ref を null に戻し、再マウント時に確実に再生成されるようにする
	// （StrictMode の mount→unmount→mount でも生成と破棄が常に対になる）。
	useEffect(() => {
		return () => {
			recognizerRef.current?.dispose();
			recognizerRef.current = null;
		};
	}, []);

	// handlers のオブジェクト同一性を維持し、子コンポーネントへ渡す props を安定させる
	const handlers = useMemo<UseGestureRecognizerReturn>(
		() => ({
			pointerHandlers: recognizerRef.current!.getHandlers(),
			wheelHandler: recognizerRef.current!.getWheelHandler(),
			resetGestureState: () => recognizerRef.current?.resetGestureState(),
		}),
		[],
	);

	return handlers;
};
