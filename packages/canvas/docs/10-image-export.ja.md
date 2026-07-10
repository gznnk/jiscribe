> 🌐 English version: [10-image-export.md](./10-image-export.md)

# 10. 画像エクスポート / round-trip（PNG / SVG）

Canvas をブラウザ上で画像として書き出す機能。目的は **ダイアグラムを Markdown
（VSCode プレビューおよび GitHub）に埋め込み、かつ再編集できる**こと。draw.io の
編集可能 SVG / PNG に相当する。GitHub issue: #55。

## 背景：foreignObject の制約

図形テキストは `TextOverlay` が `<foreignObject>` + HTML で描画している
（Markdown レンダリングやリッチ編集のため）。これがそのままでは画像化を阻む。

- **PNG**: `<foreignObject>` を含む SVG を `<img>` 化して canvas に `drawImage`
  すると、外部リソースやフォントが一切無くても canvas が **tainted** になり
  `toBlob` / `toDataURL` が `SecurityError` で失敗する（Chromium で実証）。
- **GitHub 等**: Markdown レンダラーは SVG の `<foreignObject>` をサニタイズして
  非表示にする。

→ foreignObject のままでは PNG 化も GitHub 表示も不可。

## 設計

ライブ `<svg>` から、どの環境でも表示・ラスタライズできる**自己完結エクスポート
SVG** を構築し、それを SVG 書き出しと PNG ラスタライズの両方で共有する。

```
buildExportSvg(liveSvg, { source }) ─┬─ serializeSvg ─→ .jis.svg ダウンロード
                                     └─ <img>→canvas→toBlob ─→ iTXt 埋め込み ─→ .jis.png ダウンロード
```

`buildExportSvg`（`src/export/buildExportSvg.ts`）の処理：

1. ライブ SVG を `cloneNode(true)`
2. **computed 描画スタイルをクローンへ焼き込み**：図形の塗りは emotion クラスと
   テーマのカスタムプロパティ（Canvas ルート上の `var(--jiscribe-*)`＝issue #38 /
   doc 08）で当たっており、どちらもスタンドアロンでは生き残らない（直列化で
   クラス定義が消え、切り離したツリーではカスタムプロパティも解決できず、
   `fill` が初期値の**黒**に落ちる）。fill / stroke / opacity / color を
   ツリー順で対応付けたライブ要素の computed style からインライン style に
   コピーし、`class` 属性は落とす。
3. **foreignObject → ネイティブ `<text>` 変換**（`foreignObjectToSvgText.ts`）
   - `canvas.measureText` で実フォント幅を計測してワードラップ（長い語・CJK は
     文字単位で break-word）
   - text-align → `text-anchor`、vertical-align → ブロック配置、色・フォント・
     行高・パディングを computed style から再現
   - 同一 `transform`（matrix）を付けた `<g>` で包み、位置・回転・スケールを保持
   - **ベースラインは CSS のインラインレイアウトモデルに従う**：フォントの
     コンテンツボックス（TextMetrics の `fontBoundingBoxAscent/Descent`）を
     `line-height` ボックスの中に half-leading で中央配置し、ベースラインは
     `halfLeading + ascent` に置く。これで画面表示との差は全行 1px 以内
     （HTML はグリフをピクセルスナップし SVG はしないため、サブピクセルの
     差が原理上の下限）。
   - Markdown は `innerText` で**プレーン化**（表・リスト等のリッチ装飾は未対応）
4. `data-canvas-export="exclude"` が付いた要素をすべて除去 — 画像化対象外の
   単一 opt-out トークン（制御オーバーレイ、グリッドなど）
5. 背景色を単色 `<rect>` として viewBox 全域に敷く
6. `source`（`CanvasDoc` = `.jis.json` 相当）を `<metadata>` の独自名前空間
   `https://jiscribe.dev/ns/canvas` に埋め込む（`canvasSourceMetadata.ts`）

塗りのインライン焼き込みと `<text>` 化により、ファイルはドキュメント
（CSS クラス・カスタムプロパティ・foreignObject）に依存しなくなり、
どの環境でも表示でき PNG も taint しない。

**fit-to-content**: エクスポート範囲は全コンテンツのバウンディングボックス＋
余白 16px（`Canvas.tsx` の `EXPORT_FIT_PADDING`。境界は zoom-to-fit と同じ
`calcContentBounds` で算出）を `viewBox` オプションとして渡す。したがって
画像は現在のパン/ズームやウィンドウサイズに依存せず、1 world 単位 = 1 CSS px
（PNG はさらに `scale` 倍・既定 2）。空キャンバスは従来どおり現在ビューの
書き出しにフォールバックする。

## PNG round-trip（iTXt）

エクスポートした PNG には `.jis.json` を **`iTXt` チャンク**（keyword
`jiscribe`）として埋め込む。draw.io と同じ方式で、ファイルはどこでも普通の
画像のまま、jiscribe では再び開いて編集できる。

- `tEXt`/`zTXt` ではなく `iTXt` を採用：JSON に日本語ラベルが入るため、UTF-8 を
  ネイティブに扱えるチャンクが必要。書き込みは**非圧縮**（JSON は小さく、zlib を
  省くことで抽出が同期・依存ゼロで済む）。
- チャンクは `IEND` 直前に挿入し、CRC32 はテーブル方式で計算（`pngChunks.ts`）。
  同じ keyword への再埋め込みは置き換えになる（冪等）。
- 抽出はパース済み doc ではなく **JSON テキストをそのまま返す**：PNG は外部入力
  なので、ホストが `parseCanvasText`（境界での 2 段階バリデーション＝設計思想の
  原則 4）を通すこと。

デモアプリはエクスポート済み PNG のドロップを受け付け、復元した doc で
キャンバスを差し替える（`App.tsx`）。

## VSCode 連携（`.jis.png` / `.jis.svg`）

VSCode 拡張は二重拡張子（draw.io の `.drawio.png` 相当）にキャンバス
エディタを紐付ける。開くと埋め込みソースからドキュメントを復元し、保存の
たびに画像を再レンダリングしてソースを埋め込み直すため、ファイルは常に
最新の見た目を持つ画像であり続ける。

- `.jis.svg` は既存のテキストエディタフロー（`JiscribeEditorProvider`）に
  乗る：読み込み時に webview が `<metadata>` からソースを抽出し、コミット
  ごとに再レンダリングした SVG 全文を書き戻す。VSCode のテキスト undo /
  保存がそのまま効く
- `.jis.png` はバイナリのため専用の `CustomEditorProvider`
  （`JiscribePngEditorProvider`）が dirty・undo/redo・保存・ホットイグジット
  バックアップを管理する。保存時は webview にラスタライズを依頼
  （`CanvasExportHandle.toPngBlob`）し、webview が応答できない場合は
  「前回保存画像＋最新ソースの再埋め込み」にフォールバックする（見た目は
  古くても編集内容は失われない）
- Node 側の iTXt 読み書きは UI 依存の無いエントリ
  `@workspace/canvas/png-source` を使う（`./parser` と同じパターン）
- `<Canvas exportRef>` が imperative なエクスポート API
  （`toSvgString` / `toPngBlob`）を公開し、ホストはツールバーのボタンと
  完全に同じパイプラインを実行する

## 公開 API（`@workspace/canvas`）

| 関数                                                    | 役割                                       |
| ------------------------------------------------------- | ------------------------------------------ |
| `exportCanvasToSvg(svg, { source, fileName })`          | 編集可能 SVG（`.jis.svg`）を DL            |
| `exportCanvasToPng(svg, { source, scale, fileName })`   | PNG（ソース埋め込み済み）を DL             |
| `canvasToSvgString(svg, { source })`                    | 自己完結 SVG 文字列を取得                  |
| `rasterizeSvgToPngBlob(svg, options)`                   | PNG Blob を取得                            |
| `buildExportSvg` / `serializeSvg`                       | 低レベル構築・直列化                       |
| `embedCanvasSource` / `extractCanvasSource`             | SVG `<metadata>` への `.jis.json` 出し入れ |
| `embedCanvasSourceInPng` / `extractCanvasSourceFromPng` | PNG `iTXt` への `.jis.json` 出し入れ       |

UI: Toolbar 右側に **SVG / PNG の 2 ボタン**。`Canvas.tsx` が
`canvasToDoc(state, registries.objectMapper)` で `source` を生成して両ハンドラへ
渡す。

## 検証

- ユニット（vitest, `src/export/__tests__/`）：iTXt 構造、CRC32 既知ベクトル、
  UTF-8 round-trip、再埋め込みの冪等性、非 PNG の拒否、抽出ソースの
  `parseCanvasText` 通過。
- E2E（Playwright, `scenario/image-export-roundtrip.spec.ts`）：PNG エクスポート
  → ドロップ → 図形が同一 id/transform で復元。SVG エクスポートは
  `<foreignObject>` を含まず、metadata が `parseCanvasText` を通る。
- 文字位置：ライブ（赤）と変換後（青）のインク bbox を行ごとに計測し、全辺
  1px 以内・折り返し完全一致。

## 今後（後続フェーズ）

1. **フォント埋め込み**: `@font-face`（data URI）＋サブセット化で表示側フォント
   差異を解消（特に日本語グリフ）
2. **Markdown リッチ装飾**の `<text>` 再現（見出し・太字・リスト・表など）
