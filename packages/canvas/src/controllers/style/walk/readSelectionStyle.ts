import { collectStyleTargets } from "./collectStyleTargets";
import type { StyleTarget } from "./collectStyleTargets";
import {
	graftStyleTextEdit,
	readOpenTextEditForStyle,
} from "./readOpenTextEditForStyle";
import type { StyleTextEdit } from "./readOpenTextEditForStyle";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { combineSelectionValues } from "../SelectionValue";
import type { SelectionValue } from "../SelectionValue";
import type { StyleEntryValueType, StyleTable } from "../StyleEntry";
import type { StyleIntentValueType } from "../StyleIntent";
import type { StyleIntentRegistries } from "./StyleIntentRegistries";
import { styleEntryOf } from "../tables/styleEntryOf";

/**
 * What the whole selection says about one style intent: every place the intent
 * would land, read through its own type's entry and folded into one answer.
 *
 * The same walk `applyStyleIntent` writes along, so a row states the value of
 * exactly the objects a write would reach — the object an editor is open on
 * included, read with the draft grafted into the slot being edited
 * (readOpenTextEditForStyle), which is what makes the rows follow the text on
 * screen. Values come out of `read` already resolved through the type's
 * defaults, which is why two shapes drawn alike read as one value whether or
 * not they both spell it out.
 *
 * Handing the table a type declared (ObjectTypeDefinition.styleEntries) ahead of the
 * kind is the same read, typed from that declaration: the table is taken for its
 * type alone, the walk still looking the entry up on each target's registered
 * table.
 *
 * @param state - The canvas state; its selection decides who is read
 * @param kind - The intent to report: one of the core kinds, which fixes the value type, or a kind a type declared for itself, which cannot
 * @param registries - The canvas's style tables and the defaults its entries resolve through
 * @returns `single` / `mixed` / `none`, the last meaning nothing the selection reaches takes the intent
 */
export function readSelectionStyle<TKind extends string>(
	state: CanvasControllerState,
	kind: TKind,
	registries: StyleIntentRegistries,
): SelectionValue<StyleIntentValueType<TKind>>;
/**
 * @param state - The canvas state; its selection decides who is read
 * @param table - The table the kind is declared in, for its type alone; the walk reads each target's own registered table
 * @param kind - The intent to report, a key of `table`
 * @param registries - The canvas's style tables and the defaults its entries resolve through
 * @returns `single` / `mixed` / `none`, over the value type that table's entry works in
 */
export function readSelectionStyle<
	TTable extends StyleTable<ObjectState>,
	TKind extends keyof TTable & string,
>(
	state: CanvasControllerState,
	table: TTable,
	kind: TKind,
	registries: StyleIntentRegistries,
): SelectionValue<StyleEntryValueType<TTable[TKind]>>;
export function readSelectionStyle(
	state: CanvasControllerState,
	kindOrTable: string | StyleTable<ObjectState>,
	kindOrRegistries: string | StyleIntentRegistries,
	tableRegistries?: StyleIntentRegistries,
): SelectionValue<unknown> {
	// The declared-table signature only types the answer; the walk takes the kind
	// and the registries either way.
	const isKindFirst = typeof kindOrTable === "string";
	const kind = isKindFirst ? kindOrTable : (kindOrRegistries as string);
	const registries = isKindFirst
		? (kindOrRegistries as StyleIntentRegistries)
		: (tableRegistries as StyleIntentRegistries);

	return readStyleOverTargets(
		collectStyleTargets(state),
		readOpenTextEditForStyle(state),
		kind,
		registries,
	);
}

/** The fields of the state a selection's style is read from. */
export type SelectionStyleSource = Pick<
	CanvasControllerState,
	"objects" | "selection" | "textEditState"
>;

/** {@link readSelectionStyle} bound to one state, asked for one kind at a time. */
export type SelectionStyleRead = <TKind extends string>(
	kind: TKind,
) => SelectionValue<StyleIntentValueType<TKind>>;

/**
 * Binds {@link readSelectionStyle} to one state, walking the selection once and
 * keeping each kind's answer, so the rows of a surface asking for a kind each
 * do not walk it again per row.
 *
 * @param source - What the walk reads; the reader answers for these references only, so make a new one when any of them changes
 * @param registries - The canvas's style tables and the defaults its entries resolve through
 * @returns The reader; the walk runs on its first call, and asking for a kind again returns the same `SelectionValue` object
 */
export const createSelectionStyleReader = (
	source: SelectionStyleSource,
	registries: StyleIntentRegistries,
): SelectionStyleRead => {
	let walked: {
		targets: StyleTarget[];
		textEdit: StyleTextEdit | null;
	} | null = null;
	const valueByKind = new Map<string, SelectionValue<unknown>>();

	function read<TKind extends string>(
		kind: TKind,
	): SelectionValue<StyleIntentValueType<TKind>>;
	function read(kind: string): SelectionValue<unknown> {
		const known = valueByKind.get(kind);
		if (known !== undefined) {
			return known;
		}
		walked ??= {
			targets: collectStyleTargets(source),
			textEdit: readOpenTextEditForStyle(source),
		};
		const value = readStyleOverTargets(
			walked.targets,
			walked.textEdit,
			kind,
			registries,
		);
		valueByKind.set(kind, value);
		return value;
	}
	return read;
};

/** Folds what `kind` reads on every target, the open edit grafted onto its own object. */
function readStyleOverTargets(
	targets: readonly StyleTarget[],
	textEdit: StyleTextEdit | null,
	kind: string,
	registries: StyleIntentRegistries,
): SelectionValue<unknown> {
	const values: unknown[] = [];

	for (const { object, pick, selected } of targets) {
		const entry = styleEntryOf(registries.objectStyle.get(object.type), kind);
		if (entry === undefined) {
			continue;
		}
		const target =
			textEdit !== null && textEdit.objectId === object.id
				? graftStyleTextEdit(object, textEdit)
				: object;
		values.push(
			...entry.read(target, pick, {
				selected,
				shapeStyleDefaults: registries.objectShapeStyleDefaults,
				textStyleDefaults: registries.objectTextStyleDefaults,
				objectPartKind: registries.objectPartKind,
				textEditRange: textEdit?.range ?? null,
			}),
		);
	}

	return combineSelectionValues(values);
}
