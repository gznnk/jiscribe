# VSCode 拡張 バリデーションフロー レビュー

レビュー日: 2026-06-07
対象:

- `apps/vscode-extension/src/diagnostics/DiagnosticProvider.ts`
- `apps/vscode-extension/src/webview/index.tsx`
- `packages/canvas/src/schemas/canvas/validators/`（`parseAndValidateCanvasDoc` ほか）

VSCode 拡張側で `.jis.json` / `.jiscribe.json` を `parseAndValidateCanvasDoc`
で検証している現状のフローについてのレビュー結果をまとめる。

---

## 結論

作り直しが必要なレベルの問題はない。

- 「JSON 構文チェック → CanvasDoc セマンティクスチェック」の2段階分離は妥当。
- エラー詳細を `SemanticDiagnostic[]`（`path` / `message` / `id`）で持ち回る設計も素直で、
  バリデーション本体（`validateStructure` / `validateSemantics`）と表示側の責務分離もできている。

ただし、1件のバグに近い非対称性と、いくつかの設計上の改善余地がある。

---

## 対応状況サマリー（2026-06-07 更新）

| 項目                                      | 状態                                                |
| ----------------------------------------- | --------------------------------------------------- |
| 1. 予期しないエラーの握りつぶし／非対称   | ✅ 対応済み                                         |
| 2. 例外による制御フロー + 2箇所での重複   | ✅ 対応済み                                         |
| 3. `findIdRange` の正規表現による位置復元 | ⏸ 未対応（将来課題として保留）                      |
| 4. 命名・細かい点                         | ✅ 対応済み（`parseAndValidateCanvasDoc` ごと廃止） |

項目1・2・4 の対応に伴い、検証フローを以下のとおり再構成した。

- **`parseCanvasText`（判別ユニオン版）を単一エントリに**。
  `JSON.parse` → 構造検証 → 意味検証を 1 関数に集約し、例外ではなく
  `CanvasParseResult`（`ok` / `syntax-error` / `semantic-error` / `internal-error`）を返す。
  拡張側・Webview 側はこれを `switch (result.kind)` で扱うだけになり、2 段ロジックの重複と
  非対称（項目1）が解消された。
- **`CanvasValidationError` / `parseAndValidateCanvasDoc`（throw 版）を廃止**。実消費者が
  無くなったため `parseAndValidate.ts` ごと削除。命名のズレ（項目4）も消滅した。
- **`validateCanvasDocSemantics`（→ 一時 `validateCanvasDoc`）も廃止**。構造→意味を順に
  呼ぶだけの薄いラッパーだったため、`parseCanvasText` 内へインライン化。検証の構成要素は
  `validateStructure` / `validateSemantics` の 2 つだけになった。
- **エラー表示 UI を canvas から拡張側へ移設**。未使用の `CanvasErrorOverlay` を削除し、
  詳細一覧を持つ `CanvasErrorScreen` も廃止。詳細は Problems パネル（`DiagnosticProvider`）が
  担うため、Webview 側は「エラーがあること」だけを示す最小コンポーネント
  `CanvasErrorNotice`（英語表記）に置き換えた。

以下、各項目の詳細はレビュー当時の記録として残す。

---

## 1. 🔴 DiagnosticProvider が予期しないエラーを握りつぶす（優先度: 高）

> ✅ **対応済み (2026-06-07)**: `parseCanvasText` へ寄せ、`internal-error` ケースを
> 拡張側でも Problems パネルへ表示するようにした。Webview 側との非対称も解消。

**ファイル**: `src/diagnostics/DiagnosticProvider.ts:83-101`

```ts
try {
  parseAndValidateCanvasDoc(json);
} catch (error) {
  if (error instanceof CanvasValidationError) {
    for (const diag of error.specifics) { ... }
  }
  // ← CanvasValidationError 以外は何も処理されない = 握りつぶし
}
```

`CanvasValidationError` 以外の例外（バリデータ内部のバグなど）が飛ぶと、`diagnostics` は
空のまま `collection.set` も呼ばれず、**Problems パネルに何も表示されない**。
ユーザーから見ると「エラーがないのにキャンバスが壊れている」状態になる。

一方 Webview 側（`src/webview/index.tsx:128-141`）は `else` で `parseError` に落として
表示しており、**同じ `parseAndValidateCanvasDoc` を使っているのに片方だけ
予期しないエラーを表示する**という非対称が生じている。

**対応案**: 拡張側にも `else` 分岐を追加し、予期しないエラーを汎用の診断として
Problems パネルへ表示する。

---

## 2. 🟡 例外による制御フロー + 2箇所での重複（優先度: 中）

> ✅ **対応済み (2026-06-07)**: 共有ヘルパー `parseCanvasText` を新設し、両 caller を
> `switch (result.kind)` に統一。重複・例外制御・非対称をまとめて解消した。

`parseAndValidateCanvasDoc` は内部で `validateCanvasDocSemantics`（エラー配列を返す）を
呼び、エラーがあれば `CanvasValidationError` を throw する。
ところが**呼び出し側は両方とも即 try/catch して `.specifics` を取り出している**ため、
実質「正常系の戻り値が欲しいだけ」で例外を制御フローに使う形になっている。

加えて、

- `validateCanvasDocSemantics`（配列を直接返す版）は `validators/index.ts` で export 済み。
- `JSON.parse` → `validate` の2段ロジックが拡張側と Webview 側で重複している。

**対応案**: 判別可能なユニオンを返す共有ヘルパーへ寄せると、例外制御・重複・
「予期しないエラーの扱いの非対称（項目1）」をまとめて解消できる。

```ts
type CanvasParseResult =
  | { kind: "ok"; doc: CanvasDoc }
  | { kind: "syntax-error"; message: string }
  | { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] };

function parseCanvasText(text: string): CanvasParseResult { ... }
```

両 caller は `switch (result.kind)` で分岐するだけになり、扱いが1箇所に集約される。
throw 版の `parseAndValidateCanvasDoc` は、戻り値が型付き `CanvasDoc` で欲しい
単発用途向けに残してもよい。

---

## 3. 🟡 `findIdRange` の正規表現による位置復元（優先度: 中〜低）

> ⏸ **未対応 (2026-06-07)**: 将来課題として保留。現状は「最初の1件を指す妥協」を許容する。

**ファイル**: `src/diagnostics/DiagnosticProvider.ts:126-149`

バリデーション層が持つのは `path`（例: `root[0].children[1].id`）と `id` だけで
文字オフセットを持たないため、拡張側が正規表現でテキストを再検索して Range を復元している。
コード内コメントでも自覚されている通り、以下の限界が残る。

- 同一 `id` が複数箇所に存在する場合（重複 ID エラー）は最初の1件しか指せない。
- `path` の階層情報を活かせない。

**対応案（将来）**: VSCode 自体も内部利用している `jsonc-parser`
（`parseTree` + `findNodeAtLocation`）を導入すれば、`path` から正確な Range を引ける。
※現状は dist にトランジティブには存在するが、直接依存としては未宣言。
今は「最初の1件を指す妥協」と割り切るなら現状維持でも可。

---

## 4. 🟢 細かい点

> ✅ **対応済み (2026-06-07)**: 命名のズレは `parseAndValidateCanvasDoc` の廃止により消滅。

- ~~`parseAndValidateCanvasDoc` は名前に "parse" とあるが、実体は `data as CanvasDoc` の
  検証＋キャストであり変換はしていない。~~ → 関数自体を廃止し、入口は `parseCanvasText` に統一。
- 2段階分離・`collection` の事前 `delete`・対象拡張子フィルタ
  （`.jis.json` / `.jiscribe.json`）は適切。

---

## 対応の優先順位（当時の計画）

1. **項目1**（予期しないエラーの握りつぶし／非対称）の修正 — 最優先。 → ✅ 完了
2. **項目2**（2段ロジックの共有ヘルパー化）— 項目1も同時に解消できる。 → ✅ 完了
3. 項目3・4 は余裕があれば。 → 項目4 ✅ 完了 / 項目3 ⏸ 保留

残課題は項目3（`jsonc-parser` による正確な位置解決）のみ。
