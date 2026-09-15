import type { ObjectTextVerticalBasisRegistry } from "../../states/registry/ObjectTextVerticalBasisRegistry";
import type { StylePropertyRegistry } from "../styleProperties/StylePropertyRegistry";
import { SYSTEM_STYLE_PROPERTIES } from "../styleProperties/systemStyleProperties";
import { TextVerticalBasisProperty } from "../styleProperties/TextVerticalBasisProperty";

/**
 * Registers the system style properties into a fresh StylePropertyRegistry,
 * plus the one handler that is bound to another of the canvas's registries.
 *
 * @param registry - The registry being filled
 * @param textVerticalBasisRegistry - Which types the `textVerticalBasis` write moves the body of; the handler consults it per object
 */
export const initializeStyleProperties = (
	registry: StylePropertyRegistry,
	textVerticalBasisRegistry: ObjectTextVerticalBasisRegistry,
): void => {
	for (const [property, handler] of Object.entries(SYSTEM_STYLE_PROPERTIES)) {
		registry.registerHandler(property, handler);
	}
	registry.registerHandler(
		"textVerticalBasis",
		new TextVerticalBasisProperty(textVerticalBasisRegistry),
	);
};
