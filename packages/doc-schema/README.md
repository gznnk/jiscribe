# @jiscribe/doc-schema

出荷図形セット（canvas built-in ＋ 収載プラグイン）の JSON スキーマと AI ドキュメントの
正本パッケージ（#170）。図形マニフェスト（各 `ObjectDocDefinition` の `description` /
`summary` / `defaults`）と、`parts/` 配下の手書き 4 枚から生成される。

`parts/` は読者ではなく知識の種類で切ってある。01〜03（キャンバスの模型・図形カタログ・
作図の作法）は誰が読んでも同じで、04（JSON を手で書く）だけが読者ごとに分かれる。h1 は
持たず `##` から始まり、導入文は `generator/templates/` の 3 枚が持つ。

**ツールの使い方はここに書かない。**キャンバス操作ツールで描く読者に向けた「どの道具を
いつ使うか」は `@jiscribe/ai-tools` の各 descriptor の文言が正本で、zod の引数スキーマと
`drives` の隣にあることで実装に縛られている。ここに要約を置くと、宣言が変わっても直らない
写しになる。単一の descriptor に収まらないツール横断の作法が要るようになったら、置き場は
やはり ai-tools 側（該当する descriptor か、宣言の隣）で、`parts/` には戻さない。

| 生成物                                            | 生成範囲                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `assets/jiscribe.schema.json`                     | 全体を再構成。図形 `$def` と union・OwnerRef の connectable 列挙は生成、特殊型・共有スタイルはテンプレ |
| `assets/ai-guide.md`                              | 導入 + parts 01・02・03・04 の合成                                                                     |
| `assets/canvas-prompt.md`                         | 導入 + parts 01・02・03 の合成                                                                         |
| `assets/authoring-json.md`                        | 導入 + parts 04 の合成（形式仕様を単体で配る。jiscribe-mcp の `read_drawing_guide` が返す）            |
| `../ai-tools/src/prompt/generatedCanvasPrompt.ts` | `canvas-prompt.md` の本文を文字列で export（`@jiscribe/ai-tools/prompt` が包む）                       |

3 枚のガイドは `<!-- jiscribe guide <8 桁> -->` の刻印で始まる。値は 3 枚の本文から
決まる 1 つのダイジェストで、3 枚とも同じものが入る。同じガイドが版のピンの違う経路
（VSCode 拡張が置く `.jiscribe/ai-guide.md` と、jiscribe-mcp が返すもの）で読み手に届く
ため、写しがどの生成から来たかを言えるようにしてある。**版番号でもコミットでもなく内容
から導く**のは、変わっていない木を再生成しても同じ値が出て `check:schema` がドリフト検査
のままでいられるようにするため。

parts のうち 02 の `object-quick-reference` 区間（`type` と用途）と 04 の
`object-geometry` 区間（`type` と必須ジオメトリ）だけがマニフェストから生成され、
合成時に差し込まれる（parts 自体は書き換えない）。**したがって parts 側のマーカーの
中身は空で、そこに手で書いたものは合成時に捨てられる。**マーカー外の散文は手書き。
型の列挙は書かず「box shape（= lucideIcon / polyline / polygon / group / svg /
connector 以外の全型）」のような能力ベースの言い回しを使うこと。

図形 `$def` のうち、rect ジオメトリ＋4 スタイル（stroke / fill / text / transform）を
共有既定値のまま持ち、断片も corner radius も持たない型は、共有 `$def`
`BoxShapeDoc` を `allOf` で参照して `type` の const だけを載せた薄い `$def` になる
（判定は `generateSchema.ts` の `isBoxShapeCompatible`）。既定値の inline 上書きや
`propertyOverrides` のエントリがあれば自動的に対象外となり、従来どおり全プロパティを
展開した `$def` が生成される。

消費者は exports（`@jiscribe/doc-schema/schema` / `/guide` / `/canvas-prompt` /
`/authoring-json`）か、
ビルドスクリプトからは `assets/` への相対パスで参照する
（vscode-extension の `build.mjs`、配信側の同期など）。キャンバス操作ツールを持つホストは
`@jiscribe/ai-tools/prompt` の `CANVAS_TOOL_PROMPT` を使う。

## 使い方

```bash
pnpm generate:schema   # 再生成
pnpm check:schema      # ドリフト検知（CI で実行）
```

## 図形を追加するとき

1. 図形の `ObjectDocDefinition`（built-in は `builtinObjectDocDefinitions`、プラグインは
   `src/doc.ts`）に `description` / `summary` / `defaults` を書く
2. `generator/src/manifest.ts` の `CANONICAL_TYPE_ORDER` に型名を追記する
   （収載プラグイン自体を増やす場合は `manifest.ts` の import に追加）
3. `pnpm generate:schema` を実行してコミットする

宣言漏れ（description 無し・収載リスト未登録など）は生成時にエラーで検出される。

## 手書きテンプレ

- `generator/templates/handwrittenDefs.json` — 特殊型（markdown / record / polyline /
  polygon / group / svg / connector）とコネクタ・共有スタイル・enum の `$def`
- `generator/templates/propertyOverrides.json` — 型固有のプロパティ断片（callout の
  `tail`、sticky の `fontColor`）。既存プロパティ名なら差し替え、新規名なら `meta` の
  直後に挿入
- `generator/templates/rootTemplate.json` — スキーマのトップレベル（`$defs` 以外）

なお DOC_DEFAULTS が共有スタイル既定値と異なるプロパティ（例: sticky の `fill`）は
自動で inline 上書きされるので、断片が必要なのは説明文自体が型固有のときだけ。
