> 🌐 English version: [types.md](./types.md)

# 幾何型定義

`@workspace/geometry` が使う型システム。型は「基本値」「プリミティブ図形」
「変換」「変換済み図形」「計算結果」の 5 群に分かれる。

## 1. 基本値

### `Point`

2 次元空間の点。

```typescript
type Point = {
	x: number;
	y: number;
};
```

### `CenterPoint`

中心座標で表した点。`Frame` と `Ellipse` も同じ `cx` / `cy` の命名に揃えている。

```typescript
type CenterPoint = {
	cx: number;
	cy: number;
};
```

### `Dimensions`

```typescript
type Dimensions = {
	width: number;
	height: number;
};
```

### `BoundingBox`

4 辺の座標で表す軸平行バウンディングボックス（AABB）。

```typescript
type BoundingBox = {
	top: number;
	left: number;
	right: number;
	bottom: number;
};
```

## 2. プリミティブ図形

回転も反転も持たない純粋な幾何。他のすべての図形型はここから合成される。

### `Rect`

左上を基準点とする矩形。

```typescript
type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};
```

### `Frame`

中心を基準点とする矩形。このパッケージの計算はほとんどこの型を対象にする。

```typescript
type Frame = {
	cx: number;
	cy: number;
	width: number;
	height: number;
};
```

### `Ellipse`

中心を基準点とし、半径で寸法を持つ楕円。

```typescript
type Ellipse = {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
};
```

## 3. 変換

### `FlipScale`

軸反転フラグであって、一般的な拡大縮小係数ではない。定義域を `1 | -1` に絞る
ことで、この契約をコンパイラに強制させている。

```typescript
type FlipScale = 1 | -1;
```

### `Transform`

プリミティブに適用する回転と軸反転。

```typescript
type Transform = {
	rotation: number; // ラジアンではなく度数法
	scaleX: FlipScale; // 水平方向の反転
	scaleY: FlipScale; // 垂直方向の反転
};
```

間違えやすいのは次の 2 点。

- **`rotation` は度数法**。角度を直接受け取る関数はラジアンを使い引数名を
  `angleRad` にしているため、`Transform.rotation` を渡すときは
  `degreesToRadians` を挟む。
- **`scaleX` / `scaleY` は反転しかしない**。寸法は `width` / `height`
  （または `rx` / `ry`）が持ち、scale が図形を伸縮させることはない。一般 scale
  へ広げる場合の条件は
  [scale 契約](./naming-and-structure.ja.md#6-scale-契約) を参照。

## 4. 変換済み図形

プリミティブと `Transform` の合成。

```typescript
type TransformedRect = Rect & Transform;
type TransformedFrame = Frame & Transform;
type TransformedEllipse = Ellipse & Transform;
```

## 5. 計算結果

手で書くのではなく、計算関数が返す型。

### `BoxFeatures`

`BoundingBox` に中心と四隅を加えたもの。四隅は AABB の角であって回転後の図形
自身の頂点ではない点に注意（それが必要なら `calcFrameCornerPoints` を使う）。

```typescript
type BoxFeatures = BoundingBox & {
	center: Point;
	topLeft: Point;
	bottomLeft: Point;
	topRight: Point;
	bottomRight: Point;
};
```

### `KeyPoints`

図形上の 8 つの参照点（四隅と各辺の中点）。操作ハンドル・コネクタ端点・整列に
使う。

```typescript
type KeyPoints = {
	topLeft: Point;
	topCenter: Point;
	topRight: Point;
	rightCenter: Point;
	bottomRight: Point;
	bottomCenter: Point;
	bottomLeft: Point;
	leftCenter: Point;
};
```

### `KeyPointId`

`KeyPoints` のいずれか 1 点を指すキー。8 点すべてではなく 1 点だけを計算する
`calcFrameKeyPoint` が受け取る。

```typescript
type KeyPointId = keyof KeyPoints;
```

### `FrameKeyPoints`

フレームのキーポイント。現状は `KeyPoints` の別名。

```typescript
type FrameKeyPoints = KeyPoints;
```

## 6. 方向とインセット

### `OrthogonalDirection`

軸並行の方向。`snapToDirection` の返り値。

```typescript
type OrthogonalDirection = "up" | "down" | "left" | "right";
```

### `RatioInsets`

フレームの寸法に対する比率で表すインセット。`top` / `bottom` は高さ、
`left` / `right` は幅に対する比率で、省略した辺はインセットなし。比率なので、
インセット後の矩形はフレームのリサイズに追従する。

```typescript
type RatioInsets = {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
};
```

## 型の選び方

| 状況                                               | 使う型                                                      |
| -------------------------------------------------- | ----------------------------------------------------------- |
| 回転・反転が無関係、または正規化済みのデータ       | `Rect`, `Frame`, `Ellipse`                                  |
| ユーザーが操作する・描画する・回転する図形         | `TransformedRect`, `TransformedFrame`, `TransformedEllipse` |
| 軸平行な範囲、ヒットテスト、整列の基準点が要る場合 | `BoundingBox`, `BoxFeatures`, `KeyPoints`                   |

計算のほとんどは `Frame` / `TransformedFrame` を受け取る。`Rect` と `Ellipse`
は主に境界（SVG 属性、永続化されたドキュメント）に現れ、そこから `Frame` へは
`convert*` 関数で橋渡しする。

## バリデータ

実行時の型ガード。検証対象の型ごとに 1 つあり、いずれも `value is T` で絞り込み、
`null` と非オブジェクトを弾く。

| ガード                 | 補足                                            |
| ---------------------- | ----------------------------------------------- |
| `isPoint`              |                                                 |
| `isCenterPoint`        |                                                 |
| `isRect`               | `width` / `height` は非負であること             |
| `isFrame`              | `width` / `height` は非負であること             |
| `isEllipse`            | `rx` / `ry` は非負であること                    |
| `isFlipScale`          | 値が厳密に `1` または `-1` であること           |
| `isTransform`          | `scaleX` / `scaleY` は `isFlipScale` で検証する |
| `isTransformedRect`    | `isRect && isTransform`                         |
| `isTransformedFrame`   | `isFrame && isTransform`                        |
| `isTransformedEllipse` | `isEllipse && isTransform`                      |
| `isFrameKeyPoints`     | 8 点すべてが存在し妥当であること                |

変換済み図形のガードはプリミティブと変換のガードの合成になっている。

```typescript
isTransformedRect(value) === isRect(value) && isTransform(value);
```

`BoundingBox` / `BoxFeatures` / `Dimensions` / `OrthogonalDirection` /
`RatioInsets` にはガードが無い。内部で生成されるかリテラルで渡される型であり、
その型のまま実行時境界を越えることがないため。
