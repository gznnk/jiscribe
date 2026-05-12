# Jiscribe

<!-- TODO: ヒーロー画像（エディタのスクリーンショット全景）を追加 -->
<!-- ![Jiscribe Canvas Editor](./images/hero.png) -->

**VSCode で `.jis.json` ファイルをビジュアルなキャンバスエディタとして開く拡張機能。**  
テキストエディタでは扱いづらい図形・接続線・グループのデータを、直感的な SVG キャンバス上で編集できます。

---

## 機能

<!-- TODO: 各機能のスクリーンショットを追加 -->
<!-- ![図形の編集](./images/feature-shapes.png) -->

- **ビジュアル編集** — 矩形・楕円・ポリライン・ポリゴン・グループをキャンバス上でドラッグ＆ドロップ
- **接続線** — 図形間にコネクターを引き、矢印種別を変更可能
- **リアルタイム同期** — キャンバスの変更は即座に `.jis.json` ファイルへ書き戻し。テキストエディタで直接編集した場合も即座にキャンバスへ反映
- **バリデーション** — JSON 構文エラーや重複 ID・不正な参照を Problems パネルに表示
- **JSON スキーマ補完** — テキストエディタで手書きする場合も、VSCode の補完とバリデーションが効く

---

## 使い方

1. `.jis.json` 拡張子のファイルを作成またはプロジェクト内のファイルを開く
2. VSCode が自動的に Jiscribe Canvas Editor で表示する
3. キャンバス上で図形を編集すると、ファイルが自動的に更新される

> テキストエディタで直接開きたい場合は、タブを右クリックして「Open With... → テキストエディタ」を選択してください。

---

## ファイル形式

`.jis.json` は SVG キャンバスのデータを JSON で表現したフォーマットです。

### トップレベル構造

```json
{
  "root": [],
  "connectors": []
}
```

| フィールド   | 型               | 必須 | 説明                                     |
| ------------ | ---------------- | ---- | ---------------------------------------- |
| `root`       | `ObjectDoc[]`    | ✅   | キャンバス上の全オブジェクト（ネスト可） |
| `connectors` | `ConnectorDoc[]` | ✅   | 図形間を結ぶ接続線                       |

### オブジェクト種別

| `type`     | 説明                 | 主なプロパティ              |
| ---------- | -------------------- | --------------------------- |
| `rect`     | 矩形                 | `x`, `y`, `width`, `height` |
| `ellipse`  | 楕円                 | `cx`, `cy`, `rx`, `ry`      |
| `polyline` | 折れ線（開いたパス） | `points`                    |
| `polygon`  | 多角形（閉じたパス） | `points`                    |
| `group`    | グループ             | `children`                  |

コネクターは `connectors` 配列に `type: "connector"` として置きます。

### サンプル

矩形・楕円・接続線（矢印）を含む最小構成のファイルです。

```json
{
  "root": [
    {
      "id": "start",
      "type": "rect",
      "x": 50,
      "y": 100,
      "width": 160,
      "height": 80,
      "fill": "#E3F2FD",
      "stroke": "#1565C0",
      "strokeWidth": 2,
      "rx": 8,
      "text": "開始",
      "textAlign": "center",
      "verticalAlign": "center",
      "fontColor": "#1565C0",
      "fontSize": 16
    },
    {
      "id": "process",
      "type": "ellipse",
      "cx": 380,
      "cy": 140,
      "rx": 80,
      "ry": 40,
      "fill": "#F3E5F5",
      "stroke": "#6A1B9A",
      "strokeWidth": 2,
      "text": "処理",
      "textAlign": "center",
      "verticalAlign": "center",
      "fontColor": "#6A1B9A",
      "fontSize": 14
    }
  ],
  "connectors": [
    {
      "id": "conn-1",
      "type": "connector",
      "points": [
        { "x": 210, "y": 140 },
        { "x": 300, "y": 140 }
      ],
      "source": {
        "owner": { "type": "rect", "id": "start" },
        "anchor": { "kind": "connectPoint", "id": "rightCenter" }
      },
      "target": {
        "owner": { "type": "ellipse", "id": "process" },
        "anchor": { "kind": "connectPoint", "id": "leftCenter" }
      },
      "stroke": "#374151",
      "strokeWidth": 2,
      "startArrow": "None",
      "endArrow": "FilledTriangle"
    }
  ]
}
```

すべてのプロパティ・型の詳細は [CanvasDoc リファレンス](#TODO-canvas-doc-reference) を参照してください。

---

## リファレンス

> ドキュメントサイトは準備中です。

<!-- TODO: ドキュメントサイト公開後にURLを差し替える -->

| ドキュメント                  | URL                              |
| ----------------------------- | -------------------------------- |
| CanvasDoc フォーマット全体    | `https://jiscribe.dev/docs/canvas-doc` |
| ObjectDoc（図形の共通フィールド） | `https://jiscribe.dev/docs/object-doc` |
| RectDoc（矩形）               | `https://jiscribe.dev/docs/rect` |
| EllipseDoc（楕円）            | `https://jiscribe.dev/docs/ellipse` |
| PolylineDoc（折れ線）         | `https://jiscribe.dev/docs/polyline` |
| PolygonDoc（多角形）          | `https://jiscribe.dev/docs/polygon` |
| GroupDoc（グループ）          | `https://jiscribe.dev/docs/group` |
| ConnectorDoc（接続線）        | `https://jiscribe.dev/docs/connector` |
| EndpointRef（接続先の指定）   | `https://jiscribe.dev/docs/endpoint-ref` |
| ArrowType（矢印種別）         | `https://jiscribe.dev/docs/arrow-type` |
| StrokeDashType（線種）        | `https://jiscribe.dev/docs/stroke-dash-type` |
| TextType（テキスト形式）      | `https://jiscribe.dev/docs/text-type` |

---

## 開発者向け

### ビルド

```bash
# リポジトリルートから
pnpm --filter jiscribe-beta build

# 監視モード
pnpm --filter jiscribe-beta watch
```

### デバッグ実行

1. VSCode でこのリポジトリを開く
2. `F5` を押して拡張機能開発ホストを起動
3. `.jis.json` ファイルを開いてテスト

### トラブルシューティング

**拡張機能が起動しない**
- `pnpm install` で依存関係を更新
- `pnpm --filter jiscribe-beta build` で再ビルド
- VSCode / 拡張機能開発ホストを再起動

---

## ライセンス

UNLICENSED — 現在非公開ライセンスです。
