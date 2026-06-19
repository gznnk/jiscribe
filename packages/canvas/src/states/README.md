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

| Directory        | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `canvas/`        | キャンバス全体の実行時状態 (`CanvasState`) を定義します。              |
| `objects/`       | 個別のオブジェクトState定義。`schemas` と対称的な構造になっています。  |
| `objects/utils/` | State型定義を生成するためのユーティリティ (`CreateObjectState`) です。 |

## Usage Example

`schemas` で定義された `ObjectFeatures` を再利用して State 型を生成します。

```typescript
// Example: RectState.ts
import type { RectFeatures } from "../../../schemas/objects/primitives/RectDoc";
import type { CreateObjectState } from "../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectStateBrand: unique symbol;

export type RectState = CreateObjectState<
	typeof RectFeatures,
	typeof RectStateBrand
>;
```
