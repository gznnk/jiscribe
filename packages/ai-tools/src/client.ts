// マウント済みのキャンバスを持っている側（ブラウザ）向けの公開面。doc だけでは
// 答えられない操作（撮影・選択・カメラ・計測・表示状態の読み取り）の適用側を出す。
// doc への適用そのものは ./apply（ブラウザ専用ではない）。

export { applyHandleOp } from "./client/applyHandleOp";
export { captureCanvasImage } from "./client/captureCanvasImage";
export { createCanvasHandleControl } from "./client/createCanvasHandleControl";
export type {
	AiHandleControl,
	AiSelectionResult,
	AiViewSnapshot,
	CapturePng,
} from "./client/types";
