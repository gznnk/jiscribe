import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

import type { CanvasDoc, CanvasParseResult } from "@jiscribe/doc";

import { writeFileAtomically } from "./atomicWrite";
import { canvasParser } from "./canvasDefinitions";

/** ファイル読み書きや検証で投げる、AI へそのまま返せるメッセージ付きエラー。 */
export class CanvasFileError extends Error {}

/**
 * 絶対パスのファイルを文字列として読み込む。
 *
 * stdio サーバーの cwd はワークスペースと一致する保証がないため、相対パスは拒否する。
 * 検証は行わないので、壊れたファイルを診断したい呼び出し側はこちらを使う。
 */
export async function readCanvasFileText(path: string): Promise<string> {
	if (!isAbsolute(path)) {
		throw new CanvasFileError(
			`path must be an absolute path, but got: ${path}`,
		);
	}

	try {
		return await readFile(path, "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to read file: ${reason}`);
	}
}

/**
 * 絶対パスの `.jis.json` を読み込み、検証済みの CanvasDoc として返す。
 *
 * 読み込み時点で `canvasParser`（UI 非依存・プラグイン図形込みの正検証器）に通し、不正な
 * ファイルには加工処理を行わせない（壊れた doc に追記して壊れ方を広げないため）。
 */
export async function loadCanvasFile(path: string): Promise<CanvasDoc> {
	const text = await readCanvasFileText(path);

	const result = canvasParser.parse(text);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`file is not a valid CanvasDoc:\n${formatParseResult(result)}`,
		);
	}

	return result.doc;
}

/**
 * CanvasDoc を検証してからファイルへ書き戻す。
 *
 * 加工後のドキュメントを再度 `canvasParser` に通し、不正なら書き込まずに診断付きで
 * 失敗させる。壊れた `.jis.json` を残さないため。
 *
 * 置き換えは不可分（`./atomicWrite`）なので、監視しているホストや外部のエディタから
 * 書きかけの姿が見えることはない。
 *
 * @param path 書き出し先の絶対パス。親ディレクトリが無ければ作る
 * @param doc 書き出す CanvasDoc
 */
export async function saveCanvasFile(
	path: string,
	doc: CanvasDoc,
): Promise<void> {
	const serialized = serializeCanvasFile(doc);

	const result = canvasParser.parse(serialized);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`refused to write (resulting document is invalid):\n${formatParseResult(result)}`,
		);
	}

	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFileAtomically(path, serialized);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to write file: ${reason}`);
	}
}

/**
 * 対象の `.jis.json` を、開ける状態にして返す。無ければ空のキャンバスとして作り、
 * 既にあれば検証だけして中身は触らない。
 *
 * 壊れたファイルをそのまま開くと画面には何も出ず、原因も分からないので、既存
 * ファイルはここで `canvasParser` に通して落とす。
 *
 * @param path 対象ファイルの絶対パス。親ディレクトリが無ければ作る
 * @returns 新しく作ったなら true、既にあったなら false
 */
export async function ensureCanvasFile(path: string): Promise<boolean> {
	if (!isAbsolute(path)) {
		throw new CanvasFileError(
			`path must be an absolute path, but got: ${path}`,
		);
	}

	try {
		await access(path);
	} catch {
		await saveCanvasFile(path, { version: 1, root: [] });
		return true;
	}

	await loadCanvasFile(path);
	return false;
}

/** CanvasDoc を整形済み JSON 文字列（タブインデント・末尾改行）へ直列化する。 */
export function serializeCanvasFile(doc: CanvasDoc): string {
	return `${JSON.stringify(doc, null, "\t")}\n`;
}

/** パース結果を人間/AI 可読のテキストへ整形する。 */
export function formatParseResult(result: CanvasParseResult): string {
	switch (result.kind) {
		case "ok": {
			if (result.warnings.length === 0) {
				return "valid: true";
			}
			// 未知 type・未知 enum 値の除去は表示・保存経路では黙認だが、AI には診断として
			// 渡して自己修正させる（エンジン自動補正でなく診断で直させる方針）。
			const lines = result.warnings.map(
				(warning) => `- ${warning.path}: ${warning.message}`,
			);
			return `valid: true\n${result.warnings.length} warning(s):\n${lines.join("\n")}`;
		}
		case "syntax-error":
			return `valid: false\nsyntax error: ${result.message}`;
		case "structure-error":
		case "semantic-error": {
			const lines = result.diagnostics.map(
				(diagnostic) => `- ${diagnostic.path}: ${diagnostic.message}`,
			);
			return `valid: false\n${result.diagnostics.length} issue(s):\n${lines.join("\n")}`;
		}
		case "internal-error":
			return `valid: false\ninternal error: ${result.message}`;
	}
}
