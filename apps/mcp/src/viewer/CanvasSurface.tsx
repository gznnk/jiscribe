import { Canvas, lightCanvasTheme } from "@jiscribe/canvas";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	OpenReferencePayload,
	ToolbarEntry,
} from "@jiscribe/canvas";
import { standardToolbarLayout } from "@jiscribe/standard-shapes";
import { useEffect, useRef } from "react";

import { plugins } from "./canvasPlugins";

// モジュールスコープの定数にして、再レンダリングのたびに Canvas を作り直させない
const initialConfig: CanvasConfig = { plugins };

// annotation / flowchart / container / general / icon カテゴリと markdown プリセットは
// core の既定 layout に含まれない（プラグイン供給）。図形セットが提案する並びを使う
const toolbarLayout: ToolbarEntry[] = standardToolbarLayout;

export type CanvasSurfaceProps = {
	/** 描く doc。差し替えるたびに描き直る */
	doc: CanvasDoc;
	/** 人が編集を確定したときに呼ばれる。ドラッグ途中では呼ばれない */
	onCommit: (committedDoc: CanvasDoc) => void;
	/** オブジェクトの meta.reference を開く要求。解決はホスト側の責務 */
	onOpenReference: (payload: OpenReferencePayload) => void;
	/**
	 * 撮影・カメラ・選択・計測に要る Canvas のハンドルを親へ預ける。マウント中だけ
	 * 有効で、アンマウント時は null で解除する（キャンバスが無い間に AI が
	 * 触りにきたら「画面が無い」と答えられるように）
	 */
	onRegisterCanvas: (handle: CanvasHandle | null) => void;
};

/**
 * キャンバス 1 枚を親いっぱいに描くだけの面。
 *
 * ファイルの読み書きは持たない（doc は WebSocket で降ってきて、保存は App が行う）。
 */
export function CanvasSurface({
	doc,
	onCommit,
	onOpenReference,
	onRegisterCanvas,
}: CanvasSurfaceProps) {
	const canvasRef = useRef<CanvasHandle>(null);

	useEffect(() => {
		onRegisterCanvas(canvasRef.current);
		return () => {
			onRegisterCanvas(null);
		};
	}, [onRegisterCanvas]);

	return (
		<div className="viewer-canvas-host">
			<Canvas
				ref={canvasRef}
				doc={doc}
				onCommit={onCommit}
				onOpenReference={onOpenReference}
				theme={lightCanvasTheme}
				initialConfig={initialConfig}
				toolbar={{ layout: toolbarLayout }}
			/>
		</div>
	);
}
