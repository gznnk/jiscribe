/**
 * Dependency-free runtime type guards shared across jiscribe. Every export returns a
 * boolean and narrows its argument; none of them coerce their input, throw, or depend on
 * a browser global, so they run unchanged in Node and the browser.
 */

// Basic type guards
export * from "./isString";
export * from "./isNumber";
export * from "./isBoolean";
export * from "./isObject";
export * from "./isArray";

// Extended type guards
export * from "./isNonEmptyString";
export * from "./isPositiveNumber";
export * from "./isNonNegativeNumber";
export * from "./isNumberInRange";
export * from "./isCssSafeValue";
export * from "./isUrl";
export * from "./isEnum";
