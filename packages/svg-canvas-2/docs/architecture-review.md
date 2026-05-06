# アーキテクチャレビュー（2026-05-06）

`packages/svg-canvas-2` のソースコードをアーキテクチャドキュメント（`architecture.md`）に照らしてレビューした結果をまとめます。

---

## 1. `states → controllers` 依存（Critical）✅ 対応済み

### 概要

`architecture.md` で明示的に禁止されている方向の依存が存在します。

### 違反箇所（修正前）

```
states/canvas/CanvasMapper.ts
  └─ import { updateGroupBounds } from "../../controllers/ui/utils/updateGroupBounds"
```

### 問題

`updateGroupBounds` はグループのバウンディングボックスを再計算する純粋な関数であり、UI 描画への依存は持ちません。しかし `controllers/ui/utils/` に配置されているため、データ層（`states/`）がロジック層（`controllers/`）に依存する構造になっています。

### 修正内容（2026-05-06）

`calculateGroupOrientedBounds` を `controllers/ui/utils/` から `states/utils/` に移動した。`CanvasMapper` は `updateGroupBounds` の代わりに `calculateGroupOrientedBounds` を `states/utils/` から直接インポートするよう変更し、`states → controllers` の依存を解消した。`updateGroupBounds` は `controllers/` に残置し、移動先からインポートするよう更新した。

---

## 2. `states ↔ registry` の循環依存（Significant）✅ 対応済み

### 概要

アーキテクチャが想定する依存方向は `registry → states` の一方向ですが、逆方向の依存が存在し循環していた。

### 違反箇所（修正前）

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

### 修正内容（2026-05-06）

**Mapper 型の移動**:
`DocToStateMapper` / `StateToDocMapper` / `ObjectMapperType` を `states/objects/base/MapperTypes.ts` に新設して定義した。各 `*Mapper.ts` は `registry/ObjectRegistryTypes` の代わりに `../../base/MapperTypes` からインポートするよう変更した。`registry/ObjectRegistryTypes.ts` は `ObjectMapperType` のみを `MapperTypes.ts` から直接 import して使用し、re-export は行わない形に整理した。

**`CanvasMapper` の例外明文化**:
`CanvasMapper.ts` が `objectRegistry` を利用して全オブジェクトの Doc↔State 変換を多態的に行う設計は本質的であり変更しない。代わりに `architecture.md` の Registry 層セクションに「`states/canvas/CanvasMapper.ts` のみ `registry/ObjectRegistry` を参照することを許容する」旨を明文化した。

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

## 5. ドキュメントと実装の差異（Minor）✅ 対応済み

`architecture.md` の構造ツリーおよび関連記述を実装に合わせて修正した。

| 修正内容 |
|---|
| `primitives/*EventHandler.ts` の per-shape 記載を削除し、統合済みの `ObjectEventHandler.ts` / `ConnectorEventHandler.ts` に更新 |
| `presentations/controls/` の記載を削除し、`controllers/ui/controls/` 配下の実際の構成を反映 |
| `presentations/objects/arrows/`（矢印UI）を追加 |
| `presentations/objects/base/TextOverlay/` を追加 |
| ルートの `SvgCanvas2.tsx` を追加 |
| `schemas/objects/types/` フォルダを追加 |
| `states/objects/base/MapperTypes.ts` を追加 |
| 新しい形状の追加手順から廃止済みの `NewShapeEventHandler.ts` ステップを削除 |
| `TransformControls.tsx` の「pure presentation component」コメントを修正 |

---

## 優先度まとめ

| # | 内容 | 優先度 |
|---|---|---|
| 1 | `states → controllers` 依存（`CanvasMapper` → `updateGroupBounds`） | Critical ✅ |
| 2 | `states ↔ registry` 循環依存（Mapper 型の配置問題） | Significant ✅ |
| 3 | `registry ↔ controllers` 循環依存（`CanvasControllerState` の配置問題） | Significant |
| 4 | `resolveEndpoint` / `resolveConnectorPoints` が `presentations/` に置かれている | Moderate |
| 5 | ドキュメントと実装の差異 | Minor ✅ |
