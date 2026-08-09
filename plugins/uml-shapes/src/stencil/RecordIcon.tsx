import { createStencilIcon } from "@jiscribe/canvas-sdk";

import {
	UmlIconBodyRows,
	UmlIconFrame,
	UmlIconTitleDivider,
} from "./UmlIconParts";

/** The category icon: the shared box with no mark of its own. */
export const RecordIcon = createStencilIcon(
	<>
		<UmlIconFrame />
		<UmlIconTitleDivider />
		<UmlIconBodyRows />
	</>,
);
