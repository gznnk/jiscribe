import type { CanvasSelection } from "../../CanvasSelection";
import type { ObjectPartSelection } from "../../ObjectPartSelection";

/**
 * A selection to put in `CanvasControllerState.selection`, stated as a fixture
 * rather than built up by the writers.
 *
 * @param objectIds - The selected ids, in selection order; empty for nothing
 *   selected. Taken verbatim, so a fixture can hold an id the objects no longer
 *   have
 * @param part - What is picked one level below the object, omitted for nothing.
 *   Taken verbatim too: the sole-selection rule the reducer keeps
 *   (reconcileObjectPartSelection) is not enforced here, so a fixture can state
 *   the state a reconcile is expected to clean up
 * @returns The selection
 */
export const selectionOf = (
	objectIds: readonly string[],
	part: ObjectPartSelection | null = null,
): CanvasSelection => ({ objectIds, part });
