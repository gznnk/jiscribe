import { collectStyleTargets } from "./collectStyleTargets";
import {
	graftStyleTextEdit,
	resolveStyleTextEdit,
} from "./resolveStyleTextEdit";
import { combineSelectionValues } from "./SelectionValue";
import type { SelectionValue } from "./SelectionValue";
import type { StyleEntryValueType, StyleTable } from "./StyleEntry";
import { styleEntryOf } from "./styleEntryOf";
import type { StyleIntentValueType } from "./StyleIntent";
import type { StyleIntentRegistries } from "./StyleIntentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * What the whole selection says about one style intent: every place the intent
 * would land, read through its own type's entry and folded into one answer.
 *
 * The same walk `applyStyleIntent` writes along, so a row states the value of
 * exactly the objects a write would reach — the object an editor is open on
 * included, read with the draft grafted into the slot being edited
 * (resolveStyleTextEdit), which is what makes the rows follow the text on screen.
 * Values come out of `read` already resolved through the type's defaults, which is
 * why two shapes drawn alike read as one value whether or not they both spell it
 * out.
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

	const textEdit = resolveStyleTextEdit(state);
	const values: unknown[] = [];

	for (const { object, pick, selected } of collectStyleTargets(state)) {
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
