// AI の capture_canvas ツール向けに、現在のキャンバスを PNG にして base64 で返す。
// doc を読み書きしない点は他のキャンバス操作（applyHandleOp）と同じだが、撮影だけは
// 非同期なので、そちらにも applyCanvasOp にも混ぜず独立した経路にしてある。

import type { CanvasPngExportOptions } from "@jiscribe/canvas";

import type { AiCanvasOpOutcome } from "../canvasOps";
import type { CapturePng } from "./types";

/**
 * AI へ渡す画像の最長辺（px）。base64 で IPC を通り、さらにモデルの入力に
 * 載るため、読み取れる程度に抑える（API 側も長辺 1568px 程度へ縮小する）
 */
const MAX_CAPTURE_PIXEL_SIZE = 1400;

/**
 * 撮影オプション。等倍＋最長辺の上限でサイズを抑え、再編集用の .jis.json 埋め込みは
 * 外す（AI は describe_canvas で doc を読めるので二重に運ぶ意味がない）
 */
const CAPTURE_OPTIONS: CanvasPngExportOptions = {
	includeSource: false,
	scale: 1,
	maxPixelSize: MAX_CAPTURE_PIXEL_SIZE,
};

/** 一度に btoa へ渡す byte 数。スプレッドの引数上限に触れない大きさ */
const BASE64_CHUNK_SIZE = 0x2000;

const toBase64 = (bytes: Uint8Array): string => {
	const chunks: string[] = [];
	for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
		chunks.push(
			String.fromCharCode(
				...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE),
			),
		);
	}
	return btoa(chunks.join(""));
};

/**
 * キャンバスを撮影し、ツール結果に載せる PNG（base64）を組み立てる。
 *
 * @param capturePng - ホストアプリから受け取った画像化関数。未マウント時は null を返す
 * @returns ツール結果。ok=true なら imagePngBase64 が入る
 */
export const captureCanvasImage = async (
	capturePng: CapturePng,
): Promise<AiCanvasOpOutcome> => {
	try {
		const pngBlob = await capturePng(CAPTURE_OPTIONS);
		if (pngBlob === null) {
			return { ok: false, text: "the canvas is not ready to be captured yet" };
		}
		return {
			ok: true,
			text: "captured the canvas: the image is the whole drawing fitted to its content and scaled to fit, so do not read coordinates or sizes off it — use describe_canvas for exact numbers",
			imagePngBase64: toBase64(new Uint8Array(await pngBlob.arrayBuffer())),
		};
	} catch (error) {
		return {
			ok: false,
			text: `failed to capture the canvas: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
};
