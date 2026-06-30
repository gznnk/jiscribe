# States

アプリケーション実行時のインメモリデータ構造（State）を管理するディレクトリです。
永続化用の `schemas` と対になる構造を持ちますが、レンダリングや操作のパフォーマンス・利便性のために最適化されています。

## Architecture & Design

基本的な設計思想（Type Composition, Branded Types, ObjectFeatures）については、[Schemas README](../schemas/README.md) を参照してください。

**主な違い:**

- **Utility**: `CreateObjectType` の代わりに `CreateObjectState` を使用します。
- **Geometry**: 多くの形状は、実行時にはバウンディングボックス情報を含む `Frame` (x, y, width, height) として扱われます。
- **Transform**: `TransformDoc` (rotation, flip) の代わりに、計算済みの状態に近い `Transform` (rotation, scaleX, scaleY) を持ちます。

## Directory Structure

| Directory        | Description                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `canvas/`        | キャンバス全体の実行時状態 (`CanvasState`) と、Doc との変換 (`CanvasMapper`) を定義します。                     |
| `objects/`       | 個別のオブジェクト State 定義と、Doc⇔State 変換マッパー (`XxxMapper`)。`schemas` と対称的な構造です。           |
| `objects/types/` | State 型を合成するユーティリティ (`CreateObjectState`) です。列挙型は `schemas/objects/types/` を再利用します。 |
| `objects/utils/` | State の検証を支援するランタイムヘルパ (`validateStateUtils` 等) です。                                         |
| `utils/`         | オブジェクト横断の実行時ジオメトリ計算 (`calculateGroupOrientedBounds` 等) です。                               |
| `registry/`      | 型ごとの Mapper・State バリデータのレジストリです（登録方法は後述）。                                           |

## Registry の初期化

`registry/` の各レジストリ（`ObjectMapperRegistry` / `ObjectStateValidatorRegistry`）は、`controllers/setup/initializeObjectRegistry.ts` の `registerObject()` が、presentations / gestures / menu など他のレジストリと**一括で登録**します。State 側に専用の初期化ファイルは持ちません（`schemas` の doc バリデータのみ、parse 時の遅延初期化のため `schemas/registry/` 内に init を持つ点と非対称）。

## Usage Example

`schemas` で定義された `ObjectFeatures` を再利用して State 型を生成します。

```typescript
// Example: RectState.ts
import type { RectFeatures } from "../../../../schemas/objects/primitives/rect/RectDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectStateBrand: unique symbol;

export type RectState = CreateObjectState<
	typeof RectFeatures,
	typeof RectStateBrand
>;
```
