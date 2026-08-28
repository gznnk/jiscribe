// doc を実際に持っている側（ブラウザのキャンバス／ワークスペースのファイル）向けの
// 公開面。React にも DOM にも依存しないので Node からも読める。

export { applyCanvasOp } from "./apply/applyCanvasOp";
export {
	type CanvasOpHistory,
	createCanvasOpHistory,
} from "./apply/canvasOpHistory";
export type { AiDocBridge } from "./apply/docBridge";
