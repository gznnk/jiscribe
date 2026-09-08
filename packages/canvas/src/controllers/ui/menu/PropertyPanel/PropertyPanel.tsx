import { memo, useState } from "react";

import { usePropertyPanelSections } from "./hooks/usePropertyPanelSections";
import { ArrowHeadsItem } from "./items/ArrowHeadsItem";
import type { BuiltinItemProps } from "./items/BuiltinItemProps";
import { BackgroundItem } from "./items/CanvasItems";
import {
	AutoHeightItem,
	LockAspectRatioItem,
	PositionItem,
	RotationItem,
	SizeItem,
} from "./items/LayoutItems";
import {
	FillItem,
	RadiusItem,
	StrokeColorItem,
	StrokeDashTypeItem,
	StrokeWidthItem,
} from "./items/ShapeStyleItems";
import { StackOrderItem } from "./items/StackOrderItem";
import {
	FontColorItem,
	FontFamilyItem,
	FontSizeItem,
	TextAlignItem,
	TextFormatItem,
	TextLayoutItem,
	TextVerticalBasisItem,
	VerticalAlignItem,
} from "./items/TextItems";
import { PropertyPanelOverlayHostContext } from "./PropertyPanelOverlayHostContext";
import {
	PropertyPanelBody,
	PropertyPanelCloseButton,
	PropertyPanelContainer,
	PropertyPanelHeader,
	PropertyPanelSectionBody,
	PropertyPanelSectionChevron,
	PropertyPanelSectionHeader,
	PropertyPanelSectionLabel,
	PropertyPanelTitle,
} from "./PropertyPanelStyled";
import type {
	PropertyPanelBuiltinItemKey,
	PropertyPanelDocumentUpdater,
	PropertyPanelTransformUpdater,
} from "./PropertyPanelTypes";
import { isCanvasSectionShown } from "./utils/isCanvasSectionShown";
import { resolvePropertyPanelSectionLabel } from "./utils/resolvePropertyPanelSectionLabel";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { isArrangeableSelection } from "../../../utils/isArrangeableSelection";
import { ChevronRightIcon } from "../../icons/ChevronRightIcon";
import { CloseIcon } from "../../icons/CloseIcon";
import type { StylePropertyUpdater } from "../ObjectMenu/ObjectMenuTypes";

type PropertyPanelProps = {
	/** The state the rows read: the draft-grafted objects, so a keystroke mid-edit shows here too. */
	canvasState: CanvasControllerState;
	/** Applies a style change; the same callback the ObjectMenu's own inputs are given. */
	onPropertyUpdate: StylePropertyUpdater;
	/** States one number of the selection's transform frame. */
	onTransformUpdate: PropertyPanelTransformUpdater;
	/** States one of the document's own settings, for the Canvas section. */
	onDocumentUpdate: PropertyPanelDocumentUpdater;
};

const CLOSE_ICON_SIZE = 14;
const CHEVRON_SIZE = 12;

/** Identity of the Canvas section: what it collapses under and reads its heading by. */
const CANVAS_SECTION_ID = "canvas";

/**
 * English wording of the Canvas heading, carried here the way a registered
 * section carries its own label — displayed only if a host drops the message.
 */
const CANVAS_SECTION_LABEL = "Canvas";

/**
 * Identity and English wording of the Arrange section: the stacking-order
 * commands, which belong to the selection rather than to any type, so the
 * panel adds the section itself after the per-type ones (the ObjectMenu's
 * system stack-order section, in sidebar form).
 */
const ARRANGE_SECTION_ID = "arrange";
const ARRANGE_SECTION_LABEL = "Arrange";

/**
 * The component each built-in item kind draws itself with. Exhaustive over
 * {@link PropertyPanelBuiltinItemKey}: a `custom` row never reaches the lookup,
 * being dispatched on the discriminator first.
 */
const ITEM_COMPONENTS: Record<
	PropertyPanelBuiltinItemKey,
	React.ComponentType<BuiltinItemProps>
> = {
	position: PositionItem,
	size: SizeItem,
	rotation: RotationItem,
	lockAspectRatio: LockAspectRatioItem,
	autoHeight: AutoHeightItem,
	fill: FillItem,
	strokeColor: StrokeColorItem,
	strokeWidth: StrokeWidthItem,
	strokeDashType: StrokeDashTypeItem,
	radius: RadiusItem,
	arrowHeads: ArrowHeadsItem,
	fontFamily: FontFamilyItem,
	fontSize: FontSizeItem,
	fontColor: FontColorItem,
	textFormat: TextFormatItem,
	textAlign: TextAlignItem,
	verticalAlign: VerticalAlignItem,
	textVerticalBasis: TextVerticalBasisItem,
	textLayout: TextLayoutItem,
};

type PropertyPanelAccordionProps = {
	/** Section id; the collapse route (`toggle:{id}`) is built from it. */
	sectionId: string;
	/** Heading text, already resolved against the messages and the locale. */
	label: string;
	isExpanded: boolean;
	children: React.ReactNode;
};

/** One accordion of the sidebar, drawn the same for a selection's sections and for the document's. */
const PropertyPanelAccordion: React.FC<PropertyPanelAccordionProps> = ({
	sectionId,
	label,
	isExpanded,
	children,
}) => (
	<div>
		<PropertyPanelSectionHeader
			type="button"
			aria-expanded={isExpanded}
			data-part={`toggle:${sectionId}`}
		>
			<PropertyPanelSectionChevron isExpanded={isExpanded}>
				<ChevronRightIcon width={CHEVRON_SIZE} height={CHEVRON_SIZE} />
			</PropertyPanelSectionChevron>
			<PropertyPanelSectionLabel>{label}</PropertyPanelSectionLabel>
		</PropertyPanelSectionHeader>
		{isExpanded && (
			<PropertyPanelSectionBody>{children}</PropertyPanelSectionBody>
		)}
	</div>
);

/**
 * The properties sidebar: the settings of the current selection, on the opposite
 * edge from the shape library. With nothing selected it holds the Canvas section
 * instead — the document's own settings, which is the panel's empty state. The
 * per-type sections are followed by the Arrange section whenever the selection
 * can be reordered, whatever its types.
 *
 * The panel is one gesture target (`data-kind="menu" data-id="property-panel"`)
 * handled by PropertyPanelHandler: its chrome carries only a data-part, and the
 * close button routes through the command system like the toolbar's own toggle.
 * The controls inside declare themselves as object-menu targets instead, so a
 * press writes through the same `set:` / `command:` grammar the floating menu
 * uses and lands one history entry (ObjectMenuHandler); the fields that take
 * typing opt out of gestures entirely.
 *
 * Open and collapse state are reducer state, so this component is render-only.
 */
const PropertyPanelComponent: React.FC<PropertyPanelProps> = ({
	canvasState,
	onPropertyUpdate,
	onTransformUpdate,
	onDocumentUpdate,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const sections = usePropertyPanelSections(canvasState);
	const { collapsedSectionIds } = canvasState.propertyPanel;
	const showsCanvasSection = isCanvasSectionShown(canvasState);
	const showsArrangeSection =
		!showsCanvasSection && isArrangeableSelection(canvasState);
	// State rather than a ref, so the fields re-render once the host element exists.
	const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);

	return (
		<PropertyPanelContainer
			ref={setOverlayHost}
			aria-label={messages.propertyPanelTitle}
			data-kind="menu"
			data-id="property-panel"
		>
			<PropertyPanelHeader>
				<PropertyPanelTitle>{messages.propertyPanelTitle}</PropertyPanelTitle>
				<PropertyPanelCloseButton
					type="button"
					aria-label={messages.propertyPanelClose}
					title={messages.propertyPanelClose}
					data-part="command:togglePropertyPanel"
				>
					<CloseIcon width={CLOSE_ICON_SIZE} height={CLOSE_ICON_SIZE} />
				</PropertyPanelCloseButton>
			</PropertyPanelHeader>

			<PropertyPanelBody>
				<PropertyPanelOverlayHostContext.Provider value={overlayHost}>
					{showsCanvasSection && (
						<PropertyPanelAccordion
							sectionId={CANVAS_SECTION_ID}
							label={resolvePropertyPanelSectionLabel(
								CANVAS_SECTION_ID,
								CANVAS_SECTION_LABEL,
								messages,
								locale,
							)}
							isExpanded={!collapsedSectionIds.includes(CANVAS_SECTION_ID)}
						>
							<BackgroundItem
								background={canvasState.background}
								onDocumentUpdate={onDocumentUpdate}
							/>
						</PropertyPanelAccordion>
					)}
					{!showsCanvasSection &&
						sections.map((section) => {
							const isExpanded = !collapsedSectionIds.includes(section.id);
							return (
								<PropertyPanelAccordion
									key={section.id}
									sectionId={section.id}
									label={resolvePropertyPanelSectionLabel(
										section.id,
										section.label,
										messages,
										locale,
									)}
									isExpanded={isExpanded}
								>
									{section.items.map((item) => {
										// A plugin row is handed the narrowed props, not the
										// controller state the built-in rows read.
										if (item.type === "custom") {
											return (
												<item.component
													key={item.id}
													objects={canvasState.objects}
													selectedIds={canvasState.selectedIds}
													selectedConnectorId={canvasState.selectedConnectorId}
													multiSelectGroup={canvasState.multiSelectGroup}
													onPropertyUpdate={onPropertyUpdate}
													onTransformUpdate={onTransformUpdate}
												/>
											);
										}
										const ItemComponent = ITEM_COMPONENTS[item.type];
										return (
											<ItemComponent
												key={item.type}
												canvasState={canvasState}
												onPropertyUpdate={onPropertyUpdate}
												onTransformUpdate={onTransformUpdate}
											/>
										);
									})}
								</PropertyPanelAccordion>
							);
						})}
					{showsArrangeSection && (
						<PropertyPanelAccordion
							sectionId={ARRANGE_SECTION_ID}
							label={resolvePropertyPanelSectionLabel(
								ARRANGE_SECTION_ID,
								ARRANGE_SECTION_LABEL,
								messages,
								locale,
							)}
							isExpanded={!collapsedSectionIds.includes(ARRANGE_SECTION_ID)}
						>
							<StackOrderItem canvasState={canvasState} />
						</PropertyPanelAccordion>
					)}
				</PropertyPanelOverlayHostContext.Provider>
			</PropertyPanelBody>
		</PropertyPanelContainer>
	);
};

export const PropertyPanel = memo(PropertyPanelComponent);
