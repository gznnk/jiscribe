> 🌐 English version: [README.md](./README.md)

# Jiscribe

AI に描かせて、気になるところは手で直して、続きはまた AI に任せる。
人と AI が同じキャンバスに描く SVG エンジン。アーキテクチャ図もフロー図も UI モックも、ポスターや文書だって描ける。

![AI エージェントがキャンバスにリアルタイムで描いていく様子](https://beta.jiscribe.dev/images/vscode/ai-workflow.gif)

AI が続きを描いても、丸ごと描き直されることはなく、手で直した箇所も消えない。
描いたものはコード上では**ただのオブジェクト**、ディスク上では**ただの JSON**
（`.jis`）であり、キャンバスも AI のツールも、それを編集する手段の 1 つでしか
ないからだ。

作図に必要なものの多くは、はじめから揃っている。コアが 8 つの基本型（`rect` /
`ellipse` / `text` / `polyline` / `polygon` / `group` / `connector` / `svg`）を
受け持ち、フローチャート・UML・付箋・Markdown・コンテナ・注釈・汎用ピクトグラム・
Lucide アイコン・AWS アーキテクチャといった図形セットはプラグインとして同梱して
いる。図形セットは今後も増やしていく。

## 何が作れるか

|                                                                                                                                                                                          |                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![注文ドメインの UML クラス図](./docs/images/gallery-uml-class-diagram.jis.png)<br>**UML・クラス図** — パッケージ、インターフェース、コンポジション、多重度、ノート                      | ![3 層構成の AWS アーキテクチャ図](./docs/images/gallery-aws-architecture.jis.png)<br>**アーキテクチャ図** — AWS のアイコンと境界のグループを、リージョンからサブネットまで               |
| ![アイソメトリック格子の上に描いたクラウド構成図](./docs/images/gallery-isometric-topology.jis.png)<br>**寸法どおりに描くインフラ図** — 立体はすべて、30° 格子に沿って置いた素のポリゴン | ![取引端末のモック](./docs/images/gallery-trading-terminal.jis.png)<br>**UI モック** — 取引端末: ローソク足・板・歩み値を、仕様書に使える精度で                                           |
| ![スイススタイルのカンファレンスポスター](./docs/images/gallery-conference-poster.jis.png)<br>**ポスター・印刷物** — タイポグラフィのグリッドも、図形とテキストの組み合わせにすぎない    | ![4 レーンにまたがる返金依頼のフロー](./docs/images/gallery-refund-swimlane.jis.png)<br>**フロー図・スイムレーン** — 受け渡し・判断・例外系、そして各ステップが触るシステムを示すアイコン |

![1 枚に収めた障害のポストモーテム](./docs/images/gallery-postmortem.jis.png)

**1 枚のキャンバスに文書を丸ごと** — ポストモーテム: 数字・タイムライン・原因・アクションアイテム

このギャラリーの画像はすべて `.jis.png` で、書き出した画像の中に、それを描いた文書が
入っている。画像が要る場所ではそのまま画像として使え、Jiscribe で開けば元の文書として
編集できる。どれも特別なモードで描いたものではない。図形とテキストとコネクタだけで
できた、AI が書けて人が手で動かせる、ふつうの文書だ。

## AI のために設計している。後付けではない

- **1 手ずつ編集する。丸ごと作り直さない。** stdio 越しに提供する 69 個のツールは、
  人がエディタで行う操作と同じ粒度だ。追加・接続・整列・等間隔配置・グループ化・
  スタイル変更・重なり順・選択。編集はいま手元にある文書に加えられるので、人が手で
  置いたものはそのまま残り、`undo` が戻すのは AI 自身の操作だけになる。
- **ゼロから作るときは、ファイルを直接書く。** フォーマットは小さく、隠れたものが
  ない。基本型は 8 つ、プロパティには名前があり、座標は生の数値のままだ。だから AI は
  `.jis` を直接書けるし、200 ノードのグラフやアイソメトリックの格子のように、手で
  置くより計算した方が早いものはスクリプトで生成できる。書き方はどちらも文書化して
  あり、ツール向けには作図ガイド、ファイル向けにはフォーマットリファレンスがある。
- **「できた」と言う前に確かめる。** `validate` / `diagnose` / `measure` は Node 上で
  ヘッドレスに動き、使うのはエディタと同じレイアウトエンジンだ。スキーマ違反、
  パースエラー、図形からはみ出したテキストを検出し、キャンバスをキャプチャして目で
  確かめることもできる。AI が受け取るのは、エディタが人に示すのと同じ指摘である。
- **人と AI が、同じファイルを同時に開ける。** AI が書くファイルにローカルのビューアが
  追随し、そこで人が図形を動かせば書き戻される。AI が次にファイルを読んだときには、
  人の手が入った状態になっている。同じファイルへの書き込みは直列化され、AI の
  `undo` が人の編集を巻き戻すことはない。
- **フォーマットは推測ではなく、仕様に書いてある。** JSON Schema と自動生成の
  リファレンスが図形セットと一緒に配布され、Claude Code のスキルも同じ図形
  マニフェストから生成される。AI に伝えている図形セットと、実際に存在する図形
  セットがずれることはない。

## はじめる

### AI から使う

stdio 対応の MCP クライアントに、次の設定でサーバーを登録する:

```jsonc
{
	"mcpServers": {
		"jiscribe": { "command": "npx", "args": ["-y", "jiscribe-mcp"] },
	},
}
```

必要なのは Node 22 以降だけ。npm パッケージ
[`jiscribe-mcp`](https://www.npmjs.com/package/jiscribe-mcp) に、サーバー・
ビューア・テキスト計測用のフォントがすべて入っている。ツールの一覧とビューアの
挙動は [`apps/mcp`](./apps/mcp) を参照。

Claude Code なら、プラグインを入れるだけでこの登録が済み、図形セットから生成した
作図スキルも付いてくる:

```text
/plugin marketplace add gznnk/jiscribe
/plugin install jiscribe
```

### エディタで使う

[Jiscribe for VSCode](https://marketplace.visualstudio.com/items?itemName=gznnk.jiscribe)
は `.jis` / `.jis.png` / `.jis.svg` をコードの隣で編集できるキャンバスとして開き、
診断結果を Problems パネルに表示する。MCP サーバーと併用すると、AI が diagnose・
measure・capture で自分の描いたものを確かめながら描き進め、人はファイルが形に
なっていく様子を VSCode で眺めていられる。

何もインストールせずに手で描いてみたいだけなら、[Jiscribe Web](https://app.jiscribe.dev/)
でブラウザにキャンバスを開ける。アカウントもアップロードも不要で、ファイルは
手元のマシンから出ない。

## エンジンを組み込む（npm 未公開）

パッケージ本体はまだ npm に公開していない。`@jiscribe/canvas` などは組み込み向けの
API を整えている段階で、公開 API は今後変わる可能性がある。初回公開は GitHub
Release として行うので、通知が欲しければこのリポジトリを Watch（Custom →
Releases）しておくとよい。現時点の API はこういう形だ。

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";

const doc: CanvasDoc = { version: 1, root: [] };

export function App() {
	return <Canvas doc={doc} />;
}
```

基本型以外の図形はプラグインが持ち、キャンバスごとに登録する。

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasConfig } from "@jiscribe/canvas";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { umlPlugin } from "@jiscribe/plugin-uml-shapes";

const config: CanvasConfig = { plugins: [flowchartPlugin, umlPlugin] };

export function App() {
	return <Canvas doc={doc} initialConfig={config} />;
}
```

**ドキュメント層は `@jiscribe/doc` という独立したパッケージ**になっている。React にも
DOM にも依存せずに `CanvasDoc` の解析・検証・編集・計測ができる層で、VSCode 拡張の
診断機能も CLI も AI 向けツールも、すべてこの層の上に作られている。キャンバスは
要らず文書だけ扱いたいなら、このパッケージだけを使えばよい。

## 全体の構成

| パッケージ                   | 内容                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@jiscribe/canvas`           | エンジン本体。描画、ジェスチャー、コマンド、状態                                                              |
| `@jiscribe/doc`              | ヘッドレスなドキュメント層。`CanvasDoc` モデル・パーサー・編集 ops・`.jis.*` の入出力                         |
| `@jiscribe/canvas-sdk`       | プラグイン作者向けの図形オーサリングキット。canvas の公開 API だけで書かれている                              |
| `@jiscribe/geometry`         | 幾何型と幾何計算（矩形、楕円、変換、交差判定）                                                                |
| `@jiscribe/markdown`         | Markdown 図形が使う Markdown レンダリング                                                                     |
| `@jiscribe/basic-validators` | 基本的な実行時バリデーター                                                                                    |
| `@jiscribe/utility-types`    | 共有の TypeScript ユーティリティ型                                                                            |
| `@jiscribe/doc-schema`       | 標準図形セットから生成した JSON Schema・AI 向けリファレンス・Claude Code スキル                               |
| `@jiscribe/ai-tools`         | AI が呼べるキャンバスツールの宣言（トランスポート非依存）と、その適用                                         |
| `@jiscribe/standard-shapes`  | 標準図形セットを全ホスト向けに 1 か所で束ねたもの（doc 面 / presentation 面の 2 エントリ）                    |
| `@jiscribe/doc-tools`        | 標準図形セットに対する検証・計測・診断（Node 計測バックエンド込み）                                           |
| `plugins/*`                  | 標準図形セットの実体 — flowchart、UML、container、general、annotation、sticky、markdown、Lucide アイコン、AWS |
| `apps/canvas-examples`       | 統合サンプル（1 サンプル = 1 ファイル）                                                                       |
| `apps/cli`                   | `jiscribe` コマンド。validate / diagnose / measure / render / preview                                         |
| `apps/mcp`                   | MCP サーバー。stdio でツールを提供し、ローカルにキャンバスビューアを立てる                                    |
| `apps/claude-plugin`         | Claude Code プラグイン。MCP サーバーと、自動生成の作図スキル                                                  |
| `apps/vscode-extension`      | Jiscribe の VSCode 拡張                                                                                       |

`plugins/` ディレクトリは意図的に*外部*として扱っている。これらのパッケージは
`@jiscribe/canvas`・`@jiscribe/doc`・`@jiscribe/canvas-sdk` の公開 API しか使えず、
ESLint がそれを強制している。標準の図形がその制約の中で書けているのだから、
あなたの図形も書ける。

## 開発

```bash
pnpm install

pnpm dev:examples      # サンプルギャラリーを起動
pnpm build:examples    # サンプルギャラリーをビルド
pnpm build:vscode      # VSCode 拡張をビルド
pnpm build:mcp         # MCP サーバーとビューアをビルド
pnpm build:cli         # jiscribe コマンドをビルド

pnpm lint              # ワークスペース全体の ESLint
pnpm typecheck         # ワークスペース全体の TypeScript
pnpm dep:check         # 循環依存チェック（madge）
pnpm format            # Prettier
pnpm test              # ユニットテスト（vitest）
pnpm test:e2e          # Playwright の全スイート（コア・各プラグイン・同居検証）
```

必要環境: Node.js 22+ と pnpm 11。

エンジンの設計ドキュメントは
[`packages/canvas/docs/`](./packages/canvas/docs/README.ja.md) にある。設計思想、
アーキテクチャ、データモデル、ジェスチャーシステム、コマンドシステム、状態更新フロー、
外部同期、テーマ、テスト、スタイルプロパティ、図形設計、プラグインアーキテクチャ、
プラグイン作成の全 13 本。英語版は同じ場所に `*.md` として並んでいる。

## コントリビュート

**Issue は歓迎する。Pull Request は事前に合意したものだけ受け付ける** — まず Issue を
立て、「その変更を入れたい」という返答を待ってから作業に入ってほしい。その理由と、
マージまでに必要なその他のことは
[CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md#コントリビュートの受け付け方) にまとめてある。

コード内コメントの多くと設計ドキュメントの一部は日本語で書いてある。Issue と
Pull Request は日本語でも英語でも構わない。

## 同梱している第三者の素材

AWS 図形セット（`plugins/aws-shapes`）は **AWS Architecture Icons** の図を同梱して
いる。これらは Amazon Web Services, Inc. またはその関連会社の著作物で、**下記の
MIT ライセンスの対象外**である。AWS の利用条件に基づき、無改変・帰属表示付きで
再配布しているものなので、改変は許されない。詳細は
[`plugins/aws-shapes/LICENSE-ICONS.md`](./plugins/aws-shapes/LICENSE-ICONS.md)。

## ライセンス

[MIT](./LICENSE) © gznnk
