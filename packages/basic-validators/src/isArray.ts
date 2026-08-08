/**
 * Type guard for arrays, narrowing to `unknown[]`; elements are not inspected.
 *
 * @param value - Value to narrow; arrays from other realms pass (`Array.isArray`), array-likes
 *   such as `arguments` or a `NodeList` do not
 */
export const isArray = (value: unknown): value is unknown[] => {
	return Array.isArray(value);
};
