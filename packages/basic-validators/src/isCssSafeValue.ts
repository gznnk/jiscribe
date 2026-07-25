import { isString } from "./isString";

// Sequences usable to escape a CSS declaration, block, style element, comment, or
// a dangerous function. Containing any one of them makes the value unsafe.
const CSS_BREAKOUT = /[;{}<>\\]|url\(|expression\(|\/\*|\*\//i;

/**
 * Type guard for a string safe to interpolate into a CSS context. Rejects the CSS injection
 * vectors listed in `CSS_BREAKOUT` — `;` `{` `}` `<` `>` `\`, `url(`, `expression(` and comment
 * delimiters. Unlike {@link isCssColor} it is pure and environment-agnostic, so it runs in
 * Node as well as the browser.
 *
 * @param value - Value to narrow; safety is all that is checked, so meaningless CSS such as
 *   `"not-a-color"` still passes
 */
export const isCssSafeValue = (value: unknown): value is string =>
	isString(value) && !CSS_BREAKOUT.test(value);
