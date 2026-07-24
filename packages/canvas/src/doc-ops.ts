// doc-ops entry — CanvasDoc への加工処理（生成・接続）を提供する UI/zod 非依存の入口。
//
// root index.ts は Canvas (React) を export するため、import すると react / @emotion 等を
// 引き込む。MCP サーバーや Function Calling ハンドラのように、CanvasDoc をプログラムから
// 組み立てたいだけの Node 側 consumer は、この入口を使って UI 依存を避けられる。
//
// 各 op は zod に依存せず、既に型付けされた params を受け取る（tool 入力の zod 検証は
// adapter 側の責務）。オブジェクト生成は canvas 本体と同じ ObjectFactory を再利用するため、
// スタイル既定値まで含んだ正しい ObjectDoc を作る。
//
// Import 例: `import { addRect } from "@workspace/canvas/doc-ops";`
export {
	addRect,
	type AddRectParams,
	addEllipse,
	type AddEllipseParams,
	connect,
	type ConnectParams,
	type AnchorHandleId,
	DocOperationError,
	type CanvasDoc,
} from "./docOps";
