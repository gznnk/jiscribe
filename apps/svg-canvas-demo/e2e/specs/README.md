# E2E テスト構成

## フォルダ構造

```
specs/
├── README.md          # このファイル
├── smoke.spec.ts      # 起動確認・基本動作の横断テスト
├── shapes/            # 図形の描画・操作
│   ├── draw.spec.ts       # Rectangle / Ellipse / Polyline などの描画
│   └── connector.spec.ts  # アンカードラッグによる図形間の接続
├── editing/           # コンテンツ編集
│   └── text-edit.spec.ts  # テキスト入力・確定・キャンセル
├── ui/                # UI パネル・ツールバー操作
│   └── object-menu.spec.ts # ObjectMenu によるスタイル設定
└── scenario/          # 複数機能をまたぐエンドツーエンドのユーザー操作フロー
    ├── buildDiagram.ts        # 既存操作を合成する「図づくり DSL」
    ├── wireframe.spec.ts      # ログイン画面のワイヤーフレーム
    └── screen-flow.spec.ts    # 画面遷移図
```

> マーケ素材生成用のデモ（hero-showcase.jis.json の再現）は回帰テストではないため、
> `specs/` の外（`e2e/demo/`）に分離している。詳細は `e2e/README.md` を参照。

## 分類の考え方

| フォルダ    | 対象                                      | 追加するテストの例                                                                         |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| ルート      | 横断的な起動・基本動作                    | ―                                                                                          |
| `shapes/`   | SVG 図形の生成・変換・接続                | `transform.spec.ts`（移動・リサイズ・回転）、`group.spec.ts`（グループ化）、`path.spec.ts` |
| `editing/`  | 図形内コンテンツの編集                    | `copy-paste.spec.ts`、`undo-redo.spec.ts`                                                  |
| `ui/`       | ツールバー・パネルなど UI 操作            | `toolbar.spec.ts`、`keyboard-shortcuts.spec.ts`                                            |
| `scenario/` | 複数機能をまたぐ E2E のユーザー操作フロー | `wireframe.spec.ts`、`screen-flow.spec.ts`、`copy-paste-flow.spec.ts`                      |

`shapes/` `editing/` `ui/` は**機能ドメイン軸**（単一機能の検証）。`scenario/` は**粒度軸**で、複数機能を
またいだ一連のユーザー操作フローを検証する。単一機能で完結するものは各機能フォルダへ、図づくりのような
横断フローは `scenario/` へ置く（横断的な起動確認の `smoke.spec.ts` とは別物で、こちらは具体的な成果物を組み立てる）。

`scenario/` のテストは新しいプリミティブを足さず、CanvasDriver がすでに提供しテスト済みの操作を
`buildDiagram.ts` で合成して成果物を組み立てる。「個々の操作が緑なら、その組み合わせ（実利用シナリオ）も
自動で組み上がる」ことを示す位置づけ。

## ファイル分割の目安

1 ファイルのテスト数が 20〜30 を超えたら、機能単位でファイルを分割する。
