> 🌐 English version: [README.md](./README.md)

# @jiscribe/basic-validators

jiscribe 全体で共有する実行時の型ガード。依存なしの述語だけを収録し、信頼境界
（パース済みの `.jis.json`、クリップボードの内容、プラグインからの入力など）で
`unknown` を型付きコードに渡す前に絞り込む。ブラウザのグローバルには一切触れないため、
どのガードも Node とブラウザで同じ挙動になる。

## 使い方

```typescript
import { isNumber, isObject, isEnum } from "@jiscribe/basic-validators";

const isAlign = isEnum(["start", "center", "end"] as const);

const isLabel = (value: unknown): value is Label =>
	isObject(value) && isNumber(value.fontSize) && isAlign(value.align);
```

すべてパッケージルートから再エクスポートしているため、`src/` を直接参照せず
`@jiscribe/basic-validators` から import する。

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
| `isCssSafeValue`      | CSS からの抜け出しに使える文字列を含まない文字列          |
| `isUrl`               | WHATWG `URL` コンストラクタがパースできる文字列           |

`isNumberInRange` と `isEnum` はファクトリで、一度呼んでガードを作り使い回す。
それ以外は値を直接受け取る。

このパッケージを使う前に押さえておく契約は3つ:

- **`isNumber` は `NaN` を弾く**が `Infinity` は通す。絞り込んだ値は必ず比較できる。
  `isPositiveNumber` / `isNonNegativeNumber` / `isNumberInRange` はこれを土台にして
  いるため同じ挙動を引き継ぐ。
- **`isCssSafeValue` が見るのは安全性であって妥当性ではない。** CSS 宣言からの抜け出しに
  使える文字列（`;` `{` `}` `<` `>` `\`、`url(`、`expression(`、コメント区切り）を弾く
  だけで、安全な文字列が意味のある CSS であるとは限らない。厳密な色の妥当性判定は
  ブラウザの CSS パーサーを必要とするため、ここではなく `@jiscribe/canvas` の
  `states/objects/utils/isCssColor` に置いている。
- **`isUrl` はパースできるかの判定であって安全性の判定ではない。** `javascript:` を
  含めどのスキームも通り、相対パスや `example.com` のようなホスト名だけの文字列は
  通らない。

## 開発

```bash
pnpm --filter @jiscribe/basic-validators typecheck
pnpm --filter @jiscribe/basic-validators lint
pnpm --filter @jiscribe/basic-validators test
```

テストは DOM の無い Node で動くが、ここのガードはそれで困らないことが前提。
`window` / `document` / `CSS` を必要とするものは、このパッケージではなく利用側の
パッケージに置く。
