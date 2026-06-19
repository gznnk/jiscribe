// パーサー専用のエントリポイント。
//
// ルートの index.ts は Canvas（React コンポーネント）を export しているため、
// それを import すると react / @emotion / katex などの UI 依存がバンドルに含まれる。
// VSCode 拡張の Node 側（DiagnosticProvider）のように「テキストを CanvasDoc に
// パースしたいだけ」の利用者は、このエントリを使うことで UI 依存を取り込まずに済む。
//
// import 例: `import { parseCanvasText } from "@workspace/canvas/parser";`
//
// 検証に必要な objectDocValidatorRegistry の初期化は parseCanvasText が必要時に
// 遅延実行するため、このエントリ側で初期化処理を行う必要はない。
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export { parseCanvasText } from "./schemas/canvas/validators";
export type {
	CanvasParseResult,
	SemanticDiagnostic,
} from "./schemas/canvas/validators";
