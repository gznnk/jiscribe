# 命名規則とディレクトリ構造

## 命名規則

コードベース全体の一貫性を保つため、関数には以下の命名規則に従ってください。

### 1. 計算関数 (`calc...`)

入力引数に基づいて計算を行い、新しい値を返す関数は `calc` で始める必要があります。
これには、幾何学的計算、距離測定、新しい点や値を返す変換などが含まれます。

- **形式:** `calc[Subject][Action/Result]`
- **例:**
  - `calcBoundingBox(points)` - 点集合のバウンディングボックスを計算します。
  - `calcDistance(p1, p2)` - 2点間の距離を計算します。
  - `calcRotatedPoint(point, center, angle)` - 回転後の点の座標を計算します。
  - `calcCloserPoint(ref, p1, p2)` - 基準点に近い方の点を計算（選択）します。

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

## ディレクトリ構造

- `src/common`: 一般的なユーティリティ関数（変換、基本的な数学計算）。
- `src/geometry`: 幾何学的形状の計算（線、矩形、交差）。
- `src/points`: 点に関する計算（距離、回転）。
- `src/transform`: アフィン変換と関連ロジック。
- `src/types`: TypeScript の型定義。
- `src/validators`: 型ガードとバリデーションロジック。
