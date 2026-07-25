# 命名規則とディレクトリ構造

## 命名規則

コードベース全体の一貫性を保つため、関数には以下の命名規則に従ってください。

### 1. 計算関数 (`calc...`)

入力引数に基づいて計算を行い、新しい値を返す関数は `calc` で始める必要があります。
これには、幾何学的計算、距離測定、新しい点や値を返す変換などが含まれます。

- **形式:** `calc[Subject][Action/Result]`
- **例:**
  - `calcBoundingBox(points)` - 点集合のバウンディングボックスを計算します。
  - `calcEuclideanDistance(x1, y1, x2, y2)` - 2点間のユークリッド距離を計算します。
  - `calcManhattanDistance(x1, y1, x2, y2)` - 2点間のマンハッタン距離を計算します。
  - `calcRotatedPoint(px, py, cx, cy, angleRad)` - 中心 `(cx, cy)` まわりに `angleRad`（ラジアン）だけ回転した点の座標を計算します。

> 座標は `Point` オブジェクトではなくフラットなスカラー（`x`, `y`）で受け渡すのがこのライブラリの規約。引数の順序・型を新設・変更する際はこの規約に合わせること。

### 2. 生成関数 (`create...`)

他の関数、オブジェクト、または複雑なデータ構造を生成する関数（ファクトリ）は `create` で始める必要があります。

- **形式:** `create[Object/Function]`
- **例:**
  - `createLinearFunction(p1, p2)` - 2点から一次関数を作成します。

### 3. 真偽値チェック関数 (`is...`, `has...`, `can...`)

状態、プロパティ、または妥当性を示すブール値を返す関数は、`is`、`has`、または `can` で始める必要があります。

- **形式:** `is[Condition]`, `has[Property]`, `can[Action]`
- **例:**
  - `isPoint(obj)` - オブジェクトが有効な Point かどうかをチェックします。
  - `isLineIntersecting(line, boundingBox)` - 線がバウンディングボックスと交差しているかをチェックします。

### 4. 変換関数 (`...To...`)

値をある単位や形式から別のものに変換する関数は、`To` パターンを使用する必要があります。

- **形式:** `[Source]To[Target]`
- **例:**
  - `degreesToRadians(deg)` - 度数法をラジアンに変換します。
  - `nanToZero(value)` - NaN をゼロに変換します。

### 5. アクション/処理関数 (`do...`, `apply...`)

特定のアクションや処理を実行する関数。特に副作用や複雑な操作を暗示する場合に使用します（ただし、このライブラリでは純関数が推奨されます）。

- **例:**
  - `doSegmentsIntersect(s1, s2)` - 線分が交差するかどうかをチェックします（複雑なチェックを意味する場合の `is...` の代替）。

---

## 数値・引数規約

座標・角度・スケールの受け渡しに関する規約。命名規則と併せて守ること。

### 1. 引数順序

「主語 → 基準 → パラメータ」の順に並べる。主語は計算対象、基準は主語を位置づける参照点、パラメータは残りの数値。

- 例: `calcRotatedPoint(px, py, cx, cy, angleRad)` は回転される点 `(px, py)` が主語、中心 `(cx, cy)` が基準。

既存関数の引数順序を変更するときは、必ず関数リネームとセットで行う。全引数が `number` のまま順序だけ入れ替えると、移行漏れが typecheck を素通りして角度が π ずれるなどの実害になるため。

### 2. 角度単位

- 角度を返す関数は関数名に `Rad` / `Deg` サフィックスを付ける（例: `calcVectorAngleRad`, `normalizeAngleDeg`）。
- 角度を受け取る引数名は `angleRad` / `angleDeg` / `rotationDeg` のように単位サフィックスを必須とする。`theta` は使わない。
- 例外: `Transform.rotation` は永続化形式に接するフィールド名のため維持する（度数法であることを JSDoc に明記済み）。

### 3. `Point` 版とスカラー版の併存

同じ計算に `Point` を受け取る版とスカラー（`x`, `y`）を受け取る版の両方を置く場合、スカラー版に `ByCoords` サフィックスを付ける（例: `doSegmentsIntersect` / `doSegmentsIntersectByCoords`）。座標は原則フラットなスカラーで受け渡すのがこのライブラリの規約（命名規則の calc 節の注記も参照）。

### 4. 縮退・平行判定の EPSILON

縮退・平行判定は `=== 0` ではなく共通定数 `EPSILON`（`src/constants`、`1e-9`、座標はキャンバスピクセルスケール前提）との比較を使う。

### 5. scale 契約

`Transform.scaleX` / `Transform.scaleY` は反転フラグであり、`FlipScale`（`1 | -1`、`src/types`）型で定義域を `1 | -1` に絞ってコンパイラで強制する（寸法は width/height が持つ）。符号を作る箇所は `calcNonZeroSign`（`1 | -1` を返す）を経由し、キャストは使わない。

定義域を `number`（一般 scale）へ広げる場合は、対称図形の輪郭を反転不変とみなして scale を無視している outline 系関数（`calcOutlinePointTowardForRotatedFrame` / `ForRotatedEllipse`）の一般 scale 対応とセットで行うこと。

---

## ディレクトリ構造

- `src/common`: 一般的なユーティリティ関数（変換、基本的な数学計算）。
- `src/constants`: 共通定数（`EPSILON` など）。
- `src/geometry`: 幾何学的形状の計算（線、矩形、交差）。
- `src/points`: 点に関する計算（距離、回転）。
- `src/transform`: アフィン変換と関連ロジック。
- `src/types`: TypeScript の型定義。
- `src/validators`: 型ガードとバリデーションロジック。
