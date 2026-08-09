> 🌐 English version: [README.md](./README.md)

# canvas 設計ドキュメント

`@jiscribe/canvas` の設計を 13 本の柱で整理したドキュメント群です。
全体像を俯瞰したい場合は、まず [設計思想](./01-design-philosophy.ja.md) と
[アーキテクチャ](./02-architecture.ja.md) を読むことをおすすめします。

設計ドキュメント全体の見取り図（マインドマップ）は [00-overview.jis.json](./00-overview.jis.json) を参照。
jiscribe 形式なので、VSCode 拡張または demo アプリで開くと図として閲覧できます。

## 目次

| #   | ドキュメント                                                  | 概要                                                                                          |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | [設計思想](./01-design-philosophy.ja.md)                      | 性能優先・純粋関数・ハンドラ責務・境界での防御という 4 つの判断基準                           |
| 2   | [アーキテクチャ](./02-architecture.ja.md)                     | レイヤー分離（schemas/states/controllers/presentations/registry）と一方向依存                 |
| 3   | [データモデルと永続化](./03-data-model-and-persistence.ja.md) | Doc ↔ State の Mapper 変換、`.jis.json` 仕様、parser の二段検証                               |
| 4   | [ジェスチャシステム](./04-gesture-system.ja.md)               | GestureRecognizer、ハンドラ構成、`data-gesture` 連携属性                                      |
| 5   | [コマンドシステム](./05-command-system.ja.md)                 | CommandRegistry、ショートカット/メニュー/ツールバーの一元化、Undo/Redo                        |
| 6   | [状態更新フロー（Reducer）](./06-state-update-flow.ja.md)     | `canvasReducer` のアクションと履歴記録・集約のしくみ                                          |
| 7   | [外部同期・VSCode 連携](./07-external-sync.ja.md)             | `useSyncExternalDoc` / `SYNC_EXTERNAL` と saveNonce 折り返し                                  |
| 8   | [表示・テーマ](./08-presentation-and-theme.ja.md)             | presentations の純粋描画、色の使い分け、VSCode テーマトークン                                 |
| 9   | [テスト](./09-testing.ja.md)                                  | ユニット / 結合（vitest）、E2E（Playwright）、循環依存チェック（madge）                       |
| 10  | [スタイルプロパティシステム](./10-style-properties.ja.md)     | StylePropertyRegistry、feature gate / シェイプ宣言の 2 層宣言、ドット記法のネスト書き込み     |
| 11  | [図形の設計判断](./11-shape-design.ja.md)                     | 図形を新設・拡張するときの判断基準（ジオメトリの「ユーザー指定 / エンジン導出」切り分けなど） |
| 12  | [プラグインアーキテクチャ](./12-plugin-architecture.ja.md)    | `CanvasPlugin` のコントリビューション、UI / headless の 2 面、公開面の階層、状態の所有権      |
| 13  | [プラグインの作り方](./13-authoring-plugins.ja.md)            | 図形パッケージの構成、`@jiscribe/canvas-sdk`、リンタが強制する境界、配線チェックリスト        |

## AI 向けリファレンス

形式仕様・オーサリング手順など AI 向けの資料は `packages/ai-docs/assets/` 配下にあります（本設計ドキュメントとは別系統）。

- [Canvas Doc リファレンス](../../ai-docs/assets/reference.md)
- [AI オーサリングガイド](../../ai-docs/assets/ai-guide.md)
