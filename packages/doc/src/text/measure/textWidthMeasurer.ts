/**
 * Measures single strings under one font — the font it was built for
 * (`TextMeasurement.createMeasurer`), which it therefore does not take again.
 * Widths are in the same local pixels as that font's `fontSize`.
 */
export type TextWidthMeasurer = (text: string) => number;
