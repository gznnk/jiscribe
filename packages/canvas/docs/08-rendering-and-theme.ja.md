> 🌐 English version: [08-rendering-and-theme.md](./08-rendering-and-theme.md)

# 描画・テーマ

描画層（rendering）の役割と、色の扱い方の規約。

## 描画層は純粋描画

`rendering/` のコンポーネントは **State を Props で受け取り SVG を描画する**。ドキュメントやキャンバスの
状態は持たず、書き換えもしない。イベントハンドラも受け取らない — 操作の対象は `data-kind` / `data-id` /
`data-part` 属性で宣言し、それを受けてハンドラへ振り分けるのはルートの
[ジェスチャシステム](./04-gesture-system.ja.md)。描画に閉じた局所状態は持ってよい（例: `CanvasView.tsx` は
描かれた背景色からグリッド線の色を導くために `useState` / `useLayoutEffect` を持つ）。
依存の契約は `controllers` に依存しないこと（[アーキテクチャ](./02-architecture.ja.md) の禁止事項）。
`states`（型と純粋関数）と `theme`（テーマトークン）は参照してよい。

主な構成:

- `layers/` … 描画の重なり順ごとの層
- `objects/` … 形状別コンポーネントと、それを支える部品（例: `primitives/`、`connector/`、`base/TextOverlay`）
- `defs/` … キャンバス全体の SVG `<defs>`。canvas 自身は何も持たず、図形型が登録する `svgDefs`（フィルター・グラデーション等）を並べる

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
| 出所       | `theme/themeTokens.ts` のテーマトークン      | ドキュメント（`.jis`）に保存される値           |
| テーマ追従 | する（ホストが注入したテーマに従う）         | しない（ユーザーが指定したデータ）※auto を除く |

### `"auto"`（テーマ追従色）— 図形データの例外（issue #38）

図形データの色には例外として sentinel 値 `"auto"` を許容する。`"auto"` は「具体色未指定 ＝
テーマに従う」という曖昧さのない**データ上の意味**で、保存値がテーマ依存にならないため
ポータビリティを壊さない。新規図形の `stroke` / `fontColor` の既定値はこの `"auto"`。

- **保存**: `.jis`・State には `"auto"` のまま保持する。Mapper では変換しない。
- **解決**: 描画時に `rendering/objects/utils/resolveAutoColor.ts` が**ロール（役割）ごと**に
  テーマ色へ解決する（例外も含めて後述）。
- **明示色**: ユーザーがカラーピッカーで具体色を選ぶと、その時点で具体値として保存され、以後は
  従来どおりテーマ非依存で表示される（後方互換）。

#### auto はロール（役割）ごとのテーマトークンへ解決する

`"auto"` が「従うべき色」はフィールドの役割（ロール）で決まる。図形データの auto は
`resolveAutoColor(value, role)`（`rendering/objects/utils/resolveAutoColor.ts`）で解決する。ロールと
解決先の正本は同ファイルの `AutoColorRole` と対応表で、例えば次のように解決する。

- 墨（`ink`）… `stroke` / `fontColor` → `theme.objectInk`（`var(--jiscribe-object-ink)`）
- サーフェス（`surface`）… `fill` → `theme.objectSurface`（`var(--jiscribe-object-surface)`）

`objectInk` / `objectSurface` は図形専用トークンで、UI クロームの `foreground` / `surface` とは別枠。
ホストはメニュー文字色を変えずに図形の墨だけを設定できる（ライトテーマで純黒にする等）。

コネクターラベルの背景（`fill`）は例外で、`resolveAutoColor` を通さず
`resolveLabelFill`（`rendering/objects/connector/ConnectorLabel/utils/resolveLabelFill.ts`）が auto と
未指定をキャンバス面の色 `theme.canvasBg` へ解決する（背後の線を抜くため）。

**単一ルール**: 「auto はロールのテーマトークンへ解決し、色は CSS で当てる」。`var(--jiscribe-*)` は
SVG presentation 属性では解決されないため、stroke / fill / arrow の color も含め**色は属性では当てない**。

- 図形要素は emotion `styled`（`RectElement` 等）なので、解決済みの色を **`strokeColor` / `fillColor`
  props で渡し、styled 定義側で CSS として補間**する。emotion はテンプレートに文字列補間するが、
  補間する色・フォント値の CSS 安全性（インジェクション防御）は**外部入力の境界**（parser
  の二段検証 / クリップボードの state 検証）で担保済みのため、sink 側での無害化は行わない（原則 4）。
- `fillOpacity` / `strokeOpacity` も同じ経路を通る。`fillColor` / `strokeColor` と同じ styled 要素へ
  `fillAlpha` / `strokeAlpha` という prop 名で渡し、CSS の `fill-opacity` / `stroke-opacity` として
  補間する（CSS プロパティと別名なのは、SVG 属性として妥当な prop を emotion が要素へも書き出す
  ため）。これで 1 要素の塗りが CSS と属性に割れることはない。塗りの両半分は 1 箇所
  （`rendering/objects/utils/shapePaint.ts`。`unstable` 経由でプラグインへも再エクスポート）に書く。
- 矢尻は `<marker>` ではなく独立した要素で、線の `strokeOpacity` を要素の `opacity` として受け取る
  （styled 側の prop 名は同じ理由で `alpha`）。
  塗りつぶしの矢尻（線色を `fill` に塗る）も中抜きの矢尻（`stroke` に塗る）も、この 1 つのルールで
  まかなえる。
- styled を持たない素の SVG 要素（描画プレビュー等の `<rect>` / アイコン）では inline `style` で当てる。

これにより解決値の種類も適用方法も全フィールドで一貫する。`currentColor` や `ContentGroup` への
`color` 設定による暗黙解決には依存しない（以前あった「前景は currentColor、面は token」「属性 vs
style」という 2 方式混在を解消）。

- 「面＋前景」の組（fill:auto + fontColor:auto）は VSCode の surface↔foreground ペアと同じく
  可読性が保たれる。`fill` の既定は `"transparent"`（塗りなし）のままで、`"auto"` は別オプション。
- Sticky の `fontColor` は固定の色付き背景を持つため `"auto"` にせず `#000000` を据え置く。
- UI クロームのカラープレビュー（ObjectMenu やプロパティパネルの色見本）も、描画と同じ解決関数
  （`resolveAutoColor`、ラベル背景は `resolveLabelFill`）で auto をトークン色に解決して渡す。解決値は
  `var(--jiscribe-*)` になりうるので、`ColorPreviewIcon` は fill を inline `style` で当てる。

## ホストによるテーマ注入（issue #150）

テーマはホストが注入する中立な仕組みで、canvas 自体は VSCode を知らない。

- **中立トークン**: `theme`（`theme/themeTokens.ts`）は中立な `--jiscribe-*` CSS カスタムプロパティを
  参照し、フォールバックにはダークプリセット値を持つ（`var(--jiscribe-foreground, #cccccc)`）。
  テーマは CSS 解決時に決まるため、emotion スタイルは静的なモジュール定数のままでよい。
- **注入**: ホストは Canvas / CanvasThumbnail の `theme` prop に `CanvasTheme`
  （`theme/CanvasTheme.ts`）を渡す。Canvas ルートが `theme.tokens` を `--jiscribe-*`
  カスタムプロパティとして注入する（`theme/themeCssVars.ts`）。カスタムプロパティは継承されるため、
  配下のすべてのスタイルが解決できる。
- **2 つの伝搬経路**: CSS で消費するトークンはカスタムプロパティ経由。JS で消費する値
  （例: ズーム補正計算に使うハンドル寸法、後述の `colorScheme`）は `CanvasThemeContext`（`useCanvasTheme()`）経由で、
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
    unicode-range 取得は `loadingdone`）、カウンタを返す。Canvas は値が動いたら `REMEASURE_TEXT` の
    dispatch に変え、`reconcileObjectContentSizes` を `forceRemeasure` 付きで再実行する。
    スロットからは要求できない唯一のパス。これが受け持つのは誰も待っていなかった到着で、マウント時の
    doc 自身の字面は後述の事前読み込みゲートが受け持ち、そちらは決着時に自前で再計測を dispatch
    する。どちらのフックも直接は使わない。Canvas と CanvasThumbnail の入口は
    `useDocFonts`（`controllers/hooks/useDocFonts.ts`）で、この 2 つはその後ろにいる —
    2 つの信号を 1 つのカウンタと 1 つの `onFacesChanged` コールバックに畳み、内容をまだ
    隠しているかどうかも返す。`CanvasThumbnail` は dispatch する reducer を
    持たないので、2 つの信号を `canvasToState` の memo キーとして使う。箱が 1 つも動かなければ
    同じ state 参照が返るので、2 つのイベントが重なっても無駄はない。dispatch が届くのは state に
    現れる箱だけなので、描画層へもカウンタを `FontsLoadedNonceContext` として配る。こちらは
    このカウンタとゲートの決着を足したもので、どちらも「計測し直せ」以上のことを言わない。レンダー中に
    計測するもの（レコードの帯・コネクターのラベル箱・テキストの当たり帯）はこれを購読しており、
    値が動けば memo を貫いて再レンダーされ、計測がやり直される。字面自体はオプトインで、
    `CANVAS_FONT_FAMILIES` が挙げるものを使うにはホストが `@jiscribe/canvas/fonts.css` を
    import する。
  - **内容を字面の到着まで見せない理由**: nonce はレイアウトを直すが、直る過程が見えてしまう —
    最初のフレームはフォールバックで描かれ、少し後にガクッと収まる。そこで canvas は、何かを
    見せる前に、その doc が描く字面を要求する。`collectDocFontRequests` がマウント時の state を
    走査してテキストスロットとコネクターのラベルを集め（スロットは描画側と同じ型の既定値を通して
    解決し、ファミリ・ウェイト・スタイルを上書きする run はそれ自体を 1 つの字面として数える）、
    字面ごとに「その字面が描かねばならない文字」を添えた要求を 1 件ずつ返す。
    `useDocFontsPreload` はそれを `document.fonts.load` へ渡す。文字を添えることこそが肝で、
    unicode-range 分割ではテキストがレイアウトされるまで何も pending にならないため
    `fonts.ready` は即座に解決して何も語らない。テキストを名指しして初めて、ブラウザは doc が
    必要とするサブセットだけを取りに行く。到着までシーンは隠す — 内容のグループに
    `visibility: hidden` を当てるので、レイアウトは残り（隠れたグループでもブラウザは描く分の
    字面を取りに行く）、その下の地（背景とグリッド）は出たままになる。ゲートが開くのは、全要求の
    決着か `FONT_PRELOAD_TIMEOUT_MS`（2 秒）の早い方。それを超えて真っ白なままの方が、nonce が
    後から直す再レイアウトより悪い。決着時は同じコールバックの中で `REMEASURE_TEXT` を dispatch
    してからフラグを立てるので、内容が現れるフレームは既に本来の字面で計測されている。対象は
    マウント時の doc だけで、後から差し替えられた doc は nonce の経路だけを通る。
    `fonts.css` を import していないホストが失うものは無い — 取りに行く字面が無いので、
    load は即座に解決する。
- **標準テーマ**: `darkCanvasTheme`（既定。その値はトークンのフォールバックを兼ねる）と
  `lightCanvasTheme` をパッケージから export する（`theme/themePresets.ts`）。
- **`colorScheme`**: 図形が JS の値として読むテーマ項目（`CanvasColorScheme`）。トークンが塗る地の明暗
  （`"light"` / `"dark"`）を名指し、地ごとに図版を出荷していてトークンでは塗り替えられない絵が使う —
  AWS アイコンはこれで公式の Light / Dark の図版を選ぶ（`plugins/aws-shapes/src/presentation/AwsIconArt.tsx`。
  `useCanvasTheme()` から読む）。`canvasBg` から推定せず必須項目にしているのは、トークンが canvas には
  読めない `var(...)` 文字列でありうるため。そのため、トークンは固定のままエディタの地に追従するホスト
  （VSCode）は配色ごとにテーマを持って差し替える。
- **VSCode マッピング層**: VSCode ホスト側（このパッケージではない）が、トークン値として
  `var(--vscode-..., <ダークフォールバック>)` 文字列を渡すことで `--vscode-*` を中立トークンへ
  マップする（`apps/vscode-extension/src/webview/vscodeCanvasTheme.ts`）。VSCode 結合はこの 1 枚
  だけで、ホスト側に置かれている。

### 細則

- 描画専用の「汎用」シェイプ（矢印・GroupIcon 等）は `theme` を直接 import しない。
  図形データ色の auto 解決は描画層の解決関数（`resolveAutoColor` など）に委ね、シェイプは
  解決済みの色を props/`style` で受け取るだけにする。描画層で `theme` を直接参照するのは、auto の解決や
  キャンバス自体のスタイル（`CanvasViewStyled.ts`）のように、テーマそのものを扱う箇所に留める。一方 ObjectMenu 専用のカラー系アイコン
  （ColorPreviewIcon / BorderColorIcon 等）は UI クロームなので `theme` トークンの参照を許容する。
- 透明（none）インジケータの市松は `theme.transparentChecker`（前景色を薄く重ねる）で表現し、
  ライト / ダークで濃淡が自動反転するようにする。固定グレーは使わない。
- 短命なアクセントオーバーレイ（スナップガイド等）も UI クロームとしてテーマトークンで塗る
  （`controllers/ui/feedback/SnapGuides/SnapGuides.tsx` は `theme.handleAccent`）。トークンは
  `var(--jiscribe-*)` になりうるので、presentation 属性ではなく inline `style` で当てる。
