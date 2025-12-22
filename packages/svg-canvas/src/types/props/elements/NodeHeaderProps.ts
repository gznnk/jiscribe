import type { Optional } from "@workspace/utility-types";

import type { NodeHeaderFeatures } from "../../data/elements/NodeHeaderData";
import type { IconProps } from "../../props/icon/IconProps";
import type { NodeHeaderState } from "../../state/elements/NodeHeaderState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for NodeHeader component
 */
export type NodeHeaderProps = Optional<
	CreateDiagramProps<
		NodeHeaderState,
		typeof NodeHeaderFeatures,
		{
			icon: React.ComponentType<IconProps>;
			/** Scale factor for the icon (0.0 to 1.0) */
			iconScale?: number;
			/** Background color for the icon container */
			iconBackgroundColor?: string;
			/** Whether to apply blink animation to the icon background */
			blinkIcon?: boolean;
			/** Color to use for the icon background during blink animation */
			blinkIconColor?: string;
		}
	>,
	| "height"
	| "fontColor"
	| "fontSize"
	| "fontFamily"
	| "fontWeight"
	| "textAlign"
	| "verticalAlign"
>;
