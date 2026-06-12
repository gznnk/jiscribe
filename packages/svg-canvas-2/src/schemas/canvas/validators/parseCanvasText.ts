import type { CanvasDoc } from "../CanvasDoc";
import type { SemanticDiagnostic } from "./types";
import { validateSemantics } from "./validateSemantics";
import { validateStructure } from "./validateStructure";
import { initializeObjectDocValidatorRegistry } from "../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

/**
 * Canvas ドキュメント文字列のパース結果。
 *
 * JSON 構文エラー / セマンティクスエラー / 検証中の予期しない例外 / 正常 を
 * 判別可能なユニオンで表現する。例外を制御フローに使わず、呼び出し側は
 * `switch (result.kind)` で全ケースを漏れなく扱える。
 */
export type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc }
	| { kind: "syntax-error"; message: string }
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "internal-error"; message: string };

/**
 * Canvas ドキュメント文字列を JSON 構文 → 構造・意味の 2 段階で検証し、
 * 結果を {@link CanvasParseResult} として返す。
 *
 * 例外を投げず判別可能なユニオンを返すため、拡張側・Webview 側の双方が
 * 同一ロジックを共有でき、予期しないエラーの取りこぼしも `internal-error`
 * として明示的に扱える。
 *
 * @param text パース対象の JSON 文字列
 */
export function parseCanvasText(text: string): CanvasParseResult {
	// validateStructure / validateSemantics は型別検証・接続可能性判定を
	// objectDocValidatorRegistry に委譲する。このレジストリは「parse 時の検証」で
	// しか使われないため、ここで未初期化なら埋める（冪等: 既に埋まっていれば何もしない）。
	// こうすることで呼び出し側（UI エントリ / パーサー専用エントリ）が初期化を
	// 気にする必要がなくなり、エントリ取り違えによる誤検知を構造的に防ぐ。
	if (objectDocValidatorRegistry.isEmpty()) {
		initializeObjectDocValidatorRegistry();
	}

	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return {
			kind: "syntax-error",
			message: e instanceof Error ? e.message : "JSON parse error",
		};
	}

	try {
		// 構造検証で弾かれた場合（= そもそも CanvasDoc として成立していない）は、
		// 意味検証へ進まず構造エラーだけを返す。
		const structureErrors = validateStructure(data);
		const diagnostics =
			structureErrors.length > 0
				? structureErrors
				: validateSemantics(data as CanvasDoc);

		if (diagnostics.length > 0) {
			return { kind: "semantic-error", diagnostics };
		}
		return { kind: "ok", doc: data as CanvasDoc };
	} catch (e) {
		// バリデータ内部の想定外エラー。握りつぶさず呼び出し側へ伝える。
		return {
			kind: "internal-error",
			message: e instanceof Error ? e.message : "Unexpected validation error",
		};
	}
}
