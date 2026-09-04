> 🌐 English version: [08-rendering-and-theme.md](./08-rendering-and-theme.md)

# 描画・テーマ

描画層（rendering）の役割と、色の扱い方の規約。

## 描画層は純粋描画

`rendering/` のコンポーネントは **State を Props で受け取り SVG を描画するだけ**で、
状態を持たずロジックも持たない。イベントハンドラは Props 経由で受け取る。
依存は `rendering → states`（型参照）のみで、`controllers` には依存しない
（[アーキテクチャ](./02-architecture.ja.md) の禁止事項）。

構成:

- `layers/` … 描画の重なり順（`background` / `content`）
- `objects/` … 形状別コンポーネント（`primitives/` / `connector/` / `annotations/`、`base/TextOverlay`、`arrows/`）
- `defs/` … SVG `defs`（フィルター等）

「純粋描画に徹する」ことで、表示は state の関数として決まり、テストや再利用がしやすくなる。

## 色は「presentation 属性」か「CSS」かを使い分ける

判断軸は emotion か inline style かではなく、**presentation 属性で足りるか / CSS 関数の解決が要るか**。

- 静的な色で CSS 関数を使わない → SVG の presentation 属性で十分（`fill="currentColor"`、`stroke="#888"` 等）。
- `var(--jiscribe-*)` や `color-mix()` を使う → **presentation 属性では解決されない**。
  CSS プロパティとして当てる（`style={{ fill: ... }}` または emotion）。

### emotion と inline style の使い分け

- コンポーネントのクローム（コンテナ / ボタン / パネル / 入力など、`:hover`・状態・レイアウトを持つもの）→ emotion `styled`。
- アイコン内部の小さな SVG 塗りで、CSS 関数解決のためだけに CSS が必要 → inline `style`。
  アイコン群は素の SVG 属性で統一されているため、1 アイコン内で emotion と属性を混在させない。

該当コード例:

- `style={{ fill: theme.transparentChecker }}` … `controllers/ui/icons/ColorPreviewIcon.tsx`
- `style={{ stroke: theme.transparentChecker }}` … `controllers/ui/icons/BorderColorIcon.tsx`

## UI クロームはテーマトークン、図形データの色とは区別する

色には性質の異なる 2 種類があり、出所を必ず分ける。

|            | UI クローム                                  | 図形データ                                     |
| ---------- | -------------------------------------------- | ---------------------------------------------- |
| 例         | メニュー・ツールバー・選択枠・スナップガイド | 図形の `fill` / `stroke` / `fontColor`         |
| 出所       | `constants/theme.ts` のテーマトークン        | ドキュメント（`.jis.json`）に保存される値      |
| テーマ追従 | する（ホストが注入したテーマに従う）         | しない（ユーザーが指定したデータ）※auto を除く |

### `"auto"`（テーマ追従色）— 図形データの例外（issue #38）

図形データの色には例外として sentinel 値 `"auto"` を許容する。`"auto"` は「具体色未指定 ＝
テーマに従う」という曖昧さのない**データ上の意味**で、保存値がテーマ依存にならないため
ポータビリティを壊さない。新規図形の `stroke` / `fontColor` の既定値はこの `"auto"`。

- **保存**: `.jis.json`・State には `"auto"` のまま保持する。Mapper では変換しない。
- **解決**: 描画時に `rendering/objects/utils/resolveAutoColor.ts` が**ロール（役割）ごと**に
  テーマ色へ解決する（後述）。
- **明示色**: ユーザーがカラーピッカーで具体色を選ぶと、その時点で具体値として保存され、以後は
  従来どおりテーマ非依存で表示される（後方互換）。

#### auto はロール（役割）ごとのテーマトークンへ解決する

`"auto"` が「従うべき色」はフィールドの役割で決まる。解決は `resolveAutoColor(value, role)`
（`rendering/objects/utils/resolveAutoColor.ts`）の **1 関数に集約**する。

| ロール           | 対象フィールド         | 解決先（テーマトークン）                                  |
| ---------------- | ---------------------- | --------------------------------------------------------- |
| 墨（ink）        | `stroke` / `fontColor` | `theme.objectInk`（`var(--jiscribe-object-ink)`）         |
| サーフェス（面） | `fill`                 | `theme.objectSurface`（`var(--jiscribe-object-surface)`） |

この 2 つは図形専用トークンで、UI クロームの `foreground` / `surface` とは別枠。ホストはメニュー文字色を
変えずに図形の墨だけを設定できる（ライトテーマで純黒にする等）。

**単一ルール**: 「auto はロールのテーマトークンへ解決し、色は CSS で当てる」。`var(--jiscribe-*)` は
SVG presentation 属性では解決されないため、stroke / fill / arrow の color も含め**色は属性では当てない**。

- 図形要素は emotion `styled`（`RectElement` 等）なので、解決済みの色を **`strokeColor` / `fillColor`
  props で渡し、styled 定義側で CSS として補間**する。emotion はテンプレートに文字列補間するが、
  補間する色・フォント値の CSS 安全性（インジェクション防御）は**外部入力の境界**（parser
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

## ホストによるテーマ注入（issue #150）

テーマはホストが注入する中立な仕組みで、canvas 自体は VSCode を知らない。

- **中立トークン**: `theme`（`constants/theme.ts`）は中立な `--jiscribe-*` CSS カスタムプロパティを
  参照し、フォールバックにはダークプリセット値を持つ（`var(--jiscribe-foreground, #cccccc)`）。
  テーマは CSS 解決時に決まるため、emotion スタイルは静的なモジュール定数のままでよい。
- **注入**: ホストは Canvas / CanvasThumbnail の `theme` prop に `CanvasTheme`
  （`theme/CanvasTheme.ts`）を渡す。Canvas ルートが `theme.tokens` を `--jiscribe-*`
  カスタムプロパティとして注入する（`theme/themeCssVars.ts`）。カスタムプロパティは継承されるため、
  配下のすべてのスタイルが解決できる。
- **2 つの伝搬経路**: CSS で消費するトークンはカスタムプロパティ経由。JS で消費する値
  （ズーム補正計算に使うハンドル寸法）は `CanvasThemeContext`（`useCanvasTheme()`）経由で、
  `var(...)` 文字列ではなく具体値でなければならない。
  - **フォントをテーマに載せない理由**: 内容から導出する箱は doc が名指すファミリで JS 計測する
    （`@jiscribe/doc` の `text/layout`）ので、canvas が同梱していないファミリは正しく計測できない — テキストが実際に
    描かれる字面とは別の字面で箱が決まってしまう。したがって doc が名指せるファミリは閉じた集合
    （`CANVAS_FONT_FAMILIES`。`@jiscribe/canvas/fonts.css` が同梱する）で、どれも指定しないスロット
    は `DEFAULT_FONT_FAMILY` へフォールバックする。この定数が唯一のフォールバックで、描画・計測の
    各地点は上から渡されるのではなく直接 import する。新規図形に書き込まれる既定値も同じもの。
  - **フォントの読み込み完了が第 2 の信号である理由**: ファミリだけではテキストの計測結果は
    決まらない。web フォントは初回描画の後に届くので、内容から導出する箱はスタックの総称
    キーワードで計測され、その直後に別のメトリクスの字面で描かれる。`useFontsLoadedNonce` が
    `document.fonts` を監視し（初回レイアウト分は `ready`、日本語入力が引き起こす後続の
    unicode-range 取得は `loadingdone`）、カウンタを返す。Canvas はそれを `REMEASURE_TEXT` の
    dispatch に変え、`reconcileObjectContentSizes` を `forceRemeasure` 付きで再実行する。
    スロットからは要求できない唯一のパス。`CanvasThumbnail` は dispatch する reducer を
    持たないので、同じカウンタを `canvasToState` の memo キーとして使う。箱が 1 つも動かなければ
    同じ state 参照が返るので、2 つのイベントが重なっても無駄はない。dispatch が届くのは state に
    現れる箱だけなので、同じカウンタを `FontsLoadedNonceContext` として描画層へも配る。レンダー中に
    計測するもの（レコードの帯・コネクターのラベル箱・テキストの当たり帯）はこれを購読しており、
    値が動けば memo を貫いて再レンダーされ、計測がやり直される。字面自体はオプトインで、
    `CANVAS_FONT_FAMILIES` が挙げるものを使うにはホストが `@jiscribe/canvas/fonts.css` を
    import する。
- **標準テーマ**: `darkCanvasTheme`（既定。その値はトークンのフォールバックを兼ねる）と
  `lightCanvasTheme` をパッケージから export する（`theme/themePresets.ts`）。
- **VSCode マッピング層**: VSCode ホスト側（このパッケージではない）が、トークン値として
  `var(--vscode-..., <ダークフォールバック>)` 文字列を渡すことで `--vscode-*` を中立トークンへ
  マップする（`apps/vscode-extension/src/webview/vscodeCanvasTheme.ts`）。VSCode 結合はこの 1 枚
  だけで、ホスト側に置かれている。

### 細則

- 描画専用の「汎用」シェイプ（矢印・GroupIcon 等）は `theme` を直接 import しない。
  図形データ色の auto 解決は描画層の `resolveAutoColor`（唯一の theme 結合点）に委ね、シェイプは
  解決済みの色を props/`style` で受け取るだけにする。一方 ObjectMenu 専用のカラー系アイコン
  （ColorPreviewIcon / BorderColorIcon 等）は UI クロームなので `theme` トークンの参照を許容する。
- 透明（none）インジケータの市松は `theme.transparentChecker`（前景色を薄く重ねる）で表現し、
  ライト / ダークで濃淡が自動反転するようにする。固定グレーは使わない。
- 短命なアクセントオーバーレイ（スナップガイド等）は鮮やかな固定色でも両テーマで成立するため、
  無理にテーマ化しない。色が衝突したときだけトークン化を検討する。
