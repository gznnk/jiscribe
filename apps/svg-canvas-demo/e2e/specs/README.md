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
└── ui/                # UI パネル・ツールバー操作
    └── object-menu.spec.ts # ObjectMenu によるスタイル設定
```

## 分類の考え方

| フォルダ   | 対象                           | 追加するテストの例                                                                         |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| ルート     | 横断的な起動・基本動作         | ―                                                                                          |
| `shapes/`  | SVG 図形の生成・変換・接続     | `transform.spec.ts`（移動・リサイズ・回転）、`group.spec.ts`（グループ化）、`path.spec.ts` |
| `editing/` | 図形内コンテンツの編集         | `copy-paste.spec.ts`、`undo-redo.spec.ts`                                                  |
| `ui/`      | ツールバー・パネルなど UI 操作 | `toolbar.spec.ts`、`keyboard-shortcuts.spec.ts`                                            |

## ファイル分割の目安

1 ファイルのテスト数が 20〜30 を超えたら、機能単位でファイルを分割する。
