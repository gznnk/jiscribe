# アーキテクチャレビュー（2026-05-06）

`packages/svg-canvas-2` のソースコードをアーキテクチャドキュメント（`architecture.md`）に照らしてレビューした結果をまとめます。

---

## 1. `states → controllers` 依存（Critical）

### 概要

`architecture.md` で明示的に禁止されている方向の依存が存在します。

### 違反箇所

```
states/canvas/CanvasMapper.ts
  └─ import { updateGroupBounds } from "../../controllers/ui/utils/updateGroupBounds"
```

### 問題

`updateGroupBounds` はグループのバウンディングボックスを再計算する純粋な関数であり、UI 描画への依存は持ちません。しかし `controllers/ui/utils/` に配置されているため、データ層（`states/`）がロジック層（`controllers/`）に依存する構造になっています。

### 修正方針

`updateGroupBounds` および `calculateGroupOrientedBounds` を `controllers/ui/utils/` から切り出し、`states/` 内または `controllers/utils/` に移動する。その上で `CanvasMapper` がそこからインポートするよう変更する。

---

## 2. `states ↔ registry` の循環依存（Significant）

### 概要

アーキテクチャが想定する依存方向は `registry → states` の一方向ですが、逆方向の依存が存在し循環しています。

### 違反箇所

```
registry/ObjectRegistryTypes.ts → states/（許可: registry → states）

↑ 逆方向（禁止）

states/objects/primitives/rect/RectMapper.ts
  └─ import { DocToStateMapper, StateToDocMapper } from "../../../../registry/ObjectRegistryTypes"
states/objects/primitives/ellipse/EllipseMapper.ts
  └─ import { ... } from "../../../../registry/ObjectRegistryTypes"
states/objects/primitives/group/GroupMapper.ts        (同上)
states/objects/primitives/polygon/PolygonMapper.ts    (同上)
states/objects/primitives/polyline/PolylineMapper.ts  (同上)
states/objects/connections/connector/ConnectorMapper.ts (同上)
states/objects/annotations/sticky/StickyMapper.ts     (同上)
states/canvas/CanvasMapper.ts
  └─ import { objectRegistry } from "../../registry/ObjectRegistry"
```

### 問題

各 `*Mapper.ts` が `DocToStateMapper` / `StateToDocMapper` 型を `registry/ObjectRegistryTypes.ts` から参照しているため、状態定義層が Registry 層に依存しています。

### 修正方針

`DocToStateMapper` / `StateToDocMapper` 型を `states/objects/base/MapperTypes.ts` などに移動し、`registry/ObjectRegistryTypes.ts` がそこからインポートするよう変更する。`CanvasMapper` の `objectRegistry` 利用については、Registry 経由での変換という現設計の核心部分であるため、依存方向のルール自体を「`states/canvas/` のみ `registry` 参照可」と明文化するか、変換処理を `controllers/` に移動するかを設計判断する。

---

## 3. `registry ↔ controllers` の循環依存（Significant）

### 概要

アーキテクチャが想定する依存方向は `controllers → registry` の一方向ですが、逆方向の依存が存在し循環しています。

### 違反箇所

```
controllers/（許可: controllers → registry）

↑ 逆方向（禁止）

registry/GestureHandlerRegistry.ts
  └─ import type { CanvasControllerState } from "../controllers/CanvasTypes"
registry/GestureHandlerRegistryTypes.ts
  └─ import type { CanvasControllerState } from "../controllers/CanvasTypes"
  └─ import type { ... } from "../controllers/gestures/recognizer/GestureRecognizerTypes"
registry/ObjectRegistryTypes.ts
  └─ import type { ObjectMenuConfig } from "../controllers/ui/menu/ObjectMenu/types/ObjectMenuConfig"
```

### 問題

根本原因は `CanvasControllerState` が `controllers/CanvasTypes.ts` に定義されており、Registry がそれを参照している点です。`GestureHandlerRegistry` 自体が Controller 層の概念を内包しているため、現状は `registry/` として独立する根拠が薄い状態です。

### 修正方針（いずれかを選択）

**案 A**: `CanvasControllerState` を `states/canvas/CanvasControllerState.ts` に移動し、`controllers/CanvasTypes.ts` はそこを re-export するだけにする。これにより `registry` から `controllers` への依存が解消される。

**案 B**: `GestureHandlerRegistry` を `controllers/gestures/` 配下に移動し、`registry/` は `ObjectRegistry` のみを持つシンプルな構成にする。

---

## 4. `presentations/` に置かれた非描画ロジック（Moderate）

### 概要

描画を行わない純粋な計算関数が `presentations/` 配下に置かれており、`controllers/` からもインポートされています。

### 違反箇所

```
controllers/utils/cleanupConnectorsOnDelete.ts
  └─ import { resolveEndpoint } from "../../presentations/layers/content/utils/resolveEndpoint"
  └─ import { resolveConnectorPoints } from "../../presentations/layers/content/utils/resolveConnectorPoints"
```

`resolveEndpoint` と `resolveConnectorPoints` はどちらも `EndpointRef` → `Point` を解決する純粋関数で、SVG の描画処理は一切行いません。しかしコネクターの描画コンポーネントからも参照されているため `presentations/` に置かれた経緯があります。

### 問題

- `controllers/` が `presentations/` に依存しており、禁止依存ではないものの `presentations` の責務（純粋な描画）を逸脱した関数が混在している
- `controllers/` と `presentations/` の両方から参照される関数の置き場所が曖昧

### 修正方針

`resolveEndpoint` / `resolveConnectorPoints` を `states/objects/connections/connector/utils/` または `controllers/utils/connector/` に移動する。`presentations/` 側では移動先からインポートするよう変更する。

---

## 5. ドキュメントと実装の差異（Minor）

`architecture.md` が記述した構造と実際の実装が食い違っている箇所です（アーキテクチャ違反ではなく整合性の問題）。

| ドキュメントの記載 | 実際の実装 |
|---|---|
| `primitives/RectEventHandler.ts` など per-shape な EventHandler が存在 | 統合済みの単一 `ObjectEventHandler.ts` に変更されている |
| `presentations/controls/` にコントロール UI を配置 | 存在せず `controllers/ui/controls/` に実装されている |
| 記載なし | `presentations/objects/arrows/`（矢印 UI）が追加されている |
| 記載なし | `presentations/objects/base/TextOverlay/` が追加されている |
| 記載なし | ルートに `SvgCanvas2.tsx` が存在する |
| 記載なし | `schemas/objects/types/` フォルダが存在する |

また `controllers/ui/controls/TransformControls/TransformControls.tsx` のコメントには "pure presentation component" と記載されているが、`controllers/ui/` に置かれている。純粋描画コンポーネントであれば `presentations/controls/` に移動することを検討する。

---

## 優先度まとめ

| # | 内容 | 優先度 |
|---|---|---|
| 1 | `states → controllers` 依存（`CanvasMapper` → `updateGroupBounds`） | Critical |
| 2 | `states ↔ registry` 循環依存（Mapper 型の配置問題） | Significant |
| 3 | `registry ↔ controllers` 循環依存（`CanvasControllerState` の配置問題） | Significant |
| 4 | `resolveEndpoint` / `resolveConnectorPoints` が `presentations/` に置かれている | Moderate |
| 5 | ドキュメントと実装の差異 | Minor |
