import {
	isViewOpenMode,
	isViewScrollMode,
} from "@jiscribe/doc/model/canvas/ViewDoc";

import { applyStylePropertyPart } from "./utils/applyStylePropertyPart";
import { parseMenuPart } from "./utils/menuParts";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import type { DocumentPropertyUpdate } from "../../../reducer/CanvasActions";
import {
	applyDocumentProperty,
	canApplyDocumentProperty,
	isViewPaddingProperty,
} from "../../../utils/applyDocumentProperty";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * Reads a `doc:` part's text into a document update, or null when the setting is
 * unknown or the text is not a value it takes (a view mode outside its set, a
 * padding side that is not a number, null for a padding side).
 */
const toDocumentPropertyUpdate = (
	property: string,
	value: string | null,
): DocumentPropertyUpdate | null => {
	if (property === "background") {
		return { property, value };
	}
	if (property === "view.open") {
		return value === null || isViewOpenMode(value) ? { property, value } : null;
	}
	if (property === "view.scroll") {
		return value === null || isViewScrollMode(value)
			? { property, value }
			: null;
	}
	if (isViewPaddingProperty(property) && value !== null) {
		const side = Number(value);
		return Number.isFinite(side) ? { property, value: side } : null;
	}
	return null;
};

/**
 * GestureHandler for the properties sidebar.
 * Handles events with targetKind "menu" and targetId "property-panel": the
 * panel's container carries the pair, and everything inside it — its own chrome
 * and the controls of every section, the dropdowns portalled into it included —
 * carries only a data-part.
 *
 * targetPart format (built and parsed by utils/menuParts.ts):
 * - `command:{commandId}` → execute the command (the close button is
 *   `command:togglePropertyPanel`, the same route as the toolbar's toggle; the
 *   Arrange buttons run the stacking-order commands).
 * - `toggle:{sectionId}` → collapse that section, or expand it when already
 *   collapsed (click acts as a toggle), the way the shape library's own section
 *   headers do.
 * - `set:{property}:{value}` / `slider:{property}` → write a style property of
 *   the selection (applyStylePropertyPart, shared with ObjectMenuHandler).
 * - `doc:{property}:{value}` → state one of the document's own settings (the
 *   Canvas section's buttons), through the same state change the
 *   DOCUMENT_PROPERTY_UPDATE reducer case makes. A value the document already
 *   holds is a no-op; one the setting does not take is a no-op that warns.
 *
 * Every press in the panel — on a control, or on the background, the header, the
 * padding around a section — does the light dismiss the toolbar does: it closes
 * the context menu and any open category flyout, and leaves the selection alone.
 * The panel is persistent chrome, so a press on it never closes the panel.
 */
export const PropertyPanelHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return (
			event.targetKind === "menu" &&
			event.targetId === "property-panel" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		if (event.type === "pressed") {
			nextState = {
				...nextState,
				contextMenuPosition: null,
				stencilLibraryOpenCategory: null,
			};
		}

		const part = parseMenuPart(event.targetPart);

		const styledState = applyStylePropertyPart(
			nextState,
			event,
			part,
			registries,
		);
		if (styledState !== null) {
			return styledState;
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (!isActivation || part === null) {
			return nextState;
		}

		if (part.kind === "command") {
			return handleCommand(nextState, part.commandId, registries);
		}

		if (part.kind === "toggle") {
			const sectionId = part.id;
			const collapsedIds = nextState.propertyPanel.collapsedSectionIds;
			return {
				...nextState,
				propertyPanel: {
					...nextState.propertyPanel,
					collapsedSectionIds: collapsedIds.includes(sectionId)
						? collapsedIds.filter((id) => id !== sectionId)
						: [...collapsedIds, sectionId],
				},
			};
		}

		if (part.kind === "doc") {
			const update = toDocumentPropertyUpdate(part.property, part.value);
			if (update === null || !canApplyDocumentProperty(update)) {
				console.warn(
					`[PropertyPanelHandler] Unknown document setting or value: ${event.targetPart}`,
				);
				return nextState;
			}
			const updatedState = applyDocumentProperty(nextState, update);
			if (updatedState === nextState) {
				return nextState;
			}
			// History recording is delegated to handleGesture's caller, as for the
			// set: parts.
			return {
				...updatedState,
				commitVersion: nextState.commitVersion + 1,
			};
		}

		return nextState;
	},
};
