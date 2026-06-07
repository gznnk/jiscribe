import { parseCanvasText } from "@workspace/svg-canvas-2";
import * as vscode from "vscode";

/**
 * .jis.json ファイルのバリデーションエラーを VSCode の Problems パネルに表示するプロバイダ。
 *
 * 2段階のバリデーションを行う:
 *   1. JSON 構文チェック（JSON.parse が失敗した場合はその時点でエラー表示）
 *   2. CanvasDoc セマンティクスチェック（重複 ID・存在しない参照など）
 *
 * トリガー:
 *   - ファイルを開いたとき
 *   - ファイルを保存したとき
 *   - 拡張機能が有効になったとき（既に開かれているファイルを対象）
 */
export class DiagnosticProvider {
	/** VSCode の Problems パネルに表示する診断情報を管理するコレクション */
	private collection: vscode.DiagnosticCollection;

	constructor(context: vscode.ExtensionContext) {
		// DiagnosticCollection の名前は Problems パネルのグループ名として表示される。
		// context.subscriptions に追加することで、拡張機能の無効化時に自動的に破棄される。
		this.collection =
			vscode.languages.createDiagnosticCollection("jiscribeCanvas");
		context.subscriptions.push(this.collection);

		// ファイルを保存・オープンするたびにバリデーションを実行する。
		// onDidSave / onDidOpen は Disposable を返すため subscriptions に登録して自動破棄する。
		const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
			this.validateDocument(doc);
		});
		const openListener = vscode.workspace.onDidOpenTextDocument((doc) => {
			this.validateDocument(doc);
		});
		context.subscriptions.push(saveListener, openListener);

		// 拡張機能が有効化された時点で既に開かれているタブを対象に初回検証を行う
		vscode.workspace.textDocuments.forEach((doc) => {
			this.validateDocument(doc);
		});
	}

	private validateDocument(document: vscode.TextDocument) {
		// 対象外ファイルはスキップ
		const validExts = [".jis.json", ".jiscribe.json"];
		if (!validExts.some((ext) => document.fileName.endsWith(ext))) {
			return;
		}

		const text = document.getText();

		// 前回のエラー表示をクリアしてから新しい診断を行う
		this.collection.delete(document.uri);

		// JSON 構文チェック → CanvasDoc セマンティクスチェックを共通ヘルパーへ委譲する。
		// parseCanvasText() は例外を投げず、判別可能なユニオンで結果を返すため、
		// すべてのケース（構文エラー・セマンティクスエラー・予期しないエラー）を
		// 漏れなく Problems パネルへ反映できる。
		const result = parseCanvasText(text);
		switch (result.kind) {
			case "ok":
				return;

			case "syntax-error": {
				// 以前は構文エラーを無音でスキップしていた（早期 return するだけ）ため、
				// ユーザーがなぜ Problems パネルに何も表示されないのか分からない問題があった。
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 0),
					`JSON 構文エラー: ${result.message}`,
					vscode.DiagnosticSeverity.Error,
				);
				this.collection.set(document.uri, [diagnostic]);
				return;
			}

			case "semantic-error": {
				// diag.path / diag.id を使って対象箇所をハイライトする。
				const diagnostics = result.diagnostics.map((diag) => {
					const range = diag.id
						? this.findIdRange(text, document, diag.id)
						: new vscode.Range(0, 0, 0, 10);

					return new vscode.Diagnostic(
						range,
						`[Jiscribe] ${diag.message} (${diag.path})`,
						vscode.DiagnosticSeverity.Error,
					);
				});
				this.collection.set(document.uri, diagnostics);
				return;
			}

			case "internal-error": {
				// 想定外のエラーを握りつぶさず、ファイル先頭に診断として表示する。
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 0),
					`[Jiscribe] 検証中に予期しないエラーが発生しました: ${result.message}`,
					vscode.DiagnosticSeverity.Error,
				);
				this.collection.set(document.uri, [diagnostic]);
				return;
			}
		}
	}

	/**
	 * JSON テキスト内でエラー対象の ID フィールドの位置を特定し、Range を返す。
	 *
	 * (#4 修正) 旧実装では text.indexOf('"id-value"') を使っていたため、
	 * 以下の問題があった:
	 *   - `"abc"` を検索したとき、`"abcdef"` の先頭にマッチしてしまう
	 *   - `"parentId": "abc"` など別フィールドの値にマッチしてしまう
	 *
	 * 正規表現 `"id"\s*:\s*"<id値>"` を使うことで、
	 * JSON のキー名が正確に "id" であるフィールドのみを対象にできる。
	 *
	 * 注意: 同じ ID が複数箇所に存在する場合（重複 ID エラーの場合など）は
	 * 最初に見つかった箇所を指す。完全な解決には JSON パーサーレベルの位置追跡が必要。
	 *
	 * @param text     ファイルのテキスト全体
	 * @param document VSCode のドキュメントオブジェクト（文字オフセット→行列変換に使用）
	 * @param id       検索対象の ID 文字列
	 */
	private findIdRange(
		text: string,
		document: vscode.TextDocument,
		id: string,
	): vscode.Range {
		// ID 値に正規表現特殊文字（. * + ? 等）が含まれる可能性があるためエスケープする
		const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// `"id": "value"` 形式のみにマッチする正規表現
		// \s* でキーとコロンの間・コロンと値の間のスペースを許容する
		const regex = new RegExp(`"id"\\s*:\\s*"${escapedId}"`);
		const match = regex.exec(text);

		if (match) {
			// match.index はファイル先頭からの文字オフセット。
			// positionAt() で行・列に変換する。
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			return new vscode.Range(startPos, endPos);
		}

		// 対応する箇所が見つからなかった場合はファイル先頭にフォールバック
		return new vscode.Range(0, 0, 0, 10);
	}
}
