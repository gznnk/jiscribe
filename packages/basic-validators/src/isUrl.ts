import { isString } from "./isString";

/**
 * Type guard for a string the WHATWG `URL` constructor can parse.
 *
 * @param value - Value to narrow; must be absolute, so `"/a/b"` and `"example.com"` fail while
 *   any scheme is accepted — including `"javascript:alert(1)"`, which this does not treat as
 *   unsafe
 */
export const isUrl = (value: unknown): value is string => {
	if (!isString(value)) {
		return false;
	}

	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
};
