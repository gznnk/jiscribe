import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/TextSlot";
import { isTextRows } from "@jiscribe/doc/model/objects/types/TextSlot";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";

import { CONNECTOR_LABEL_DEFAULTS } from "../../rendering/objects/connector/ConnectorLabel/utils/connectorLabelLayout";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";

/** One face a document draws in, in the three fields the CSS font shorthand names it by. */
type DocFontFace = {
	/** CSS font-style the face is asked for ("normal" / "italic"). */
	fontStyle: string;
	/** CSS font-weight the face is asked for ("normal" / "bold" / "600" / …). */
	fontWeight: string;
	/** CSS font-family list, the whole stack as the document stores it. */
	fontFamily: string;
};

/**
 * One face plus the characters the document draws with it — the pair
 * `document.fonts.load` takes, which with unicode-range subsets is the only way
 * to say which subsets are actually needed.
 */
export type DocFontRequest = DocFontFace & {
	/**
	 * The characters that face has to draw, de-duplicated and in no particular
	 * order. Never empty and never whitespace alone.
	 */
	text: string;
};

/** Identity of a face, for merging the characters of every slot that resolves to it. */
const buildFaceKey = (face: DocFontFace): string =>
	`${face.fontStyle}\n${face.fontWeight}\n${face.fontFamily}`;

/**
 * The faces a document needs, with the characters each one draws.
 *
 * Content-derived boxes are measured in JS the moment the doc is mapped, so a
 * host that has not fetched the faces yet measures against the fallback. Handing
 * this to `document.fonts.load` is what makes the browser fetch exactly the
 * subsets the document draws from (see useDocFontsPreload).
 *
 * @param objects - The state's object map (`state.objects`); every entry is read, groups included, and children are entries of their own so nothing recurses
 * @param textStyleDefaults - The per-type text-style defaults, resolved into each slot the same way the drawing and the measuring sides resolve it
 * @returns One request per distinct face, in first-seen order; `[]` for a document that draws no text
 */
export const collectDocFontRequests = (
	objects: Record<string, ObjectState>,
	textStyleDefaults: Pick<ObjectTextStyleDefaultsRegistry, "resolveSlotStyle">,
): DocFontRequest[] => {
	const entryByFaceKey = new Map<
		string,
		{ face: DocFontFace; characters: Set<string> }
	>();

	const addText = (face: DocFontFace, text: string): void => {
		if (text.trim() === "") {
			return;
		}
		const key = buildFaceKey(face);
		let entry = entryByFaceKey.get(key);
		if (entry === undefined) {
			entry = { face, characters: new Set<string>() };
			entryByFaceKey.set(key, entry);
		}
		for (const character of text) {
			// Row separators are authored, not drawn, so no face has to cover them.
			if (character !== "\n" && character !== "\r") {
				entry.characters.add(character);
			}
		}
	};

	const addRichText = (face: DocFontFace, body: RichText): void => {
		if (typeof body === "string") {
			addText(face, body);
			return;
		}
		for (const run of body) {
			addText(
				{
					fontStyle: run.fontStyle ?? face.fontStyle,
					fontWeight: run.fontWeight ?? face.fontWeight,
					fontFamily: run.fontFamily ?? face.fontFamily,
				},
				run.text,
			);
		}
	};

	const addSlot = (type: ObjectType, slotId: string, slot: TextSlot): void => {
		const style = textStyleDefaults.resolveSlotStyle(type, slotId, slot);
		const face: DocFontFace = {
			fontStyle: style.fontStyle ?? TEXT_STYLE_FALLBACK.fontStyle,
			fontWeight: style.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
			fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		};
		if (isTextRows(slot.text)) {
			for (const row of slot.text) {
				addRichText(face, row);
			}
			return;
		}
		addRichText(face, slot.text);
	};

	const addConnectorLabel = (label: ConnectorLabel): void => {
		addText(
			{
				// A label carries no fontStyle at all, so it is always drawn upright.
				fontStyle: TEXT_STYLE_FALLBACK.fontStyle,
				fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
				fontFamily: label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily,
			},
			label.text,
		);
	};

	for (const object of Object.values(objects)) {
		if (isConnectorState(object)) {
			if (object.label !== undefined) {
				addConnectorLabel(object.label);
			}
			continue;
		}
		if (!isTextStyleState(object) || object.text === undefined) {
			continue;
		}
		for (const [slotId, slot] of Object.entries(object.text)) {
			addSlot(object.type, slotId, slot);
		}
	}

	return [...entryByFaceKey.values()].map(({ face, characters }) => ({
		...face,
		text: [...characters].join(""),
	}));
};
