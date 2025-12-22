import type { TextableType } from "../../core/TextableType";
import type { TextAlign } from "../../core/TextAlign";
import type { VerticalAlign } from "../../core/VerticalAlign";

/**
 * Interface for diagram elements that can display and edit text.
 * Provides properties to control text content, appearance, and editing state.
 */
export type TextableData = {
	text: string;
	textType: TextableType;
	textAlign: TextAlign;
	verticalAlign: VerticalAlign;
	fontColor: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};
