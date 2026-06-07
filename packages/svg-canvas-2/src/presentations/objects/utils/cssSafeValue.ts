import { isCssSafeValue } from "@workspace/basic-validators";

/**
 * CSS シンク（emotion の styled テンプレート等）へ補間する直前に値を無害化する。
 *
 * `color` / `fontFamily` / `fontWeight` などは外部入力（CanvasDoc・クリップボード
 * 由来）がエスケープされずに CSS へ補間されるため、`;` `{` `}` `url(` などが
 * 混入すると CSS インジェクションが成立しうる。危険な構文を含む場合は fallback を
 * 返すことで、検証を通らない経路（内部クリップボード・プログラム生成 state 等）でも
 * 注入を成立させない。markdown における DOMPurify と同じ「シンク1点防御」。
 */
export const cssSafeValue = (value: string, fallback = "inherit"): string =>
	isCssSafeValue(value) ? value : fallback;
