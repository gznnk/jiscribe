/**
 * The section the full-width bar's free space falls just before: the first
 * `align: "end"` one in array order, which carries the auto margin pushing it
 * and everything after it against the right edge.
 *
 * @param sections The bar in display order; only `id` and `align` are read.
 * @returns Its id, or undefined when no section is end-aligned (no free space
 *   is drawn then, beyond what the bar leaves after its last section).
 */
export const findFirstEndSectionId = (
	sections: readonly { id: string; align: "start" | "end" }[],
): string | undefined =>
	sections.find((section) => section.align === "end")?.id;
