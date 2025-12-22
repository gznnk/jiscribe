import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CreateDataType } from "../shapes/CreateDataType";

/**
 * Diagram features for Ai diagrams.
 */
export const AiFeatures = {
	frameable: true,
	transformative: false,
	connectable: false,
	strokable: false,
	fillable: false,
	cornerRoundable: false,
	textable: false,
	selectable: true,
	itemable: true,
	executable: true,
	fileDroppable: false,
} as const satisfies DiagramFeatures;

/**
 * Data type for Ai diagrams.
 * Contains properties specific to AI chat diagram elements with avatar, speech bubble, and chat input.
 */
export type AiData = CreateDataType<typeof AiFeatures> & {
	/** Avatar image URL or emoji */
	avatarUrl?: string;
	/** Avatar background color */
	avatarBgColor: string;
	/** Speech bubble background color */
	bubbleBgColor: string;
	/** Last AI message */
	aiMessage: string;
};
