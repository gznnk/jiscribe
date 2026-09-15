import type { ComponentType } from "react";

import { useToolbarCommandState } from "./ToolbarCommandStateContext";
import { ToolbarIconButton } from "./ToolbarStyled";
import { commandPart } from "../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { getCommandLabel } from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import {
	resolveLocalizedLabel,
	type LocaleMessages,
} from "../../../messages/resolveLocaleMessages";
import type { StencilIconProps } from "../../objects/Stencil";

type ToolbarCommandButtonProps = {
	/** Id of the command the press dispatches; also keys the resolver lookup. */
	commandId: string;
	/** The button's glyph. Carried by the item because `Command` has none. */
	icon: ComponentType<StencilIconProps>;
	/** Overrides the command's own label (tooltip and aria-label); see ToolbarItem. */
	label?: string | LocaleMessages<string>;
};

/**
 * One `command` item of the toolbar.
 *
 * The only part of the bar that reads {@link useToolbarCommandState}, together
 * with {@link ToolbarZoomGroup}: the press itself goes through the gesture
 * system (`data-part` → ToolbarHandler → handleCommand), and only the disabled
 * look needs the current state.
 *
 * Draws nothing when the id is not registered, matching the silent drop
 * `resolveToolbarSections` already performs on the declaration.
 *
 * Not `memo`-wrapped: it subscribes to ToolbarCommandStateContext, whose value
 * is rebuilt on every Canvas render, and the bar re-renders only when Canvas
 * does — so a memo here could never skip a render, only imply it did.
 */
export const ToolbarCommandButton: React.FC<ToolbarCommandButtonProps> = ({
	commandId,
	icon: Icon,
	label,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const resolved = useToolbarCommandState()(commandId);

	if (!resolved) {
		return null;
	}

	const resolvedLabel =
		label === undefined
			? getCommandLabel(messages, resolved.command)
			: resolveLocalizedLabel(label, locale);

	return (
		<ToolbarIconButton
			type="button"
			aria-label={resolvedLabel}
			title={resolvedLabel}
			disabled={!resolved.enabled}
			data-testid={`toolbar-command:${commandId}`}
			data-part={commandPart(commandId)}
		>
			<Icon />
		</ToolbarIconButton>
	);
};
