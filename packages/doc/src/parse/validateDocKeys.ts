import { isObject, isString } from "@jiscribe/basic-validators";
import type { Point } from "@jiscribe/geometry";

import { CONNECTOR_LABEL_KEYS } from "../model/objects/connector/ConnectorDoc";
import {
	ANCHOR_SPEC_KEYS_BY_KIND,
	isAnchorKind,
	OWNED_ENDPOINT_REF_KEYS,
	OWNER_REF_KEYS,
} from "../model/objects/types/EndpointRef";
import { TEXT_RUN_KEYS } from "../model/objects/types/text/RichText";
import {
	TEXT_SLOT_KEYS,
	isIntegerLikeTextSlotId,
} from "../model/objects/types/text/TextSlot";
import { exhaustiveKeysOf } from "../model/objects/utils/exhaustiveKeys";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import { isSemanticError } from "../model/types/SemanticDiagnostic";
import type { DocKeyDeclaration } from "../registries/ObjectDocValidatorRegistry";

/** Segments from the validated object down to one key inside it. */
type KeyPath = readonly (string | number)[];

/** Field names one coordinate carries, shared by a poly vertex and a free anchor's point. */
const POINT_KEYS = exhaustiveKeysOf<Point>()(["x", "y"] as const);

/** `["text", 0, "zz"]` → `text[0].zz`: a numeric segment is an array position, a named one a field. */
const formatKeyPath = (keyPath: KeyPath): string =>
	keyPath.reduce<string>((formatted, segment) => {
		if (typeof segment === "number") {
			return `${formatted}[${segment}]`;
		}
		return formatted === "" ? segment : `${formatted}.${segment}`;
	}, "");

/**
 * Key paths of every own name of `container` that is not among `keys`. A value that
 * is not an object yields none: the walk reports names, and a container written as
 * something else entirely is the type validator's to reject.
 */
const collectUnknownKeyPaths = (
	container: unknown,
	keys: readonly string[],
	containerPath: KeyPath,
): KeyPath[] =>
	isObject(container)
		? Object.keys(container)
				.filter((key) => !keys.includes(key))
				.map((key) => [...containerPath, key])
		: [];

/** Unknown names inside one body of text: a plain string holds no run to walk into. */
const collectRunKeyPaths = (
	content: unknown,
	contentPath: KeyPath,
): KeyPath[] =>
	Array.isArray(content)
		? content.flatMap((run, index) =>
				collectUnknownKeyPaths(run, TEXT_RUN_KEYS, [...contentPath, index]),
			)
		: [];

/**
 * Unknown names inside one slot's content, which is either one body of text or a
 * list of rows. Read by shape alone (as isTextRows reads it): an entry that is an
 * array is a row held as runs, one that is an object is a run of a body.
 */
const collectSlotContentKeyPaths = (
	content: unknown,
	contentPath: KeyPath,
): KeyPath[] => {
	if (!Array.isArray(content)) {
		return [];
	}
	return content.flatMap((entry, index) =>
		Array.isArray(entry)
			? collectRunKeyPaths(entry, [...contentPath, index])
			: collectUnknownKeyPaths(entry, TEXT_RUN_KEYS, [...contentPath, index]),
	);
};

/** What walking a keyed text found: the unknown names, and the slot ids the key order would not survive. */
type TextSlotsFindings = {
	keyPaths: KeyPath[];
	integerLikeSlotIds: string[];
};

const collectTextSlotsFindings = (text: unknown): TextSlotsFindings => {
	const findings: TextSlotsFindings = { keyPaths: [], integerLikeSlotIds: [] };
	if (!isObject(text)) {
		return findings;
	}
	for (const [slotId, slot] of Object.entries(text)) {
		// The slot cannot be kept under that id at all, so what it holds is not
		// reported on top of it.
		if (isIntegerLikeTextSlotId(slotId)) {
			findings.integerLikeSlotIds.push(slotId);
			continue;
		}
		findings.keyPaths.push(
			...collectUnknownKeyPaths(slot, TEXT_SLOT_KEYS, ["text", slotId]),
			...(isObject(slot)
				? collectSlotContentKeyPaths(slot.text, ["text", slotId, "text"])
				: []),
		);
	}
	return findings;
};

/**
 * Unknown names inside one anchor. An anchor of a kind nothing declares is left
 * alone: which names it may carry follows from the kind, and the kind itself is
 * what the validator rejects.
 */
const collectAnchorKeyPaths = (
	anchor: unknown,
	anchorPath: KeyPath,
): KeyPath[] => {
	if (!isObject(anchor) || !isAnchorKind(anchor.kind)) {
		return [];
	}
	return [
		...collectUnknownKeyPaths(
			anchor,
			ANCHOR_SPEC_KEYS_BY_KIND[anchor.kind],
			anchorPath,
		),
		...(anchor.kind === "free"
			? collectUnknownKeyPaths(anchor.point, POINT_KEYS, [
					...anchorPath,
					"point",
				])
			: []),
	];
};

/** Unknown names inside one endpoint: the endpoint itself, its owner reference and its anchor. */
const collectEndpointKeyPaths = (
	endpoint: unknown,
	endpointPath: KeyPath,
): KeyPath[] => {
	if (!isObject(endpoint)) {
		return [];
	}
	return [
		...collectUnknownKeyPaths(endpoint, OWNED_ENDPOINT_REF_KEYS, endpointPath),
		...collectUnknownKeyPaths(endpoint.owner, OWNER_REF_KEYS, [
			...endpointPath,
			"owner",
		]),
		...collectAnchorKeyPaths(endpoint.anchor, [...endpointPath, "anchor"]),
	];
};

/** Unknown names inside what only a connector holds: its two endpoints and its label. */
const collectConnectorKeyPaths = (o: Record<string, unknown>): KeyPath[] => [
	...(["source", "target"] as const).flatMap((endpointKey) =>
		collectEndpointKeyPaths(o[endpointKey], [endpointKey]),
	),
	...collectUnknownKeyPaths(o.label, CONNECTOR_LABEL_KEYS, ["label"]),
];

/** Unknown names inside a poly geometry's vertices. */
const collectPolyPointKeyPaths = (points: unknown): KeyPath[] =>
	Array.isArray(points)
		? points.flatMap((point, index) =>
				collectUnknownKeyPaths(point, POINT_KEYS, ["points", index]),
			)
		: [];

/**
 * Builds the warning one unknown name is reported as. The object-level form names
 * the type alone; a nested one also names the container it sits in, since the same
 * name may be unknown in one container and expected in another.
 */
const toUnknownKeyWarning = (
	keyPath: KeyPath,
	path: string,
	type: string,
): SemanticDiagnostic => {
	const key = keyPath[keyPath.length - 1];
	const container = formatKeyPath(keyPath.slice(0, -1));
	const where =
		container === "" ? `on a "${type}"` : `in "${container}" of a "${type}"`;
	return {
		path: `${path}.${formatKeyPath(keyPath)}`,
		message: `Unknown property "${key}" ${where}: it was ignored and will be dropped on save.`,
		severity: "warning",
		unknownKeyPath: keyPath,
	};
};

/**
 * Reports every name the document wrote that the type does not hold — on the object
 * itself and inside the containers doc owns (runs, slots, poly vertices, a
 * connector's endpoints, anchors and label) — plus the one slot id the key order
 * cannot survive.
 *
 * The unknown names are warnings rather than errors: the canvas already drops such
 * a field on the way to the state, so the document still opens — it just loses the
 * field the next time it is saved, which is what the message says and what
 * `unknownKeyPath` lets the parser carry out. An integer-like slot id is an error
 * instead, there being no way to keep the slot where it was written.
 *
 * @param o - The object doc, read as a plain record; its `id` rides along on every diagnostic
 * @param path - JSON path of `o` itself, which every diagnostic is reported under
 * @param declaration - What the type holds, as the registry took it off the definition
 * @param typeDiagnostics - What the type's own validator returned; a diagnostic of
 *   this module at the path of an error there is dropped, the type having said it
 *   better (a record's root text styling, say)
 * @returns The slot-id errors first, then one warning per unknown name, outermost container first
 */
export const validateDocKeys = (
	o: Record<string, unknown>,
	path: string,
	declaration: DocKeyDeclaration,
	typeDiagnostics: readonly SemanticDiagnostic[],
): SemanticDiagnostic[] => {
	const { features } = declaration;
	const slots =
		features.text === "slots"
			? collectTextSlotsFindings(o.text)
			: { keyPaths: [], integerLikeSlotIds: [] };
	const keyPaths: KeyPath[] = [
		...Object.keys(o)
			.filter((key) => !declaration.knownKeys.has(key))
			.map((key) => [key]),
		...(features.geometry === "poly" ? collectPolyPointKeyPaths(o.points) : []),
		...(features.text === "body" ? collectRunKeyPaths(o.text, ["text"]) : []),
		...slots.keyPaths,
		...(features.type === "connector" ? collectConnectorKeyPaths(o) : []),
	];

	const diagnostics: SemanticDiagnostic[] = [
		...slots.integerLikeSlotIds.map((slotId) => ({
			path: `${path}.text.${slotId}`,
			message:
				"is a slot id the JS engine would re-order: name the slot something other than a plain number, the key order deciding the default slot and the drawing order.",
			severity: "error" as const,
			// No JSON schema can express which property names are canonical array indices.
			beyondSchema: true,
		})),
		...keyPaths.map((keyPath) =>
			toUnknownKeyWarning(keyPath, path, features.type),
		),
	];

	const errorPaths = new Set(
		typeDiagnostics
			.filter(isSemanticError)
			.map((diagnostic) => diagnostic.path),
	);
	return diagnostics
		.filter((diagnostic) => !errorPaths.has(diagnostic.path))
		.map((diagnostic) =>
			isString(o.id) ? { ...diagnostic, id: o.id } : diagnostic,
		);
};
