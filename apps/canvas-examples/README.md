# canvas-examples

`@jiscribe/canvas` の統合例集。1 example = 1 ファイル（`src/examples/*.tsx`）で、
各ファイルは単体でコピペ可能な統合例として読めるように書く（シェルに依存しない。
親要素いっぱいに描画する、が唯一の契約）。

```bash
pnpm dev:examples     # ギャラリー起動（http://localhost:5174/）
pnpm build:examples   # ビルド（CI で examples の腐敗防止を兼ねる）
```

## examples

| id              | 内容                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| `minimal`       | 空ドキュメントで Canvas をマウントする最小構成                                              |
| `file-io`       | .jis.json の読み込み・保存、エクスポート PNG のドロップ復元                                 |
| `theming`       | theme prop によるテーマ切り替え（プリセット3種の巡回）                                      |
| `viewport`      | imperative viewport API（initialConfig.viewport / onViewportChange / ref.current.viewport） |
| `external-sync` | 外部（エディタ・AI）が doc の正本を持ち、doc 差し替えで push する                           |
| `multi-canvas`  | 複数 Canvas の埋め込み（キーボードはフォーカスされた Canvas にスコープ）                    |
| `gallery`       | 実物 .jis.json の閲覧（正本は `diagrams/`）                                                 |
| `plugins`       | 出荷図形プラグインの登録（plugins 配列を Canvas と createCanvasParser の両方へ渡す）        |

## example を追加するとき

1. `src/examples/<id>.tsx` に自己完結のコンポーネントを書く
2. `src/GalleryShell.tsx` の `EXAMPLES` に登録する

## e2e（プラグイン同居の検証）

```bash
pnpm --filter canvas-examples test:e2e     # 実行
pnpm --filter canvas-examples dev:harness  # ハーネスだけ起動（目視デバッグ用）
```

`e2e/` に置いているのは**出荷 7 プラグインを 1 つのキャンバスに同居させた
スモークテスト 1 本だけ**。canvas も各プラグインも自分だけをロードしたハーネスで
自分の e2e を持つので、「全部載せたときに初めて壊れるもの」（ObjectType の登録衝突・
ツールバーの重複・`<defs>` の id 衝突）はどこからも見えなくなる。それを見るのが
このスイートで、個々の図形の描画・操作は各プラグインのスイートが持つ。

ここに置くのは、canvas と 7 プラグインすべてに依存していて、かつどのパッケージからも
依存されていない（依存グラフの頂点）ため、循環が生まれないから。ハーネスと Playwright
の共有キットは `@jiscribe/canvas/testing/*` から取る。
