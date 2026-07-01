> 🌐 English version: [08-presentation-and-theme.md](./08-presentation-and-theme.md)

# 表示・テーマ

描画層（presentations）の役割と、色の扱い方の規約。

## presentations は純粋描画（Dumb Component）

`presentations/` のコンポーネントは **State を Props で受け取り SVG を描画するだけ**で、
状態を持たずロジックも持たない。イベントハンドラは Props 経由で受け取る。
依存は `presentations → states`（型参照）のみで、`controllers` には依存しない
（[アーキテクチャ](./02-architecture.ja.md) の禁止事項）。

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

|            | UI クローム                                  | 図形データ                                     |
| ---------- | -------------------------------------------- | ---------------------------------------------- |
| 例         | メニュー・ツールバー・選択枠・スナップガイド | 図形の `fill` / `stroke` / `fontColor`         |
| 出所       | `constants/theme.ts` のテーマトークン        | ドキュメント（`.jis.json`）に保存される値      |
| テーマ追従 | する（VSCode のテーマに自動で馴染む）        | しない（ユーザーが指定したデータ）※auto を除く |

### `"auto"`（テーマ追従色）— 図形データの例外（issue #38）

図形データの色には例外として sentinel 値 `"auto"` を許容する。`"auto"` は「具体色未指定 ＝
テーマに従う」という曖昧さのない**データ上の意味**で、保存値がテーマ依存にならないため
ポータビリティを壊さない。新規図形の `stroke` / `fontColor` の既定値はこの `"auto"`。

- **保存**: `.jis.json`・State には `"auto"` のまま保持する。Mapper では変換しない。
- **解決**: 描画時に `presentations/objects/utils/resolveAutoColor.ts` が**ロール（役割）ごと**に
  テーマ色へ解決する（後述）。
- **明示色**: ユーザーがカラーピッカーで具体色を選ぶと、その時点で具体値として保存され、以後は
  従来どおりテーマ非依存で表示される（後方互換）。

#### auto はロール（役割）ごとのテーマトークンへ解決する

`"auto"` が「従うべき色」はフィールドの役割で決まる。解決は `resolveAutoColor(value, role)`
（`presentations/objects/utils/resolveAutoColor.ts`）の **1 関数に集約**する。

| ロール           | 対象フィールド         | 解決先（テーマトークン）                                   |
| ---------------- | ---------------------- | ---------------------------------------------------------- |
| 前景（ink）      | `stroke` / `fontColor` | `theme.foreground`（`var(--vscode-foreground)`）           |
| サーフェス（面） | `fill`                 | `theme.surface`（`var(--vscode-editorWidget-background)`） |

**単一ルール**: 「auto はロールのテーマトークンへ解決し、色は CSS で当てる」。`var(--vscode-*)` は
SVG presentation 属性では解決されないため、stroke / fill / arrow の color も含め**色は属性では当てない**。

- 図形要素は emotion `styled`（`RectElement` 等）なので、解決済みの色を **`strokeColor` / `fillColor`
  props で渡し、styled 定義側で CSS として補間**する。emotion はテンプレートに文字列補間するが、
  補間する色・フォント値の CSS 安全性（インジェクション防御）は**外部入力の境界**（`parseCanvasText`
  の二段検証 / クリップボードの state 検証）で担保済みのため、sink 側での無害化は行わない（原則 4）。
- styled を持たない素の SVG 要素（描画プレビュー等の `<rect>` / アイコン）では inline `style` で当てる。

これにより解決値の種類も適用方法も全フィールドで一貫する。`currentColor` や `ContentGroup` への
`color` 設定による暗黙解決には依存しない（以前あった「前景は currentColor、面は token」「属性 vs
style」という 2 方式混在を解消）。

- 「面＋前景」の組（fill:auto + fontColor:auto）は VSCode の surface↔foreground ペアと同じく
  可読性が保たれる。`fill` の既定は `"transparent"`（塗りなし）のままで、`"auto"` は別オプション。
- Sticky の `fontColor` は固定の色付き背景を持つため `"auto"` にせず `#000000` を据え置く。
- UI クロームのカラープレビューアイコンは、図形データの解決（`resolveAutoColor`）とは層が異なり、
  chrome の慣用どおり `currentColor`（chrome 前景）で auto を示す。

`theme`（`constants/theme.ts`）は `--vscode-*` CSS 変数を参照しつつ、変数が無い環境
（単体デモ・Storybook 等）向けにダーク基調のフォールバック値を持つ。これにより
VSCode 上では利用者のテーマに馴染み、デモ環境ではダークテーマと同じ見た目になる。

### 細則

- presentational な「汎用」シェイプ（矢印・GroupIcon 等）は `theme` を直接 import しない。
  図形データ色の auto 解決は描画層の `resolveAutoColor`（唯一の theme 結合点）に委ね、シェイプは
  解決済みの色を props/`style` で受け取るだけにする。一方 ObjectMenu 専用のカラー系アイコン
  （ColorPreviewIcon / BorderColorIcon 等）は UI クロームなので `theme` トークンの参照を許容する。
- 透明（none）インジケータの市松は `theme.transparentChecker`（前景色を薄く重ねる）で表現し、
  ライト / ダークで濃淡が自動反転するようにする。固定グレーは使わない。
- 短命なアクセントオーバーレイ（スナップガイド等）は鮮やかな固定色でも両テーマで成立するため、
  無理にテーマ化しない。色が衝突したときだけトークン化を検討する。
  </content>
