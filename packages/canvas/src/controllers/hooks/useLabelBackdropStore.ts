import { useLayoutEffect, useRef } from "react";

import type { WritableLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { createLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { useConstant } from "../../foundation/hooks/useConstant";
import type { LabelBackdropStore } from "../../rendering/objects/LabelBackdropStoreContext";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { resolveLabelBackdrops } from "../utils/resolveLabelBackdrops";
import type {
	LabelBackdropDrag,
	LabelBackdropRegistries,
} from "../utils/resolveLabelBackdrops";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

type UseLabelBackdropStoreParams = {
	/**
	 * The objects as drawn, the text editor's draft included (useTextEditSession),
	 * and a connector label under edit placed where its editor sits
	 * (graftConnectorLabelDraft).
	 */
	objects: Record<string, ObjectState>;
	/** The connector whose label is open in the editor, null when none is: its label is taken even while empty. */
	labelEditOwnerId: string | null;
	rootIds: readonly string[];
	/** The counter from `useDocFonts`: a face landing re-sizes the labels, and so their backdrops. */
	fontsNonce: number;
	/** What a running export draws, or null while none runs (useSnapshotRenderScope). */
	snapshotRenderScope: SnapshotRenderScope | null;
	/**
	 * The drag under way, null while none is: read, not compared, so a frame
	 * whose objects stand works nothing out. Its ending is compared, so the
	 * centers a drag took from the start route or held off screen are worked out
	 * exactly once it is over.
	 */
	drag: LabelBackdropDrag | null;
	registries: LabelBackdropRegistries;
};

/** What the layers were last worked out from, compared by reference. */
type BackdropInputs = {
	objects: Record<string, ObjectState>;
	rootIds: readonly string[];
	fontsNonce: number;
	labelEditOwnerId: string | null;
	/** Whether a drag was under way. */
	isDragging: boolean;
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
	inputs.labelEditOwnerId === otherInputs.labelEditOwnerId &&
	inputs.isDragging === otherInputs.isDragging &&
	inputs.renderScope === otherInputs.renderScope;

/**
 * Owns the backdrop store the labels read through `LabelBackdropStoreContext`
 * (resolveLabelBackdrops): one instance for the canvas's lifetime.
 *
 * The layers are worked out again during render, whenever an input differs
 * from the last time they were (not from the previous render), so whatever
 * changed the document — an edit, undo, a paste, an external sync, a typed
 * character, every frame of a drag that moves or reshapes something — is picked
 * up without naming it. A drag that changes no object (a pan, a marquee) leaves
 * the inputs as they were, and works nothing out. A running export's scope is
 * an input too, so it is worked out for what it draws and the whole document
 * again once it ends.
 *
 * The new layers are written without notifying, so the labels rendered after
 * this in the same pass read them. Labels a memo skips are notified in a
 * layout effect, before the paint; nothing is notified during render.
 *
 * @returns The store, its identity fixed
 */
export const useLabelBackdropStore = ({
	objects,
	labelEditOwnerId,
	rootIds,
	fontsNonce,
	snapshotRenderScope,
	drag,
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
	const inputs: BackdropInputs = {
		objects,
		rootIds,
		fontsNonce,
		labelEditOwnerId,
		isDragging: drag !== null,
		renderScope,
	};
	if (
		lastInputsRef.current === null ||
		!isSameInputs(lastInputsRef.current, inputs)
	) {
		lastInputsRef.current = inputs;
		const hasChanged = store.replaceLayers(
			resolveLabelBackdrops(
				objects,
				rootIds,
				registries,
				renderScope ?? undefined,
				labelEditOwnerId ?? undefined,
				drag ?? undefined,
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
