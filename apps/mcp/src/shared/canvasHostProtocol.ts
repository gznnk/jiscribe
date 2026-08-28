// キャンバスホスト（MCP プロセス）とビューア（ブラウザ）が WebSocket 1 本で
// 交わすメッセージ定義。
//
// 運ぶものは 2 種類ある。
//
// 1. ファイルの同期。正本はワークスペース上の .jis.json で、AI は MCP ツールで
//    それを書き換え、人はビューアで直して保存する。ここは片方向の通知で足りる。
// 2. マウント済みのキャンバスが要る操作（撮影・カメラ・選択・計測）。ファイルには
//    答えが無いのでビューアに聞きに行くしかなく、requestId を振った往復になる。

import type { AiHandleOp } from "@jiscribe/ai-tools";

/** サーバー → ビューア */
export type CanvasHostServerMessage =
	// 接続直後と、開く対象が変わったときに届く
	| { type: "openCanvas"; relPath: string; docText: string }
	// 開いているファイルが外（AI のツール・別のエディタ）から書き換わった
	| { type: "docChanged"; relPath: string; docText: string }
	// ファイルが読めない・壊れている。ビューアはメッセージを出すだけ
	| { type: "docError"; relPath: string; message: string }
	// 描かれた結果への問い合わせ。requestId を付けて返してもらう
	| { type: "handleOpRequest"; requestId: string; op: AiHandleOp }
	// 窓を閉じてほしい。閉じられたかどうかは接続が切れるかで分かるので、
	// これに対する返事は無い
	| { type: "closeViewer" };

/** ビューア → サーバー */
export type CanvasHostClientMessage =
	// 人がキャンバスを編集し、ビューアが保存し終えた。サーバーはこの本文を
	// 「自分が知っている最新」として控え、監視の自己エコーを打ち消す
	| { type: "saved"; relPath: string; docText: string }
	// handleOpRequest への答え。ok=false のとき text はそのまま AI への失敗理由
	| {
			type: "handleOpResult";
			requestId: string;
			ok: boolean;
			text: string;
			/** capture_canvas のときだけ入る PNG（base64、データ URL 接頭辞なし） */
			imagePngBase64?: string;
	  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * 受信フレームがビューアからのメッセージの形かを検査する。ネットワーク越しの
 * 入力なので、type ごとに必須プロパティの存在と型まで確認する。
 *
 * @param value JSON.parse 済みのフレーム。パースに失敗したものは呼び出し側で捨てること
 */
export function isCanvasHostClientMessage(
	value: unknown,
): value is CanvasHostClientMessage {
	if (!isRecord(value)) {
		return false;
	}
	switch (value.type) {
		case "saved":
			return (
				typeof value.relPath === "string" && typeof value.docText === "string"
			);
		case "handleOpResult":
			return (
				typeof value.requestId === "string" &&
				typeof value.ok === "boolean" &&
				typeof value.text === "string" &&
				(value.imagePngBase64 === undefined ||
					typeof value.imagePngBase64 === "string")
			);
		default:
			return false;
	}
}
