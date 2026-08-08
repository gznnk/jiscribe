import type { StylePropertyRegistry } from "../styleProperties/StylePropertyRegistry";
import { SYSTEM_STYLE_PROPERTIES } from "../styleProperties/systemStyleProperties";

/** Registers the system style properties into a fresh StylePropertyRegistry. */
export const initializeStyleProperties = (
	registry: StylePropertyRegistry,
): void => {
	for (const [property, handler] of Object.entries(SYSTEM_STYLE_PROPERTIES)) {
		registry.registerHandler(property, handler);
	}
};
