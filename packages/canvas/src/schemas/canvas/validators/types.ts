export type SemanticDiagnostic = {
	path: string;
	message: string;
	id?: string;
	/**
	 * JSON スキーマでは検出されない validator 専用の構造ルールであることを示す。
	 * （スキーマで忠実に表現できないもの、または二重化回避のためあえて持たせないもの）
	 *
	 * 例: connector の「両端 free 禁止」のようなクロスフィールド不変条件や、
	 * `isCssSafeValue` のようなサニタイズ（許可リスト）検査。
	 *
	 * 構造検証を JSON スキーマへ委ねる利用者（VSCode 拡張の DiagnosticProvider）は、
	 * このフラグが立った診断だけは抑制せずに表示する必要がある。スキーマが検出
	 * できない＝放置すると「開けないのにエラーが出ない」状態になるため。
	 * 省略時（undefined）はスキーマでも検出可能な構造エラーとして扱う。
	 */
	beyondSchema?: boolean;
};
