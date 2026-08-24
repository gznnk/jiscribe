import type {
	RichText,
	TextRun,
} from "@jiscribe/doc/model/objects/types/RichText";
import type React from "react";

import { resolveAutoColor } from "../../utils/resolveAutoColor";

/**
 * One run's characters, carrying only the typography it overrides: every field it
 * leaves unset is absent from the inline style, so it keeps inheriting the
 * TextContent box's (the slot's own styling).
 */
const TextRunSpan: React.FC<{ run: TextRun }> = ({ run }) => (
	<span
		style={{
			// Resolved with the same resolver as the box, so "auto" follows the theme
			// here too (issue #38).
			color:
				run.fontColor === undefined
					? undefined
					: resolveAutoColor(run.fontColor, "ink"),
			fontSize: run.fontSize,
			fontFamily: run.fontFamily,
			fontWeight: run.fontWeight,
			fontStyle: run.fontStyle,
			textDecoration: run.textDecoration,
		}}
	>
		{run.text}
	</span>
);

/**
 * Draws one body of text inside the shared content box: the string itself when
 * nothing in it is styled on its own, one `<span>` per run when parts of it are.
 *
 * An unstyled body deliberately renders as a bare text node, exactly as it did
 * before runs existed — the wrapping is what changes the DOM the export path
 * walks (foreignObjectToSvgText), so it is added only where it carries something.
 *
 * @param text - The body to draw; the plain form emits no element of its own
 */
export const RichTextContent: React.FC<{ text: RichText }> = ({ text }) => {
	if (typeof text === "string") {
		return <>{text}</>;
	}
	return (
		<>
			{text.map((run, index) => (
				// Runs are the parts of one text, so their position in it is the only
				// identity they have.
				<TextRunSpan key={index} run={run} />
			))}
		</>
	);
};
