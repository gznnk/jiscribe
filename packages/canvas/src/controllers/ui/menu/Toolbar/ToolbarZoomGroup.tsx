import { useToolbarCommandState } from "./ToolbarCommandStateContext";
import { ToolbarIconButton, ZoomReadout } from "./ToolbarStyled";
import { commandPart } from "../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { ZoomInIcon } from "../../icons/ZoomInIcon";
import { ZoomOutIcon } from "../../icons/ZoomOutIcon";

type ToolbarZoomGroupProps = {
	/** Current zoom factor (1 = 100%), shown as a percentage on the readout. */
	zoom: number;
};

/**
 * The `zoom` item of the toolbar: `−` / readout / `+`.
 *
 * Engine-owned rather than three `command` items because the readout shows a
 * value no command can express; the three presses still go through the command
 * system. `resetZoom` runs from any zoom, so only the two steps can be
 * disabled.
 *
 * One of the two places that read {@link useToolbarCommandState} (see
 * {@link ToolbarCommandButton}).
 *
 * Not `memo`-wrapped: it subscribes to ToolbarCommandStateContext, whose value
 * is rebuilt on every Canvas render, and the bar re-renders only when Canvas
 * does — so a memo here could never skip a render, only imply it did.
 */
export const ToolbarZoomGroup: React.FC<ToolbarZoomGroupProps> = ({ zoom }) => {
	const messages = useCanvasMessages();
	const resolveCommand = useToolbarCommandState();

	return (
		<>
			<ToolbarIconButton
				type="button"
				aria-label={messages.toolbarZoomOut}
				title={messages.toolbarZoomOut}
				disabled={resolveCommand("zoomOut")?.enabled !== true}
				data-part={commandPart("zoomOut")}
			>
				<ZoomOutIcon />
			</ToolbarIconButton>
			<ZoomReadout
				type="button"
				aria-label={messages.toolbarResetZoom}
				title={messages.toolbarResetZoom}
				data-part={commandPart("resetZoom")}
			>
				{Math.round(zoom * 100)}%
			</ZoomReadout>
			<ToolbarIconButton
				type="button"
				aria-label={messages.toolbarZoomIn}
				title={messages.toolbarZoomIn}
				disabled={resolveCommand("zoomIn")?.enabled !== true}
				data-part={commandPart("zoomIn")}
			>
				<ZoomInIcon />
			</ToolbarIconButton>
		</>
	);
};
