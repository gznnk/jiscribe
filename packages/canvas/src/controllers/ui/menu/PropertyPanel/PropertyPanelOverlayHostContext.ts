import { createContext } from "react";

/**
 * The element a dropdown panel of the sidebar is portalled into: the sidebar's
 * own root, outside its scrolling body. Rendered in the body a floating panel
 * would be clipped at the bottom of a section; rendered in the root it floats
 * over the rows. `null` outside the sidebar, which a field opening there
 * reports as an error rather than placing its panel somewhere else.
 */
export const PropertyPanelOverlayHostContext =
	createContext<HTMLElement | null>(null);
