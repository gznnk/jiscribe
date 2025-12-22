import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a path data value (d attribute) from an array of diagram items.
 *
 * @param items - Array of diagram items to create path from
 * @returns SVG path d attribute value
 */
export const createDValue = (items: Diagram[]): string => {
	let d = "";
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		d += `${i === 0 ? "M" : "L"} ${item.x} ${item.y} `;
	}
	return d;
};
