> 🌐 English version: [12-plugin-architecture.md](./12-plugin-architecture.md)

# プラグインアーキテクチャ

図形をエンジンの外に置くための契約。8 つの基本型（`rect` / `ellipse` / `text` /
`polyline` / `polygon` / `group` / `connector` / `svg`）以外の図形はすべて
`plugins/` 配下のプラグインとして出荷しており、第三者が使うのと同じ公開 API だけで
書いてある。
出荷図形がそれで書けるなら、あなたの図形も書ける。

ここでは契約を扱う。実際の手順（パッケージ構成・量産キット・配線チェックリスト）は
[プラグインの作り方](./13-authoring-plugins.ja.md) を参照。

## プラグインはコントリビューションの束

プラグイン専用のランタイムは無い。プラグインは「何を登録するか」の宣言であり、
通るレジストリは組み込み型と同じものである。

```ts
export type CanvasPlugin = {
	id: string;
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;
};
```

ホストは `initialConfig` から配線する。

```tsx
<Canvas doc={doc} initialConfig={{ plugins: [stickyPlugin, umlPlugin] }} />
```

`objects` は `ObjectType` をキーに取り、値がその型に必要なものを全部持つ。
`mapper` / `stateValidator` / `component` / `behavior` と、任意の calculator
（`outline` / `textRegion` / `geometryKey` / `visualBounds` / `anchorRegion` /
`extraConnectPoints`）、加えて `stencils` / `menu` / `svgDefs` /
`selectionControls` / `transformHandles` / `extraStyleProperties`。エンジン側に
型による分岐は無く、すべて `ObjectType` キーのレジストリで解決されるため、
実行時にプラグイン型と組み込み型は区別できない。

素の `Record` ではなく `Partial<Record<...>>` なのは意図的である。`ObjectType` は
開いた union なので、1 図形だけ供給するプラグインが残りを省略できる必要がある。

## UI と headless の 2 面

プラグインはコントリビューションを 2 つの入口から二重に export する。

| 入口    | export するもの           | 消費者                                         |
| ------- | ------------------------- | ---------------------------------------------- |
| `.`     | `CanvasPlugin`（UI 定義） | `<Canvas>` を使うホスト                        |
| `./doc` | `CanvasDocPlugin`         | `createCanvasParser`・Node ツール・VSCode 診断 |

```ts
export type CanvasDocPlugin = {
	id: string;
	objects?: Readonly<Partial<Record<ObjectType, ObjectDocDefinition>>>;
};
```

`ObjectDocDefinition` は型の headless 半分である。`features` / `validateDoc` /
`factory` と、AI 向けの `description` / `summary` / `outlineDescription` /
`defaults` を持つ。`ObjectTypeDefinition` はこれを継承しており、だから
`CanvasPlugin` は `CanvasDocPlugin` に**構造的に代入できる** — 同じ `plugins`
配列が `<Canvas>` にもパーサーにも渡せる。

分けてある理由は、ドキュメントを検証するだけの消費者に React を読ませないため。
VSCode 拡張の診断も MCP サーバーも Node プロセスで `.jis.json` をパースする。
プラグインの `.` 入口を import すると React・`@emotion`・presentation 層一式が
そのバンドルに入り込む。そこでプラグインは `./doc` をそれらから切り離しており、
ESLint がこれを強制する（[プラグインの作り方](./13-authoring-plugins.ja.md#リンタが強制する境界)参照）。

パーサーは構成ごとにインスタンス化する。

```ts
const parser = createCanvasParser({ plugins: [stickyDocPlugin, umlDocPlugin] });
const result = parser.parse(text);
```

`presetDefinitions` の既定は `builtinObjectDocDefinitions`（組み込み全型の Record）。
組み込み型を自前の定義に差し替えたい場合は、その型を除いた `presetDefinitions` を
渡し、`plugins` 側で足す。`createCanvasParser()` を引数なしで呼べば既定構成（組み込み型のみ）になる。

## ライフサイクルと競合規則

- **mount 時に一括適用し、以後は不変。**`initialConfig` は read-once で、プラグイン
  構成を変えるには React の `key` を変えて remount する。動的な有効・無効化は
  非目標である。登録を外した直後の型のオブジェクトが doc に残りうるのに、それを
  どう扱うべきかに整合的な答えが無い
- **マージ順**は `presetDefinitions` → `plugins` の宣言順
- **型の重複は構築時に throw する。**last-wins にはしない。2 つのプラグインが
  偶然衝突したとき、どちらの図形が描かれるかが黙って変わるより、大きな音を立てて
  失敗するほうがよい。意図的な差し替えは「除去 + 追加」で表現する
- プラグインが増えても検証境界は動かない。パーサーがドキュメントを検査する唯一の
  場所であり、その先は正当性を前提にする（[設計思想](./01-design-philosophy.ja.md)）

## 公開面とその階層

```
@jiscribe/canvas              安定: 型の語彙・登録口・Canvas の props
@jiscribe/canvas/doc          安定・headless
@jiscribe/canvas/unstable     tier 2: ベース実装・presentation 部材
@jiscribe/canvas/unstable-doc tier 2・headless
@jiscribe/canvas-sdk          プラグイン向けの面（unstable の再エクスポート + 量産キット）
@jiscribe/canvas-sdk/doc      その headless 版
```

`unstable` サブパスには frame 系のベース実装と、図形を組み立てる presentation
部材が入っている。semver の保証外であり、そのことが import 文そのものに出る。

**プラグインはこれを直接 import しない。**`@jiscribe/canvas-sdk` が `unstable` の
全面を再エクスポートし、プラグインしか使わない部材を足しているので、図形作成の
サポート面はここ 1 つになる。プラグインが何に依存してよいかを調べる場所も
ここになる。`plugins/*/src/**` からの `@jiscribe/canvas/unstable` は ESLint が弾く。

## 状態の所有権: uncontrolled + ハンドル

状態は canvas が持つ。ホストは購読で読み、`ref` 上の imperative ハンドルで書く。

```tsx
const canvasRef = useRef<CanvasHandle>(null);

canvasRef.current?.viewport.setViewport(next);
canvasRef.current?.selection.select(ids);
await canvasRef.current?.export.toSvgString();
```

state をホストへ持ち上げる（controlled props 化）案は検討したうえで**採らない**。

1. **性能モデルと衝突する。**`CanvasState` はドラッグ中に RAF バッチで毎フレーム
   更新される。これをホストの state 経由にすると、描画性能がホスト実装の性質に
   なる。素直に書くと遅くなる API になってしまう
2. **失敗の実例がある。**viewport は一度 controlled にして振動が起きた。imperative
   な `setViewport` と観測用の `onViewportChange` に分けて解消した経緯がある。
   全面 controlled は、この問題クラスを全項目で再導入する
3. **内部構造をまるごと公開契約に固定する。**`CanvasState` にはジェスチャー開始
   スナップショットのような transient なフィールドが含まれる。ハンドルなら
   厳選した動詞だけを見せて表現を隠せるので、カプセル化はむしろ強くなる

根拠は「状態」と「コマンド」の性質の違いにある。宣言的な props は定常状態向きで、
選択の変更・パッチ適用・undo のような一回きりの遷移はコマンド向きである。
エンジン系ライブラリの境界に命令的な façade を置くのは一般的な形でもある
（tldraw の `Editor`、Excalidraw の `excalidrawAPI`、React Flow の instance、
CodeMirror の `EditorView`）。

ハンドルが state の置き場に堕ちないためのガードレール:

- 語彙は少数のドメイン動詞に絞る。内部 state への getter を雑に生やさない。
  生やすと事実上の state 公開になり、controlled の欠点だけを輸入する
- 実装はすべて既存 reducer への dispatch に落とす。純粋関数の状態遷移を迂回する
  横道を作らない
- 読み取りは購読で返す。命令的なのは書き込み口だけにする
- 各メソッドが履歴・commit 境界に与える影響を契約として文書化する

## プラグインが守る規約

**型 ID。**`ObjectType` は開いた union である。共有語彙の候補にするつもりが無い
図形には、ベンダー名前空間を付ける（`vendor:shape`）。組み込みや他プラグインとの
重複は throw する。

**`svgDefs`。**`url(#…)` で参照する filter / gradient / marker は定義に宣言し、
キャンバス全体の `<defs>` に**型ごと 1 回**描画される。その型のオブジェクトが 0 個
でも描画されるので、参照先が消えることはない。SVG の id は document グローバルで
レジストリ側でスコープを付けられないため、**id は型名を接頭辞にする**
（`sticky-blur`）。ホストが `objectTypes` で型を絞れば、その `svgDefs` も登録され
ない。エクスポートは live SVG の `cloneNode` なので、プラグイン提供分も自動で入る。

**テキストスロット**（`features.text: "slots"`）。整数風のスロット ID（`"0"` /
`"1"`）を使わない。JS は整数風の自前キーを挿入順より前に数値昇順で列挙するため、
`state.text` のキー順 — 既定スロット（Enter 編集）と描画順を決めているもの — が
型の意図を反映しなくなる。`mapTextDocToState` が該当キーを落とすので state にも
載らない。

**`menu`。**optional で 3 通りの意味を持つ。省略は `features` からの既定導出、
配列の宣言は全置換、`[]` はメニュー無し。導出規則は `createDefaultMenu` と
その unit テストが正である。

**i18n。**プラグインは自分の辞書を持ち、`useCanvasLocale` /
`resolveLocaleMessages` で解決する。core の文言キーにプラグインの語彙は足さない。

**`selectionControls`。**プレーン宣言 `{ name, Component, handle }` で、基底クラス
継承は無い。`handle` に渡すのは自オブジェクトの情報（現フレーム + ジェスチャー開始
スナップショット）とカーソルだけである。part の導出・スナップショットのガード・
COW 書き戻し・エッジスクロール解除は内部 adapter が肩代わりする。

## まだ拡張できないもの

無いものを前提に設計しないよう、限界を明示しておく。

| 領域                       | 現状                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 組み込み UI                | Toolbar / ObjectMenu / ContextMenu は無条件にマウントされ、隠す・差し替える手段が無い                                                       |
| UI スロット                | `toolbar.leading` / `toolbar.trailing` の 2 つだけ。プロパティパネルやオーバーレイ層のスロットは無い                                        |
| 細粒度のプロパティ書き戻し | ハンドルに `updateProperties` が無い。`doc` prop の差し替えは外部変更扱いで選択状態がリセットされ履歴境界も切られるため、編集経路に使えない |
| インタラクションの調整     | スナップ閾値などが定数でハードコードされている。エッジスクロールとパン/ズームも外部から無効化できない                                       |
| コマンド                   | `config.commands` で組み込みを減らせるが、プラグインからの追加もショートカット再割当もできない                                              |
| ObjectMenu の項目種        | 組み込みの項目種は switch 固定で、データ駆動なのは `custom` コンポーネント項目だけ                                                          |

一方で**できること**: 独自の doc スキーマ・検証・描画・ステンシル・メニュー・
スタイルプロパティ・輪郭/スナップ挙動・型固有の選択コントロール・共有 SVG defs・
自前の i18n を持つ図形型を、外部パッケージから追加できる。
