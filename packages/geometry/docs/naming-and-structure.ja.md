> 🌐 English version: [naming-and-structure.md](./naming-and-structure.md)

# 命名規則とディレクトリ構造

## 命名規則

関数の分類が名前だけで読み取れるよう、以下のプレフィックスに従う。

### 1. `calc...` — 計算

引数から新しい値を計算する。幾何計算・距離測定・新しい点や値を返す変換が該当する。

- **形式:** `calc[Subject][Action/Result]`
- **例:**
  - `calcBoundingBox(frame)` — 変換済みフレームのバウンディングボックス
  - `calcEuclideanDistance(x1, y1, x2, y2)` — 2 点間のユークリッド距離
  - `calcRotatedPoint(px, py, cx, cy, angleRad)` — `(cx, cy)` まわりに
    `angleRad`（ラジアン）だけ回転した `(px, py)`

### 2. `is...` / `has...` / `can...` — 述語

状態・プロパティ・妥当性について boolean を返す。`src/validators` の型ガードは
すべて `is` を使う。

- **例:**
  - `isPoint(value)` — 値が妥当な `Point` かどうか
  - `isLineIntersectingBox(p1, p2, box)` — 線分がボックスの辺と交差するかどうか

### 3. `do...` — 計算を伴う述語

検査ではなくそれ自体が計算になっている判定は、`is...` より `do...` の方が読みやすい。

- **例:**
  - `doSegmentsIntersect(p1, p2, q1, q2)` — 2 線分が交差するかどうか

### 4. `convert...To...` / `[Source]To[Target]` — 変換

図形どうしの変換は `convert` プレフィックスを付け、スカラーの単位変換は
`XToY` の素の形を使う。

- **例:**
  - `convertRectToFrame(rect)` — 左上基準から中心基準へ
  - `convertTransformedEllipseToFrame(ellipse)` — transform をそのまま引き継ぐ
  - `degreesToRadians(deg)`, `nanToZero(value)` — スカラーの変換

### 5. `apply...` — 準備済みの変換を適用する

角度ではなく事前計算した `cos` / `sin` を受け取る、三角関数を含まないコア。
後述の `WithTrig` サフィックスを参照。

- **例:**
  - `applyAffineWithTrig(...)`, `applyInverseAffineWithTrig(...)`

### 6. `sample...` — 曲線上の点をサンプリングする

両端点を含めて `segments + 1` 個の点を返す。

- **例:**
  - `sampleCubicBezier(...)`, `sampleQuadraticBezier(...)`, `sampleEllipseArc(...)`

このパッケージ全体で純関数を原則とし、引数を破壊する関数は置かない。

---

## 数値・引数規約

座標・角度・スケールの受け渡しに関する規約。命名規則と併せて守ること。

### 1. 引数順序

**主語 → 基準 → パラメータ** の順に並べる。主語は計算対象、基準は主語を位置
づける参照点、パラメータは残りの数値。

- `calcRotatedPoint(px, py, cx, cy, angleRad)` は、回転される点 `(px, py)` が
  主語、中心 `(cx, cy)` が基準。

**引数順序を変えるときは必ず関数リネームとセットで行う。** 全引数が `number` の
まま順序だけ入れ替えると、移行漏れが typecheck を素通りして角度が π ずれる。

### 2. 座標はスカラーかオブジェクトか

低レベルの点の計算はフラットなスカラー（`x`, `y`）で受け渡す。ホットパスで中間
オブジェクトを確保しないためである。図形を扱う関数は図形や `Point` をそのまま
受け取る。同じ計算に両方の版を置く場合、スカラー版に `ByCoords` サフィックスを
付ける。

- `doSegmentsIntersect(p1, p2, q1, q2)` / `doSegmentsIntersectByCoords(p1x, p1y, ...)`

### 3. 角度単位

- 角度を返す関数は名前に `Rad` / `Deg` サフィックスを付ける
  （`calcVectorAngleRad`, `normalizeAngleDeg`）。
- 角度を受け取る引数名は単位を含める（`angleRad`, `angleDeg`, `rotationDeg`）。
  `theta` は使わない。
- 例外: `Transform.rotation` は永続化形式に接するフィールド名のため維持する。
  度数法であることは JSDoc に明記済み。

### 4. `WithTrig` サフィックス

名前が `WithTrig` で終わる関数は、角度ではなく事前計算した `cosAngle` /
`sinAngle` を受け取る。`Math.cos` / `Math.sin` を一度だけ計算して多数の点に
使い回すための共有コアであり、角度を受け取る側はここへ委譲する。

- `calcRotatedPoint` → `calcRotatedPointWithTrig`
- `calcAffineTransformedPoint` → `applyAffineWithTrig`
- `calcInverseAffineTransformedPoint` → `applyInverseAffineWithTrig`

`cos(-θ) = cos(θ)`、`sin(-θ) = -sin(θ)` なので、同じ `cos` / `sin` の組は逆回転
にも使える（`(cosAngle, -sinAngle)` を渡す）。

### 5. 縮退・平行判定の EPSILON

縮退・平行判定は `=== 0` ではなく共通定数 `EPSILON`（`src/constants`、`1e-9`、
座標はキャンバスピクセルスケール前提）との比較を使う。

### 6. scale 契約

`Transform.scaleX` / `scaleY` は反転フラグである。`FlipScale` 型（`1 | -1`、
`src/types`）で定義域を絞ってコンパイラに強制させ、寸法は `width` / `height` が
持つ。符号を作る箇所はキャストではなく `calcNonZeroSign`（`1 | -1` を返す）を
経由する。

定義域を `number`（一般 scale）へ広げる場合は、対称図形の輪郭を反転不変とみなして
scale を無視している outline 系関数
（`calcOutlinePointTowardForRotatedFrame` / `calcOutlinePointTowardForRotatedEllipse`）
の一般 scale 対応とセットで行うこと。

### 7. 空入力

空の点配列から結果を作れない関数は、例外を投げたり縮退値を返したりせず `null` を
返す（`calcPolyBoundingBox`, `calcPolyKeyPoints`, `calcOrientedFrameFromPoints`,
`convertPointsToTransformedFrame`）。

---

## ディレクトリ構造

- `src/common` — 一般的なユーティリティ（単位変換、基本的な数値処理）
- `src/constants` — 共通定数（`EPSILON`）
- `src/geometry` — 図形の計算（バウンディングボックス、キーポイント、交差、変換）
- `src/points` — 点の計算（距離、回転、輪郭上の交点、曲線サンプリング）
- `src/transform` — アフィン変換とその逆変換
- `src/types` — TypeScript の型定義
- `src/validators` — 型ガード

テストは対象コードと同じ階層の `__tests__` ディレクトリに置く。
