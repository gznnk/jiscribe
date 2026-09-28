import {
	mergeViewDoc,
	type ViewParams,
} from "@jiscribe/doc/model/canvas/mergeViewDoc";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/resolveViewPadding";
import type {
	ViewDoc,
	ViewPaddingDoc,
} from "@jiscribe/doc/model/canvas/ViewDoc";

import type { CanvasControllerState } from "../CanvasTypes";
import type {
	DocumentProperty,
	DocumentPropertyUpdate,
} from "../reducer/CanvasActions";

type ViewPaddingProperty = Extract<DocumentProperty, `view.padding.${string}`>;

type ViewPaddingUpdate = DocumentPropertyUpdate<ViewPaddingProperty>;

const PADDING_SIDE_BY_PROPERTY: Record<
	ViewPaddingProperty,
	keyof ViewPaddingDoc
> = {
	"view.padding.top": "top",
	"view.padding.right": "right",
	"view.padding.bottom": "bottom",
	"view.padding.left": "left",
};

/**
 * Whether a name is one of the four `view.padding.*` document settings.
 *
 * @param property - Any name, typically read out of a DOM part; only the exact four pass
 */
export const isViewPaddingProperty = (
	property: string,
): property is ViewPaddingProperty =>
	Object.prototype.hasOwnProperty.call(PADDING_SIDE_BY_PROPERTY, property);

const isViewPaddingUpdate = (
	update: DocumentPropertyUpdate,
): update is ViewPaddingUpdate => isViewPaddingProperty(update.property);

/** Whether two declarations make every host do the same thing; an omitted side and a side of 0 agree. */
const isSameViewDoc = (
	leftView: ViewDoc | undefined,
	rightView: ViewDoc | undefined,
): boolean => {
	if (
		leftView?.open !== rightView?.open ||
		leftView?.scroll !== rightView?.scroll
	) {
		return false;
	}
	const leftPadding = resolveViewPadding(leftView?.padding);
	const rightPadding = resolveViewPadding(rightView?.padding);
	return (
		leftPadding.top === rightPadding.top &&
		leftPadding.right === rightPadding.right &&
		leftPadding.bottom === rightPadding.bottom &&
		leftPadding.left === rightPadding.left
	);
};

/** The params one `view.*` update amounts to; a padding side is merged into the sides already declared. */
const toViewParams = (
	srcView: ViewDoc | undefined,
	update: Exclude<DocumentPropertyUpdate, { property: "background" }>,
): ViewParams => {
	switch (update.property) {
		case "view.open":
			return { open: update.value };
		case "view.scroll":
			return { scroll: update.value };
		default:
			return {
				padding: {
					...srcView?.padding,
					[PADDING_SIDE_BY_PROPERTY[update.property]]: update.value,
				},
			};
	}
};

/**
 * Whether a document update has a value the document can hold at all. Says
 * nothing about whether the document already holds it — the reducer tells those
 * apart: a commit of the value already in place is the normal end of a typed
 * edit (the preview applied it) and is recorded, while a value nothing can take
 * is a no-op whether previewed or committed.
 *
 * @param update - The setting and its value; only a padding side can be refused, when it is negative or not finite
 */
export const canApplyDocumentProperty = (
	update: DocumentPropertyUpdate,
): boolean => {
	return (
		!isViewPaddingUpdate(update) ||
		(Number.isFinite(update.value) && update.value >= 0)
	);
};

/**
 * States one of the document's own settings on the controller state: the
 * surface color, or one part of the display declaration normalized by
 * `mergeViewDoc`, the rules the headless `setView` op writes by too.
 *
 * Shared by the DOCUMENT_PROPERTY_UPDATE reducer case and the properties
 * sidebar's gesture route (PropertyPanelHandler), which differ only in how the
 * change reaches history.
 *
 * @param state - The state to edit; only `background` / `view` are read and written
 * @param update - The setting and its value; null drops that setting
 * @returns `state` itself when the document already says the same thing (a
 *   padding side of 0 agrees with an omitted one), and when
 *   {@link canApplyDocumentProperty} refuses the value
 */
export const applyDocumentProperty = (
	state: CanvasControllerState,
	update: DocumentPropertyUpdate,
): CanvasControllerState => {
	if (!canApplyDocumentProperty(update)) {
		return state;
	}
	if (update.property === "background") {
		const background = update.value ?? undefined;
		if (state.background === background) {
			return state;
		}
		return { ...state, background };
	}
	const view = mergeViewDoc(state.view, toViewParams(state.view, update));
	if (isSameViewDoc(state.view, view)) {
		return state;
	}
	return { ...state, view };
};
