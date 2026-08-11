import { createStencilIcon } from "@jiscribe/canvas-sdk";

import { UmlIconBodyRows, UmlIconFrame } from "./UmlIconParts";

/**
 * Mark: a solid title band, which stands in for the divider. UML underlines an
 * instance name, but at 24px the band is 5px tall and an underline inside it
 * merges with the band divider, so the whole band is filled instead.
 */
export const ObjectIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<path d="M4 4 H20 V9 H4 Z" fill="currentColor" stroke="none" />
		<UmlIconBodyRows />
	</>,
);
