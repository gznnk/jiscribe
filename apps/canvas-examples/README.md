# canvas-examples

`@workspace/canvas` の統合例集。1 example = 1 ファイル（`src/examples/*.tsx`）で、
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
| `gallery`       | 実物 .jis.json の閲覧（正本は `apps/landing/public/demo/diagrams/`）                        |

## example を追加するとき

1. `src/examples/<id>.tsx` に自己完結のコンポーネントを書く
2. `src/GalleryShell.tsx` の `EXAMPLES` に登録する

e2e はここに置かない（`packages/canvas/e2e/` が正本。examples はドキュメント所有で、
テストインフラを兼ねない）。
