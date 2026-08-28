// doc を持つ側（ブラウザのキャンバス、あるいはファイルを読み書きするサーバー）が
// 操作の適用側へ渡す契約。editor-shell の EditorDocBridge と同形だが、
// エージェント層から UI シェルへ依存しないよう、あえて独立に定義する。

import type { CanvasDoc } from "@jiscribe/canvas";

/**
 * 編集対象ドキュメントへのハンドル。キャンバス外から doc を読み書きする唯一の
 * 窓口で、UI が持つ場合はパネルのマウント中 同一実体を保つこと（購読の張り直しを避ける）。
 */
export type AiDocBridge = {
	/** 最後にコミットされた doc。編集途中のドラッグ状態は含まない */
	getDoc: () => CanvasDoc;
	/**
	 * doc を丸ごと差し替える。UI が持つ場合はユーザー編集と同じ扱い（下書き保存・
	 * dirty 表示）になるため、呼び出し側は必ず新しいオブジェクトを渡すこと
	 */
	replaceDoc: (doc: CanvasDoc) => void;
};
