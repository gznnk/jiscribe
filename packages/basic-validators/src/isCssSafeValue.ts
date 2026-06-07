import { isString } from "./isString";

// CSS 宣言・ブロック・style 要素・コメント・エスケープ・危険な関数からの
// 抜け出しに使われうる文字列。1つでも含めば「安全でない」と判定する。
const CSS_BREAKOUT = /[;{}<>\\]|url\(|expression\(|\/\*|\*\//i;

/**
 * Check if a value is a string that is safe to interpolate into a CSS context.
 *
 * Rejects characters/sequences that could break out of a CSS declaration
 * (`;` `{` `}` `<` `>`, `url(`, CSS comment delimiters, etc.), i.e. CSS
 * injection vectors. Unlike `isCssColor`, this is a pure, environment-agnostic
 * check (no `CSS.supports`), so it is safe to run in Node and the browser.
 */
export const isCssSafeValue = (value: unknown): value is string =>
	isString(value) && !CSS_BREAKOUT.test(value);
