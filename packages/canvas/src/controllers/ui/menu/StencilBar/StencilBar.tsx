import { memo, useLayoutEffect, useRef } from "react";

import { StencilBarContainer, StencilBarDivider } from "./StencilBarStyled";
import { computeStencilBarTop } from "./utils/computeStencilBarTop";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { OTHER_SHAPES_BUTTON_TARGET_ID } from "../../../gestures/handlers/menu/utils/otherShapesTargetIds";
import { ShapesIcon } from "../../icons/ShapesIcon";
import type { Stencil } from "../../objects/Stencil";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";
import { ToolbarToggleButton } from "../Toolbar/ToolbarStyled";

type StencilBarProps = {
	/** Presets pinned on the bar, already resolved (see resolveStencilBarPresets). */
	presets: readonly Stencil[];
	/** ID of the stencil currently being drawn (for the tool's active state) */
	activePresetId: string | null;
	/** Whether the Other shapes popover is open, which the button shows pressed. */
	isOtherShapesPopoverOpen: boolean;
};

/**
 * The stencil bar: the pinned presets, then a divider and the "Other
 * shapes" button, in one column down the viewport's left edge. When Canvas
 * shows it: see its `stencilBar` prop.
 *
 * The button is a menu target of its own (`other-shapes-button`, taken by
 * OtherShapesToggleHandler) that opens and closes the OtherShapesPopover,
 * which Canvas draws beside the bar and outside it.
 *
 * The presets are the same StencilLibraryItem the top bar and the shape
 * library draw, so a click arms or places and a drag places exactly as there
 * (StencilLibraryItemHandler). The bar itself is the `stencil-bar` menu
 * target, so a press on its empty area dismisses the open menus as one on the
 * top bar's does (ToolbarHandler).
 */
const StencilBarComponent: React.FC<StencilBarProps> = ({
	presets,
	activePresetId,
	isOtherShapesPopoverOpen,
}) => {
	const messages = useCanvasMessages();
	const barRef = useRef<HTMLDivElement>(null);

	// Centred by hand rather than by auto margins, which land on a half pixel
	// whenever the band and the bar differ in height by an odd number and blur
	// the icons. The band is StencilBarDock, the bar's parent. Written to the
	// element straight from the observer, so a resize is placed in the frame it
	// is laid out in.
	useLayoutEffect(() => {
		const bar = barRef.current;
		const band = bar?.parentElement;
		if (!bar || !band) {
			return;
		}
		const placeBar = (): void => {
			bar.style.marginTop = `${computeStencilBarTop(band.clientHeight, bar.offsetHeight)}px`;
		};
		placeBar();
		const resizeObserver = new ResizeObserver(placeBar);
		resizeObserver.observe(band);
		resizeObserver.observe(bar);
		return () => resizeObserver.disconnect();
	}, []);

	return (
		<StencilBarContainer
			ref={barRef}
			data-kind="menu"
			data-id="stencil-bar"
			data-gesture="native-wheel"
		>
			{presets.map((preset) => (
				<StencilLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
			{presets.length > 0 && <StencilBarDivider />}
			<ToolbarToggleButton
				type="button"
				aria-label={messages.stencilBarOtherShapes}
				title={messages.stencilBarOtherShapes}
				aria-haspopup="dialog"
				aria-expanded={isOtherShapesPopoverOpen}
				isOpen={isOtherShapesPopoverOpen}
				data-kind="menu"
				data-id={OTHER_SHAPES_BUTTON_TARGET_ID}
				data-testid="stencil-bar-other-shapes"
			>
				<ShapesIcon />
			</ToolbarToggleButton>
		</StencilBarContainer>
	);
};

export const StencilBar = memo(StencilBarComponent);
