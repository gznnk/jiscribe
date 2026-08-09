# @jiscribe/ai-docs

出荷図形セット（canvas built-in ＋ 収載プラグイン）の JSON スキーマと AI ドキュメントの
正本パッケージ（#170）。`assets/` 配下の 3 ファイルが配布物で、図形マニフェスト
（各 `ObjectDocDefinition` の `description` / `summary` / `outlineDescription` /
`defaults`）から生成される。

| 生成物                        | 生成範囲                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `assets/jiscribe.schema.json` | 全体を再構成。図形 `$def` と union・OwnerRef の connectable 列挙は生成、特殊型・共有スタイルはテンプレ |
| `assets/ai-guide.md`          | `AUTOGEN:BEGIN/END object-quick-reference` 区間のみ                                                    |
| `assets/reference.md`         | `AUTOGEN:BEGIN/END object-types` / `object-details` 区間のみ                                           |

マーカー外の散文は手書き。型の列挙は書かず「box shape（= polyline / polygon / group /
svg / connector 以外の全型）」のような能力ベースの言い回しを使うこと。

消費者は exports（`@jiscribe/ai-docs/schema` / `/guide` / `/reference`）か、ビルド
スクリプトからは `assets/` への相対パスで参照する（vscode-extension の `build.mjs`、
配信側の同期など）。

## 使い方

```bash
pnpm generate:ai   # 再生成
pnpm check:ai      # ドリフト検知（CI で実行）
```

## 図形を追加するとき

1. 図形の `ObjectDocDefinition`（built-in は `builtinObjectDocDefinitions`、プラグインは
   `src/doc.ts`）に `description` / `summary` / `defaults` を書く
2. `generator/src/manifest.ts` の `CANONICAL_TYPE_ORDER` に型名を追記する
   （収載プラグイン自体を増やす場合は `manifest.ts` の import に追加）
3. reference.md の集約表に載せる型なら `outlineDescription` も書き、
   `GROUPED_REFERENCE_TYPES` に追記する
4. `pnpm generate:ai` を実行してコミットする

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
