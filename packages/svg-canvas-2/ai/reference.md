# Jiscribe ドキュメント形式リファレンス（`.jis.json`）

**Jiscribe** の `.jis.json` ドキュメント形式の仕様書です。
AI がデータを生成する際や、外部ツールから `.jis.json` ファイルを生成する際の参照用として使用してください。
（要点をまとめた実践ガイドは [`ai-guide.md`](./ai-guide.md) を参照）

---

## トップレベル構造

```json
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [
		/* ObjectDoc の配列 */
	],
	"connectors": [
		/* ConnectorDoc の配列 */
	]
}
```

| フィールド   | 型               | 必須 | 説明                                                   |
| ------------ | ---------------- | ---- | ------------------------------------------------------ |
| `version`    | `1`              | ✅   | スキーマ版。常に `1`（固定値）                         |
| `$schema`    | `string`         | -    | スキーマ URL（推奨。エディタ補完・検証が効く）         |
| `root`       | `ObjectDoc[]`    | ✅   | キャンバス上の全オブジェクト（グループのネストも含む） |
| `connectors` | `ConnectorDoc[]` | ✅   | 接続線（コネクター）                                   |

---

## ObjectDoc の共通フィールド

すべてのオブジェクトが持つ基底フィールド。

| フィールド | 型       | 必須 | 説明                                           |
| ---------- | -------- | ---- | ---------------------------------------------- |
| `id`       | `string` | ✅   | ドキュメント内で一意の識別子                   |
| `type`     | `string` | ✅   | オブジェクト種別（後述）                       |
| `meta`     | `object` | -    | 任意のメタデータ（`name`, `description` など） |

### MetaDoc（`meta` フィールド）

```json
{
	"meta": {
		"name": "メインタイトル",
		"description": "このオブジェクトの説明"
	}
}
```

`meta` には `name`・`description` の他、任意のキーを追加できます。

---

## オブジェクト種別一覧

| `type`      | 説明                          | 幾何プロパティ              | スタイル                              |
| ----------- | ----------------------------- | --------------------------- | ------------------------------------- |
| `rect`      | 矩形                          | `x`, `y`, `width`, `height` | Stroke, Fill, Text, Transform, Radius |
| `ellipse`   | 楕円                          | `cx`, `cy`, `rx`, `ry`      | Stroke, Fill, Text, Transform         |
| `polyline`  | 折れ線（開いたパス）          | `points`                    | Stroke                                |
| `polygon`   | 多角形（閉じたパス）          | `points`                    | Stroke, Fill                          |
| `group`     | グループ（子を含む）          | なし                        | Transform                             |
| `connector` | 接続線（`connectors` に置く） | `points`                    | Stroke                                |
| `sticky`    | 付箋                          | `x`, `y`, `width`, `height` | Fill, Text, Transform（Stroke なし）  |

---

## 各オブジェクトの詳細

### `rect`（矩形）

```json
{
	"id": "rect-1",
	"type": "rect",
	"x": 100,
	"y": 100,
	"width": 200,
	"height": 120,
	"fill": "#4CAF50",
	"stroke": "#2E7D32",
	"strokeWidth": 2,
	"rx": 8,
	"text": "テキスト",
	"textType": "text",
	"textAlign": "center",
	"verticalAlign": "middle",
	"fontColor": "#000000",
	"fontSize": 16,
	"fontFamily": "Noto Sans JP",
	"fontWeight": "normal",
	"rotation": 0
}
```

| フィールド | 型       | デフォルト | 説明                      |
| ---------- | -------- | ---------- | ------------------------- |
| `x`        | `number` | `0`        | 左上頂点の X 座標         |
| `y`        | `number` | `0`        | 左上頂点の Y 座標         |
| `width`    | `number` | `100`      | 幅（px）                  |
| `height`   | `number` | `100`      | 高さ（px）                |
| `rx`       | `number` | `0`        | 角丸半径（SVG `rx` 属性） |

スタイルフィールドは [Stroke スタイル](#stroke-スタイル)・[Fill スタイル](#fill-スタイル)・[Text スタイル](#text-スタイル)・[Transform スタイル](#transform-スタイル) を参照。

---

### `ellipse`（楕円）

```json
{
	"id": "ellipse-1",
	"type": "ellipse",
	"cx": 300,
	"cy": 200,
	"rx": 100,
	"ry": 60,
	"fill": "#2196F3",
	"stroke": "#1565C0",
	"strokeWidth": 2
}
```

| フィールド | 型       | デフォルト | 説明               |
| ---------- | -------- | ---------- | ------------------ |
| `cx`       | `number` | `0`        | 中心の X 座標      |
| `cy`       | `number` | `0`        | 中心の Y 座標      |
| `rx`       | `number` | `50`       | 横方向の半径（px） |
| `ry`       | `number` | `50`       | 縦方向の半径（px） |

---

### `polyline`（折れ線）

```json
{
	"id": "polyline-1",
	"type": "polyline",
	"points": [
		{ "x": 100, "y": 100 },
		{ "x": 200, "y": 150 },
		{ "x": 300, "y": 100 }
	],
	"stroke": "#374151",
	"strokeWidth": 2,
	"startArrow": "None",
	"endArrow": "FilledTriangle"
}
```

| フィールド   | 型          | 必須 | 説明           |
| ------------ | ----------- | ---- | -------------- |
| `points`     | `Point[]`   | ✅   | 頂点座標の配列 |
| `startArrow` | `ArrowType` | -    | 始点の矢印種別 |
| `endArrow`   | `ArrowType` | -    | 終点の矢印種別 |

---

### `polygon`（多角形）

```json
{
	"id": "polygon-1",
	"type": "polygon",
	"points": [
		{ "x": 200, "y": 50 },
		{ "x": 350, "y": 200 },
		{ "x": 50, "y": 200 }
	],
	"fill": "#FFEB3B",
	"stroke": "#F57F17",
	"strokeWidth": 1
}
```

| フィールド | 型        | 必須 | 説明                                 |
| ---------- | --------- | ---- | ------------------------------------ |
| `points`   | `Point[]` | ✅   | 頂点座標の配列（自動的に閉じられる） |

---

### `group`（グループ）

```json
{
	"id": "group-1",
	"type": "group",
	"children": [
		{
			"id": "child-rect-1",
			"type": "rect",
			"x": 10,
			"y": 10,
			"width": 100,
			"height": 60,
			"fill": "#E3F2FD"
		}
	],
	"rotation": 45
}
```

| フィールド | 型            | 必須 | 説明                 |
| ---------- | ------------- | ---- | -------------------- |
| `children` | `ObjectDoc[]` | ✅   | 子オブジェクトの配列 |

グループ自身は位置・サイズを持たず、`children` の配置で決まります。
`rotation`・`flipX`・`flipY` は Transform スタイルとして指定できます。

---

### `sticky`（付箋）

付箋。幾何は `rect` と同じ（左上 `x`,`y` + `width`,`height`）だが、**Stroke と Radius は持たない**。
Fill・Text・Transform を持つ。

```json
{
	"id": "sticky-1",
	"type": "sticky",
	"x": 100,
	"y": 100,
	"width": 160,
	"height": 120,
	"fill": "#fef9c3",
	"text": "メモ",
	"textAlign": "center",
	"verticalAlign": "middle",
	"fontColor": "#000000",
	"fontSize": 14
}
```

| フィールド | 型       | デフォルト  | 説明              |
| ---------- | -------- | ----------- | ----------------- |
| `x`        | `number` | `0`         | 左上頂点の X 座標 |
| `y`        | `number` | `0`         | 左上頂点の Y 座標 |
| `width`    | `number` | `160`       | 幅（px）          |
| `height`   | `number` | `120`       | 高さ（px）        |
| `fill`     | `string` | `"#fef9c3"` | 背景色            |

Text スタイルの既定は他図形と一部異なる（`fontColor` は `"#000000"`、`fontSize` は `14`）。

---

## ConnectorDoc（接続線）

`connectors` 配列に置く接続線オブジェクト。

```json
{
	"id": "connector-1",
	"type": "connector",
	"points": [],
	"source": {
		"owner": { "type": "rect", "id": "rect-1" },
		"anchor": { "kind": "connectPoint", "id": "rightCenter" }
	},
	"target": {
		"owner": { "type": "ellipse", "id": "ellipse-1" },
		"anchor": { "kind": "connectPoint", "id": "leftCenter" }
	},
	"stroke": "#374151",
	"strokeWidth": 2,
	"startArrow": "None",
	"endArrow": "FilledTriangle"
}
```

| フィールド   | 型            | 必須 | 説明                                       |
| ------------ | ------------- | ---- | ------------------------------------------ |
| `points`     | `Point[]`     | ✅   | 中間経由点の座標配列（直線は空配列。後述） |
| `source`     | `EndpointRef` | ✅   | 始点の接続仕様                             |
| `target`     | `EndpointRef` | ✅   | 終点の接続仕様                             |
| `startArrow` | `ArrowType`   | -    | 始点の矢印種別                             |
| `endArrow`   | `ArrowType`   | -    | 終点の矢印種別                             |

`points` には**端点の座標を含めない**。端点は `source` / `target` の EndpointRef が正であり、
接続先オブジェクトの移動に合わせて描画時に動的解決される。`points` は source → target 順の
中間経由点（ワールド座標）のみを保持し、直線コネクターでは空配列にする
（経由点による変形は将来実装予定の機能で、現時点では描画に使用されない）。

### EndpointRef

接続先がオブジェクトに固定（`OwnedEndpointRef`）か、空間上の自由な点（`FreeEndpointRef`）かを選択します。

#### OwnedEndpointRef（オブジェクト接続）

```json
{
	"owner": { "type": "rect", "id": "rect-1" },
	"anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

`anchor.kind` の選択肢:

| `kind`           | 追加フィールド       | 説明                 |
| ---------------- | -------------------- | -------------------- |
| `"center"`       | なし                 | オブジェクトの中心   |
| `"connectPoint"` | `id: ConnectPointId` | 定義済み接続ポイント |

`ConnectPointId` の選択肢: `"center"` / `"topCenter"` / `"rightCenter"` / `"bottomCenter"` / `"leftCenter"`

#### FreeEndpointRef（フリーポイント接続）

```json
{
	"anchor": { "kind": "free", "point": { "x": 400, "y": 200 } }
}
```

`owner` フィールドを持たず、`anchor.kind` は必ず `"free"` です。

---

## 共通スタイルフィールド

### Stroke スタイル

`rect`, `ellipse`, `polyline`, `polygon`, `connector` に適用可能。

| フィールド       | 型               | デフォルト  | 説明                 |
| ---------------- | ---------------- | ----------- | -------------------- |
| `stroke`         | `string`         | `"#6b7280"` | 線の色（CSS カラー） |
| `strokeWidth`    | `number`         | `2`         | 線の太さ（px）       |
| `strokeDashType` | `StrokeDashType` | `"solid"`   | 線の破線パターン     |

`StrokeDashType`: `"solid"` / `"dashed"` / `"dotted"`

### Fill スタイル

`rect`, `ellipse`, `polygon`, `sticky` に適用可能。

| フィールド | 型       | デフォルト      | 説明                       |
| ---------- | -------- | --------------- | -------------------------- |
| `fill`     | `string` | `"transparent"` | 塗りつぶし色（CSS カラー） |

### Text スタイル

`rect`, `ellipse`, `sticky` に適用可能。

| フィールド      | 型              | デフォルト       | 説明                                          |
| --------------- | --------------- | ---------------- | --------------------------------------------- |
| `text`          | `string`        | `""`             | テキスト内容                                  |
| `textType`      | `TextType`      | `"text"`         | テキスト表示形式                              |
| `textAlign`     | `TextAlign`     | `"center"`       | 水平方向の文字揃え                            |
| `verticalAlign` | `VerticalAlign` | `"middle"`       | 垂直方向の文字揃え                            |
| `fontColor`     | `string`        | `"#6b7280"`      | 文字色（rect/ellipse。sticky は `"#000000"`） |
| `fontSize`      | `number`        | `16`             | フォントサイズ（px）                          |
| `fontFamily`    | `string`        | `"Noto Sans JP"` | フォントファミリー                            |
| `fontWeight`    | `string`        | `"normal"`       | フォントウェイト                              |

`TextType`: `"text"`（プレーンテキスト）/ `"markdown"`（Markdown レンダリング）

`TextAlign`: `"left"` / `"center"` / `"right"`

`VerticalAlign`: `"top"` / `"middle"` / `"bottom"`

### Transform スタイル

`rect`, `ellipse`, `group` に適用可能。すべて省略可能。

| フィールド        | 型        | デフォルト | 説明                             |
| ----------------- | --------- | ---------- | -------------------------------- |
| `rotation`        | `number`  | `0`        | 回転角度（度）                   |
| `flipX`           | `boolean` | `false`    | 水平方向の反転                   |
| `flipY`           | `boolean` | `false`    | 垂直方向の反転                   |
| `lockAspectRatio` | `boolean` | `false`    | アスペクト比ロック（リサイズ時） |

---

## ArrowType（矢印種別）

`polyline` と `connector` の `startArrow`・`endArrow` で使用。

| 値                  | 説明                             |
| ------------------- | -------------------------------- |
| `"None"`            | 矢印なし（デフォルト的な使い方） |
| `"FilledTriangle"`  | 塗りつぶし三角形（一般的な矢印） |
| `"ConcaveTriangle"` | くぼみ三角形                     |
| `"OpenArrow"`       | 開放型矢印（>）                  |
| `"HollowTriangle"`  | 中空三角形                       |
| `"FilledDiamond"`   | 塗りつぶしひし形（UML 集約）     |
| `"HollowDiamond"`   | 中空ひし形（UML 集約）           |
| `"Circle"`          | 円                               |

---

## 完全なサンプル

矩形・楕円・接続線を含む最小限のダイアグラム。

```json
{
	"version": 1,
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
			"verticalAlign": "middle",
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
			"verticalAlign": "middle",
			"fontColor": "#6A1B9A",
			"fontSize": 14
		}
	],
	"connectors": [
		{
			"id": "conn-1",
			"type": "connector",
			"points": [],
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

---

機械可読なスキーマ（JSON Schema）は `https://schema.jiscribe.dev/v1/jiscribe.schema.json` で公開されています。
