# 幾何学型定義 (Geometry Types)

このドキュメントでは、`@workspace/geometry` パッケージで使用される型システムについて説明します。型は、プリミティブ (Primitives)、変換済み (Transformed)、計算済み/機能 (Computed/Features) の3つのカテゴリに分類されます。

## 型カテゴリ (Type Categories)

### 1. プリミティブ (Primitives)

プリミティブ型は、変換情報（回転やスケールなし）を持たない純粋な幾何学的形状を表します。これらは、すべての幾何学操作の基本的な構成要素です。

#### `Rect`

左上の角の位置と寸法で定義される矩形。

```typescript
type Rect = {
	x: number; // 左端の x 座標
	y: number; // 上端の y 座標
	width: number; // 幅
	height: number; // 高さ
};
```

#### `Frame`

中心点と寸法で定義される矩形。

```typescript
type Frame = {
	cx: number; // 中心の x 座標
	cy: number; // 中心の y 座標
	width: number; // 幅
	height: number; // 高さ
};
```

#### `Ellipse`

中心点と半径で定義される楕円。

```typescript
type Ellipse = {
	cx: number; // 中心の x 座標
	cy: number; // 中心の y 座標
	rx: number; // 水平方向の半径
	ry: number; // 垂直方向の半径
};
```

### 2. 変換済み (Transformed)

変換済み型は、プリミティブ形状と変換情報を組み合わせたものです。これらは、形状を回転またはスケーリングする必要がある場合に使用されます。

#### `Transform`

任意の形状に適用できる変換パラメータ。

```typescript
type Transform = {
	rotation: number; // 回転角度（ラジアン）
	scaleX: number; // 水平方向のスケール係数
	scaleY: number; // 垂直方向のスケール係数
};
```

#### `TransformedRect`

変換が適用された矩形。

```typescript
type TransformedRect = Rect & Transform;
```

#### `TransformedFrame`

変換が適用されたフレーム。

```typescript
type TransformedFrame = Frame & Transform;
```

#### `TransformedEllipse`

変換が適用された楕円。

```typescript
type TransformedEllipse = Ellipse & Transform;
```

### 3. 計算済み / 機能 (Computed / Features)

計算済み型は、バウンディングボックスや参照点などの計算結果を表します。これらは通常、幾何学計算関数の出力です。

#### `BoundingBox`

形状の矩形範囲を表す軸平行バウンディングボックス (AABB)。

```typescript
type BoundingBox = {
	top: number; // 上端の y 座標
	left: number; // 左端の x 座標
	right: number; // 右端の x 座標
	bottom: number; // 下端の y 座標
};
```

#### `BoxFeatures`

追加の機能点（角と中心）を持つバウンディングボックス。

```typescript
type BoxFeatures = BoundingBox & {
	center: Point; // 中心点
	topLeft: Point; // 左上の角
	topRight: Point; // 右上の角
	bottomLeft: Point; // 左下の角
	bottomRight: Point; // 右下の角
};
```

#### `KeyPoints`

形状上の8つの参照点：4つの角と4つの辺の中点。形状操作ハンドルや整列操作に使用されます。

```typescript
type KeyPoints = {
	topLeft: Point; // 左上の角
	topCenter: Point; // 上辺の中点
	topRight: Point; // 右上の角
	rightCenter: Point; // 右辺の中点
	bottomRight: Point; // 右下の角
	bottomCenter: Point; // 下辺の中点
	bottomLeft: Point; // 左下の角
	leftCenter: Point; // 左辺の中点
};
```

#### `RectKeyPoints`

矩形のキーポイント。

```typescript
type RectKeyPoints = KeyPoints;
```

#### `FrameKeyPoints`

フレームのキーポイント。

```typescript
type FrameKeyPoints = KeyPoints;
```

## 型選択ガイド (Type Selection Guide)

### プリミティブを使用する場合

以下の場合はプリミティブ型 (`Rect`, `Frame`, `Ellipse`) を使用してください：

- 回転やスケーリングが不要な場合
- 基本的な幾何学的計算を行う場合
- 正規化された形状データを保存する場合

### 変換済み型を使用する場合

以下の場合は変換済み型 (`TransformedRect`, `TransformedFrame`, `TransformedEllipse`) を使用してください：

- 形状に回転やスケーリングが必要な場合
- ユーザーが操作する形状を扱う場合
- 変換可能な形状を描画する場合

### 計算済み/機能型を使用する場合

以下の場合は計算済み型 (`BoundingBox`, `BoxFeatures`, `KeyPoints`) を使用してください：

- 形状の軸平行境界が必要な場合
- UIハンドルのための参照点が必要な場合
- ヒットテストや衝突判定を行う場合
- 整列のための参照点が必要な場合

## バリデータ (Validators)

実行時の型チェックのために、型ガードが提供されています：

### プリミティブバリデータ

- `isRect(obj)` - オブジェクトが `Rect` かどうかをチェック
- `isFrame(obj)` - オブジェクトが `Frame` かどうかをチェック
- `isEllipse(obj)` - オブジェクトが `Ellipse` かどうかをチェック

### 変換バリデータ

- `isTransform(obj)` - オブジェクトが変換プロパティを持っているかをチェック

### 変換済みバリデータ

- `isTransformedRect(obj)` - オブジェクトが `TransformedRect` かどうかをチェック
- `isTransformedFrame(obj)` - オブジェクトが `TransformedFrame` かどうかをチェック
- `isTransformedEllipse(obj)` - オブジェクトが `TransformedEllipse` かどうかをチェック

変換済みバリデータは合成パターンを使用しています：

```typescript
isTransformedRect(obj) = isRect(obj) && isTransform(obj);
```
