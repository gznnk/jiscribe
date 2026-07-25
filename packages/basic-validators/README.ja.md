> 🌐 English version: [README.md](./README.md)

# @workspace/basic-validators

jiscribe 全体で共有する実行時の型ガード。依存なしの述語だけを収録し、信頼境界
（パース済みの `.jis.json`、クリップボードの内容、プラグインからの入力など）で
`unknown` を型付きコードに渡す前に絞り込む。

## 使い方

```typescript
import { isNumber, isObject, isEnum } from "@workspace/basic-validators";

const isAlign = isEnum(["start", "center", "end"] as const);

const isLabel = (value: unknown): value is Label =>
	isObject(value) && isNumber(value.fontSize) && isAlign(value.align);
```

すべてパッケージルートから再エクスポートしているため、`src/` を直接参照せず
`@workspace/basic-validators` から import する。

## 収録内容

すべて `boolean` を返して引数を絞り込む述語。ワークスペースの命名規則どおり `is` で
始まる名前は必ず boolean のガードを意味し、診断（エラー一覧）を返すバリデータは
スキーマを持つパッケージ側に置く。

| ガード                | true になる条件                                           |
| --------------------- | --------------------------------------------------------- |
| `isString`            | プリミティブな文字列                                      |
| `isNumber`            | `NaN` 以外の数値                                          |
| `isBoolean`           | `true` または `false`                                     |
| `isObject`            | 配列・関数でない非 null のオブジェクト                    |
| `isArray`             | 配列（要素の型は見ない）                                  |
| `isNonEmptyString`    | 空白以外の文字を含む文字列                                |
| `isPositiveNumber`    | `> 0` の数値                                              |
| `isNonNegativeNumber` | `>= 0` の数値                                             |
| `isNumberInRange`     | 閉区間に収まる数値。ファクトリ: `isNumberInRange(0, 100)` |
| `isEnum`              | 決まった集合の要素。ファクトリ: `isEnum([...] as const)`  |
| `isCssColor`          | ブラウザの CSS パーサーが色として受け付ける文字列         |
| `isCssSafeValue`      | CSS からの抜け出しに使える文字列を含まない文字列          |
| `isUrl`               | WHATWG `URL` コンストラクタがパースできる文字列           |

`isNumberInRange` と `isEnum` はファクトリで、一度呼んでガードを作り使い回す。
それ以外は値を直接受け取る。

このパッケージを使う前に押さえておく契約は3つ:

- **`isNumber` は `NaN` を弾く**が `Infinity` は通す。絞り込んだ値は必ず比較できる。
  `isPositiveNumber` / `isNonNegativeNumber` / `isNumberInRange` はこれを土台にして
  いるため同じ挙動を引き継ぐ。
- **`isCssColor` はブラウザ専用。** `CSS.supports` を呼ぶが Node には `CSS` が無く、
  `ReferenceError` を投げる。両方の環境で走らせる必要があるなら `isCssSafeValue` を
  使う。こちらは純粋な正規表現チェックで、注入に使える文字列（`;` `{` `}` `<` `>`
  `\`、`url(`、`expression(`、コメント区切り）を弾くだけで、値が意味のある CSS か
  どうかは判定しない。
- **`isUrl` はパースできるかの判定であって安全性の判定ではない。** `javascript:` を
  含めどのスキームも通り、相対パスや `example.com` のようなホスト名だけの文字列は
  通らない。

## 開発

```bash
pnpm --filter @workspace/basic-validators typecheck
pnpm --filter @workspace/basic-validators lint
pnpm --filter @workspace/basic-validators test
```

テストは Node で動くため `isCssColor` には単体テストが無い。この制約は
`@workspace/canvas` 側の呼び出しにも及ぶ（`isTextStyleState.test.ts` の NOTE 参照）。
