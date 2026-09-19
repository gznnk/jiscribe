// What the page says about the person's changes a merge dropped (./mergeCanvasDocs),
// in words a person can place. An object is named by the text on it, or by its
// type where it carries none — never by its id, which for a pasted object is a
// UUID that means nothing to anyone looking at the canvas.

import type { CanvasDoc } from "@jiscribe/canvas";
import { isRichText, isTextRows, richTextToPlain } from "@jiscribe/doc";

import type { CanvasMergeConflict } from "./mergeCanvasDocs";

/** What the message opens with, the dropped changes following it */
export const MERGE_CONFLICT_MESSAGE_PREFIX =
	"他の編集で更新されたため、次の変更は保存されませんでした: ";

/** Past this many objects they are counted rather than named */
const MAX_NAMED_OBJECTS = 3;

/** How many characters of an object's text name it; an ellipsis stands for the rest */
const MAX_LABEL_LENGTH = 16;

/** What an object is called when it is in none of the docs looked through */
const UNKNOWN_OBJECT_NAME = "図形";

/** The document fields the format defines, by what the person knows them as */
const docFieldNames: Record<string, string> = {
	background: "背景色",
	view: "表示範囲",
};

type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Finds an object by id at any depth of one doc's tree, groups' members included */
const findObjectInTree = (
	objects: readonly unknown[],
	id: string,
): JsonRecord | null => {
	for (const object of objects) {
		if (!isJsonRecord(object)) {
			continue;
		}
		if (object.id === id) {
			return object;
		}
		if (Array.isArray(object.children)) {
			const found = findObjectInTree(object.children, id);
			if (found !== null) {
				return found;
			}
		}
	}
	return null;
};

/**
 * The characters of a `text` field in any of its forms: one body (a string or
 * styled runs), rows, or a slotted type's slots (the first slot holding any)
 */
const readTextContent = (content: unknown): string => {
	if (isTextRows(content)) {
		return content.map(richTextToPlain).join("\n");
	}
	if (isRichText(content)) {
		return richTextToPlain(content);
	}
	if (isJsonRecord(content)) {
		for (const slot of Object.values(content)) {
			const slotText = isJsonRecord(slot) ? readTextContent(slot.text) : "";
			if (slotText.trim() !== "") {
				return slotText;
			}
		}
	}
	return "";
};

/** The text an object shows, on one line and cut short; "" for none */
const readObjectLabel = (object: JsonRecord): string => {
	const connectorLabel = isJsonRecord(object.label) ? object.label.text : "";
	const text =
		readTextContent(object.text) ||
		(typeof connectorLabel === "string" ? connectorLabel : "");
	const characters = Array.from(text.replace(/\s+/g, " ").trim());
	return characters.length > MAX_LABEL_LENGTH
		? `${characters.slice(0, MAX_LABEL_LENGTH).join("")}…`
		: characters.join("");
};

/** An object's name: its text in brackets, else its type, else a plain "図形" */
const nameObject = (id: string, docs: readonly CanvasDoc[]): string => {
	for (const doc of docs) {
		const object = findObjectInTree(doc.root, id);
		if (object === null) {
			continue;
		}
		const label = readObjectLabel(object);
		if (label !== "") {
			return `「${label}」`;
		}
		return typeof object.type === "string" && object.type !== ""
			? object.type
			: UNKNOWN_OBJECT_NAME;
	}
	return UNKNOWN_OBJECT_NAME;
};

/**
 * Names in first-seen order, a name given more than once followed by how many
 * times ("rect 2 個"), since two objects with no text of their own read the same
 */
const countNames = (names: readonly string[]): string[] => {
	const counts = new Map<string, number>();
	for (const name of names) {
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts].map(([name, count]) =>
		count === 1 ? name : `${name} ${count} 個`,
	);
};

/**
 * The page's text for the person's changes a merge dropped, because the file had
 * changed the same things another way.
 *
 * @param conflicts What was dropped, as the merge names it; at least one. An
 *   object named by more than one conflict (changed and moved) is named once
 * @param docs Where the objects are looked up, in order: the file's doc first, since
 *   it is what is on screen now, then the person's, which still holds an object the
 *   file deleted. An object in neither is called "図形"
 * @returns The prefix followed by the objects — up to three by name, more counted
 *   as "N 個の図形" — then the stacking orders and document fields, joined by "、"
 */
export const formatMergeConflictMessage = (
	conflicts: readonly CanvasMergeConflict[],
	docs: readonly CanvasDoc[],
): string => {
	const objectIds = new Set<string>();
	const otherNames: string[] = [];
	for (const conflict of conflicts) {
		switch (conflict.kind) {
			case "object":
			case "placement":
				objectIds.add(conflict.id);
				break;
			case "order":
				otherNames.push(
					conflict.id === null
						? "重なり順"
						: `${nameObject(conflict.id, docs)} の中の重なり順`,
				);
				break;
			case "field":
				otherNames.push(docFieldNames[conflict.key] ?? conflict.key);
				break;
		}
	}
	const objectNames =
		objectIds.size > MAX_NAMED_OBJECTS
			? [`${objectIds.size} 個の図形`]
			: countNames([...objectIds].map((id) => nameObject(id, docs)));
	return `${MERGE_CONFLICT_MESSAGE_PREFIX}${[...objectNames, ...otherNames].join("、")}`;
};
