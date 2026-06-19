# 表示・テーマ

描画層（presentations）の役割と、色の扱い方の規約。

## presentations は純粋描画（Dumb Component）

`presentations/` のコンポーネントは **State を Props で受け取り SVG を描画するだけ**で、
状態を持たずロジックも持たない。イベントハンドラは Props 経由で受け取る。
依存は `presentations → states`（型参照）のみで、`controllers` には依存しない
（[アーキテクチャ](./02-architecture.md) の禁止事項）。

構成:

- `layers/` … 描画の重なり順（`background` / `content`）
- `objects/` … 形状別コンポーネント（`primitives/` / `connections/` / `annotations/`、`base/TextOverlay`、`arrows/`）
- `defs/` … SVG `defs`（フィルター等）

「純粋描画に徹する」ことで、表示は state の関数として決まり、テストや再利用がしやすくなる。

## 色は「presentation 属性」か「CSS」かを使い分ける

判断軸は emotion か inline style かではなく、**presentation 属性で足りるか / CSS 関数の解決が要るか**。

- 静的な色で CSS 関数を使わない → SVG の presentation 属性で十分（`fill="currentColor"`、`stroke="#888"` 等）。
- `var(--vscode-*)` や `color-mix()` を使う → **presentation 属性では解決されない**。
  CSS プロパティとして当てる（`style={{ fill: ... }}` または emotion）。

### emotion と inline style の使い分け

- コンポーネントのクローム（コンテナ / ボタン / パネル / 入力など、`:hover`・状態・レイアウトを持つもの）→ emotion `styled`。
- アイコン内部の小さな SVG 塗りで、CSS 関数解決のためだけに CSS が必要 → inline `style`。
  アイコン群は素の SVG 属性で統一されているため、1 アイコン内で emotion と属性を混在させない。

該当コード例:

- `style={{ fill: theme.transparentChecker }}` … `controllers/ui/icons/ColorPreviewIcon.tsx`
- `style={{ stroke: theme.transparentChecker }}` … `controllers/ui/icons/BorderColorIcon.tsx`

## UI クロームは VSCode テーマトークン、図形データの色とは区別する

色には性質の異なる 2 種類があり、出所を必ず分ける。

|            | UI クローム                                  | 図形データ                                |
| ---------- | -------------------------------------------- | ----------------------------------------- |
| 例         | メニュー・ツールバー・選択枠・スナップガイド | 図形の `fill` / `stroke` / `fontColor`    |
| 出所       | `constants/theme.ts` のテーマトークン        | ドキュメント（`.jis.json`）に保存される値 |
| テーマ追従 | する（VSCode のテーマに自動で馴染む）        | しない（ユーザーが指定したデータ）        |

`theme`（`constants/theme.ts`）は `--vscode-*` CSS 変数を参照しつつ、変数が無い環境
（単体デモ・Storybook 等）向けにダーク基調のフォールバック値を持つ。これにより
VSCode 上では利用者のテーマに馴染み、デモ環境ではダークテーマと同じ見た目になる。

### 細則

- presentational な「汎用」シェイプ（矢印・GroupIcon 等）は `theme` を直接 import せず、
  色は親から `currentColor` で受け取る。一方 ObjectMenu 専用のカラー系アイコン
  （ColorPreviewIcon / BorderColorIcon 等）は UI クロームなので `theme` トークンの参照を許容する。
- 透明（none）インジケータの市松は `theme.transparentChecker`（前景色を薄く重ねる）で表現し、
  ライト / ダークで濃淡が自動反転するようにする。固定グレーは使わない。
- 短命なアクセントオーバーレイ（スナップガイド等）は鮮やかな固定色でも両テーマで成立するため、
  無理にテーマ化しない。色が衝突したときだけトークン化を検討する。
  </content>
