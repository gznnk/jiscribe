# Jiscribe AI オーサリングガイド

`.jis.json`（`CanvasDoc`）を **AI が生成・編集するための短い実践ガイド**。
網羅的な仕様は [`reference.md`](./reference.md) を参照。このファイルは「正しく書くために最低限守ること」に絞る。

---

## 1. 座標系（最初に必ず把握）

- キャンバスは**無限平面**。座標は SVG 規約で、**x は右、y は下に増える**（数学と逆＝画面座標系）。単位は **px**。
- 座標値は任意（**負の値も可**）。「原点 (0,0) が画面左上に固定」ではない（ビューはパン・ズームする）。
- 図形ごとに基準点が違う: **rect は左上角 `(x, y)`**、**ellipse は中心 `(cx, cy)`**（→ §4）。
- 重なり順（z 順）は **`root` 配列の順**＝後ろの要素ほど前面。重ねること自体は可。
- 自動レイアウトはない。座標は自分で計算して決める（配置の指針は → §5）。

## 2. 最小構造

トップレベルは必ず `version` / `root` / `connectors` を持つ（配列は空でも置く）。

```json
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [],
	"connectors": []
}
```

- `version`: **必須。常に `1`**（このフォーマット版の固定値）。
- `$schema`: 省略可だが**推奨**（エディタ補完・検証が効く）。
- `root`: 図形（rect / ellipse / polyline / polygon / group / sticky）の配列。
- `connectors`: 接続線の配列。**connector は必ずここに置く（`root` には入れない）**。

## 3. MUST / MUST NOT（違反すると壊れる）

**MUST**

- トップレベルに **`version: 1`** を含める（必須・固定値）。
- すべてのオブジェクトに **一意の `id`** と **`type`** を付ける。
- `rect` は `x`,`y`（左上）+ `width`,`height`。`ellipse` は `cx`,`cy`（中心）+ `rx`,`ry`（半径）。
- `connector` は `connectors` 配列に置き、端点は `source` / `target`（EndpointRef）で表す。
- 直線の connector は `points` を **空配列** `[]` にする。

**MUST NOT**

- connector の `points` に **端点（始点・終点）の座標を入れない**。`points` は中間経由点のみ（通常は空配列）。
- `group` に `x`,`y`,`width`,`height` を付けない。位置は `children` の配置で決まる。
- 同じ `id` を 2 回使わない。
- `connector` を `root` に入れない。

## 4. オブジェクト早見表

| `type`                        | 必須幾何                      | 主なスタイル                                 |
| ----------------------------- | ----------------------------- | -------------------------------------------- |
| `rect`                        | `x`,`y`,`width`,`height`      | stroke / fill / text / `rx`(角丸) / rotation |
| `ellipse`                     | `cx`,`cy`,`rx`,`ry`           | stroke / fill / text / rotation              |
| `polyline`                    | `points`（開いた線）          | stroke / startArrow / endArrow               |
| `polygon`                     | `points`（自動で閉じる）      | stroke / fill                                |
| `group`                       | `children`                    | rotation / flipX / flipY                     |
| `connector`（`connectors`へ） | `source`,`target`,`points:[]` | stroke / startArrow / endArrow               |
| `sticky`                      | `x`,`y`,`width`,`height`      | fill / text（stroke・rx は無し）             |

**スタイル値**

- Stroke: `stroke`(色), `strokeWidth`(既定 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`
- Fill: `fill`（既定 `"transparent"`）
- Text（rect/ellipse のみ）: `text`, `textAlign`: `"left"`/`"center"`/`"right"`, `verticalAlign`: `"top"`/`"middle"`/`"bottom"`, `fontColor`, `fontSize`(既定 16)
- 矢印 `startArrow`/`endArrow`: `"None"` / `"FilledTriangle"`（標準矢印）/ `"OpenArrow"` / `"HollowTriangle"` / `"FilledDiamond"` / `"HollowDiamond"` / `"ConcaveTriangle"` / `"Circle"`

**connector の端点（EndpointRef）**

```json
"source": {
  "owner": { "type": "rect", "id": "node-a" },
  "anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

- `anchor.kind`: `"connectPoint"`（+ `id`）/ `"center"` / `"free"`（+ `point`）
- `connectPoint` の `id`: `"center"`/`"topCenter"`/`"rightCenter"`/`"bottomCenter"`/`"leftCenter"`
- オブジェクトに繋がない自由点は `{ "anchor": { "kind": "free", "point": { "x": 400, "y": 200 } } }`（`owner` を持たない）

## 5. レイアウト規約（読みやすく配置する）

これは仕様ではなく可読性のための指針。重なり自体は許容される（§1）。

- 標準ノード: `width: 160`, `height: 80`。
- ノード間の余白: 水平 **80〜120px**、垂直 **60〜100px**。
- フロー方向は左→右 or 上→下のどちらかに統一する。
- 接続の向きに合わせて connectPoint を選ぶ（左→右なら source=`rightCenter`, target=`leftCenter`）。

## 6. 完成例

### 例 A: 横並びフローチャート（rect 3 つ + 矢印）

```json
{
	"version": 1,
	"root": [
		{
			"id": "start",
			"type": "rect",
			"x": 40,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#E3F2FD",
			"stroke": "#1565C0",
			"strokeWidth": 2,
			"text": "開始",
			"fontColor": "#1565C0"
		},
		{
			"id": "process",
			"type": "rect",
			"x": 280,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#F3E5F5",
			"stroke": "#6A1B9A",
			"strokeWidth": 2,
			"text": "処理",
			"fontColor": "#6A1B9A"
		},
		{
			"id": "end",
			"type": "rect",
			"x": 520,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#E8F5E9",
			"stroke": "#2E7D32",
			"strokeWidth": 2,
			"text": "完了",
			"fontColor": "#2E7D32"
		}
	],
	"connectors": [
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "rect", "id": "start" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "leftCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		},
		{
			"id": "c2",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "rect", "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "end" },
				"anchor": { "kind": "connectPoint", "id": "leftCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		}
	]
}
```

### 例 B: 縦並び構成図（楕円ノード + グループ）

```json
{
	"version": 1,
	"root": [
		{
			"id": "client",
			"type": "ellipse",
			"cx": 200,
			"cy": 80,
			"rx": 90,
			"ry": 45,
			"fill": "#FFF3E0",
			"stroke": "#E65100",
			"strokeWidth": 2,
			"text": "クライアント",
			"fontColor": "#E65100"
		},
		{
			"id": "backend",
			"type": "group",
			"children": [
				{
					"id": "api",
					"type": "rect",
					"x": 120,
					"y": 220,
					"width": 160,
					"height": 70,
					"rx": 6,
					"fill": "#E3F2FD",
					"stroke": "#1565C0",
					"strokeWidth": 2,
					"text": "API",
					"fontColor": "#1565C0"
				},
				{
					"id": "db",
					"type": "rect",
					"x": 120,
					"y": 330,
					"width": 160,
					"height": 70,
					"rx": 6,
					"fill": "#ECEFF1",
					"stroke": "#37474F",
					"strokeWidth": 2,
					"text": "DB",
					"fontColor": "#37474F"
				}
			]
		}
	],
	"connectors": [
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "ellipse", "id": "client" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "api" },
				"anchor": { "kind": "connectPoint", "id": "topCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		},
		{
			"id": "c2",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "rect", "id": "api" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "db" },
				"anchor": { "kind": "connectPoint", "id": "topCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		}
	]
}
```

## 7. よくある間違い

- ❌ connector を `root` に入れる → ✅ `connectors` に入れる。
- ❌ connector の `points` に端点座標を入れる → ✅ `points: []`、端点は `source`/`target`。
- ❌ `group` に `x`/`y`/`width`/`height` を付ける → ✅ `children` の座標で位置を表す。
- ❌ `ellipse` に `x`/`y`/`width`/`height` を使う → ✅ `cx`/`cy`/`rx`/`ry`。
- ❌ 意図せず図形が重なる座標を出力 → ✅ §5 の余白規約で間隔を空ける（重ね自体は可）。
- ❌ `id` の重複 → ✅ すべて一意に。
