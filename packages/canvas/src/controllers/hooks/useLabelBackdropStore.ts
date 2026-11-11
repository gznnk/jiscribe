import { useLayoutEffect, useRef } from "react";

import type { WritableLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { createLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { useConstant } from "../../foundation/hooks/useConstant";
import type { LabelBackdropStore } from "../../rendering/objects/LabelBackdropStoreContext";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { resolveLabelBackdrops } from "../utils/resolveLabelBackdrops";
import type { LabelBackdropRegistries } from "../utils/resolveLabelBackdrops";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

type UseLabelBackdropStoreParams = {
	/** The objects as drawn, the text editor's draft included (useTextEditSession). */
	objects: Record<string, ObjectState>;
	rootIds: readonly string[];
	/** The counter from `useDocFonts`: a face landing re-sizes the labels, and so their backdrops. */
	fontsNonce: number;
	/** What a running export draws, or null while none runs (useSnapshotRenderScope). */
	snapshotRenderScope: SnapshotRenderScope | null;
	/** True while any drag is under way (`state.drag !== null`). */
	isDragging: boolean;
	registries: LabelBackdropRegistries;
};

/** What the layers were last worked out from, compared by reference. */
type BackdropInputs = {
	objects: Record<string, ObjectState>;
	rootIds: readonly string[];
	fontsNonce: number;
	/** The export's set, or null for the whole tree (no export, or one drawing `"all"`). */
	renderScope: ReadonlySet<string> | null;
};

const isSameInputs = (
	inputs: BackdropInputs,
	otherInputs: BackdropInputs,
): boolean =>
	inputs.objects === otherInputs.objects &&
	inputs.rootIds === otherInputs.rootIds &&
	inputs.fontsNonce === otherInputs.fontsNonce &&
	inputs.renderScope === otherInputs.renderScope;

/**
 * Owns the backdrop store the labels read through `LabelBackdropStoreContext`
 * (resolveLabelBackdrops): one instance for the canvas's lifetime.
 *
 * The layers are worked out again during render, whenever an input differs
 * from the last time they were (not from the previous render), so whatever
 * changed the document — an edit, undo, a paste, an external sync, a typed
 * character — is picked up without naming it. While a drag is under way
 * nothing is worked out and the labels keep their layers; the render ending
 * the drag compares again, so a drag whose end leaves `objects` as it was
 * still has its changes picked up. A running export is the exception: its
 * scope is worked out even mid-drag, so it draws no frame outside it.
 *
 * The new layers are written without notifying, so the labels rendered after
 * this in the same pass read them. Labels a memo skips are notified in a
 * layout effect, before the paint; nothing is notified during render.
 *
 * @returns The store, its identity fixed
 */
export const useLabelBackdropStore = ({
	objects,
	rootIds,
	fontsNonce,
	snapshotRenderScope,
	isDragging,
	registries,
}: UseLabelBackdropStoreParams): LabelBackdropStore => {
	const store = useConstant<WritableLabelBackdropStore>(
		createLabelBackdropStore,
	);
	const lastInputsRef = useRef<BackdropInputs | null>(null);
	const hasPendingNotifyRef = useRef(false);

	const renderScope =
		snapshotRenderScope === null || snapshotRenderScope === "all"
			? null
			: snapshotRenderScope;
	const inputs: BackdropInputs = { objects, rootIds, fontsNonce, renderScope };
	const isHeldByDrag = isDragging && renderScope === null;
	if (
		!isHeldByDrag &&
		(lastInputsRef.current === null ||
			!isSameInputs(lastInputsRef.current, inputs))
	) {
		lastInputsRef.current = inputs;
		const hasChanged = store.replaceLayers(
			resolveLabelBackdrops(
				objects,
				rootIds,
				registries,
				renderScope ?? undefined,
			),
		);
		if (hasChanged) {
			hasPendingNotifyRef.current = true;
		}
	}

	useLayoutEffect(() => {
		if (hasPendingNotifyRef.current) {
			hasPendingNotifyRef.current = false;
			store.notify();
		}
	});

	return store;
};
