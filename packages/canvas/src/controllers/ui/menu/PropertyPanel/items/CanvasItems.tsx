import { isString } from "@jiscribe/basic-validators";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/resolveViewPadding";
import type {
	ViewDoc,
	ViewPaddingDoc,
} from "@jiscribe/doc/model/canvas/ViewDoc";
import {
	AUTO_COLOR,
	isAutoColor,
} from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useCallback } from "react";

import { documentPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import type { StyleIntentUpdater } from "../../ObjectMenu/ObjectMenuTypes";
import { PropertyCheckbox } from "../common/PropertyCheckbox";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyNumberField } from "../common/PropertyNumberField";
import { PropertyRow } from "../common/PropertyRow";
import { PropertySegmentedControl } from "../common/PropertySegmentedControl";
import { PropertyPanelFieldGrid } from "../PropertyPanelStyled";
import type { PropertyPanelDocumentUpdater } from "../PropertyPanelTypes";

type BackgroundItemProps = {
	/** The document's surface color; undefined means it declares none. */
	background: string | undefined;
	onDocumentUpdate: PropertyPanelDocumentUpdater;
};

/**
 * The canvas surface color. Unset is shown as `auto` — the theme's own canvas
 * color beside the word — because that is exactly what an omitted `background`
 * means, and picking Auto back writes null so the field is dropped rather than
 * frozen at whatever the theme happened to be.
 */
const BackgroundItemComponent: React.FC<BackgroundItemProps> = ({
	background,
	onDocumentUpdate,
}) => {
	const messages = useCanvasMessages();

	// The picker speaks the style shape, translated here: `background` is no name
	// of the core vocabulary, so what arrives is an extra-shaped intent whose
	// value the engine does not type. The picker's is the CSS text, and the
	// sentinel it writes for Auto becomes the null the document route takes.
	const handleColorUpdate = useCallback<StyleIntentUpdater>(
		(intent, commit, coalesceHistory) => {
			if (!("value" in intent) || !isString(intent.value)) {
				return;
			}
			onDocumentUpdate(
				"background",
				isAutoColor(intent.value) ? null : intent.value,
				commit,
				coalesceHistory,
			);
		},
		[onDocumentUpdate],
	);

	return (
		<PropertyRow label={messages.propertyPanelRowBackground}>
			<PropertyColorField
				value={background ?? AUTO_COLOR}
				property="background"
				role="canvas"
				writesThroughCallback
				// The document's own background is the whole target.
				currentColorIsShared
				title={messages.propertyPanelRowBackground}
				onStyleIntent={handleColorUpdate}
			/>
		</PropertyRow>
	);
};

export const BackgroundItem = memo(BackgroundItemComponent);

type ViewPaddingItemProps = {
	/** The document's display declaration; undefined means it declares none. */
	view: ViewDoc | undefined;
	onDocumentUpdate: PropertyPanelDocumentUpdater;
};

/** One padding field: the side it states, the letter drawn in it, and its aria-label. */
type ViewPaddingFieldSpec = {
	side: keyof ViewPaddingDoc;
	prefix: string;
	ariaLabelKey: Extract<
		keyof CanvasMessages,
		`propertyPanelFieldPadding${string}`
	>;
};

/** In the order the fields fill the 2×2 grid: top and right, then bottom and left. */
const VIEW_PADDING_FIELD_SPECS: readonly ViewPaddingFieldSpec[] = [
	{ side: "top", prefix: "T", ariaLabelKey: "propertyPanelFieldPaddingTop" },
	{
		side: "right",
		prefix: "R",
		ariaLabelKey: "propertyPanelFieldPaddingRight",
	},
	{
		side: "bottom",
		prefix: "B",
		ariaLabelKey: "propertyPanelFieldPaddingBottom",
	},
	{ side: "left", prefix: "L", ariaLabelKey: "propertyPanelFieldPaddingLeft" },
];

/**
 * The empty space kept outside the content, one field per side in world px. An
 * undeclared side shows 0, which is what it means; typing 0 drops the side.
 */
const ViewPaddingItemComponent: React.FC<ViewPaddingItemProps> = ({
	view,
	onDocumentUpdate,
}) => {
	const messages = useCanvasMessages();
	const padding = resolveViewPadding(view?.padding);

	return (
		<PropertyRow label={messages.propertyPanelRowPadding}>
			<PropertyPanelFieldGrid>
				{VIEW_PADDING_FIELD_SPECS.map(({ side, prefix, ariaLabelKey }) => (
					<PropertyNumberField
						key={side}
						value={padding[side]}
						prefix={prefix}
						min={0}
						ariaLabel={messages[ariaLabelKey]}
						testId={`property-field:padding-${side}`}
						onUpdate={(value, commit, coalesceHistory) =>
							onDocumentUpdate(
								`view.padding.${side}`,
								value,
								commit,
								coalesceHistory,
							)
						}
					/>
				))}
			</PropertyPanelFieldGrid>
		</PropertyRow>
	);
};

export const ViewPaddingItem = memo(ViewPaddingItemComponent);

type ViewModeItemProps = {
	/** The document's display declaration; undefined means it declares none. */
	view: ViewDoc | undefined;
};

/**
 * How the view is framed when the document is opened. "None" drops the
 * declaration, leaving the framing to the host. Each press writes through the
 * sidebar's own gesture target, so it lands one history entry.
 */
const ViewOpenItemComponent: React.FC<ViewModeItemProps> = ({ view }) => {
	const messages = useCanvasMessages();
	const open = view?.open;

	return (
		<PropertyRow label={messages.propertyPanelRowViewOpen}>
			<PropertySegmentedControl
				options={[
					{
						id: "none",
						part: documentPart("view.open", null),
						title: messages.propertyPanelViewOpenNoneTitle,
						content: messages.propertyPanelViewOpenNone,
						isActive: open === undefined,
					},
					{
						id: "fit-width",
						part: documentPart("view.open", "fit-width"),
						title: messages.propertyPanelViewOpenFitWidthTitle,
						content: messages.propertyPanelViewOpenFitWidth,
						isActive: open === "fit-width",
					},
					{
						id: "fit-all",
						part: documentPart("view.open", "fit-all"),
						title: messages.propertyPanelViewOpenFitAllTitle,
						content: messages.propertyPanelViewOpenFitAll,
						isActive: open === "fit-all",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const ViewOpenItem = memo(ViewOpenItemComponent);

/**
 * Whether panning is walled in at the padded content. Off drops the declaration
 * rather than writing `"infinite"`, since an omitted `scroll` already means the
 * endless board; a document that spells `"infinite"` out shows off too.
 */
const ViewScrollItemComponent: React.FC<ViewModeItemProps> = ({ view }) => {
	const messages = useCanvasMessages();
	const isContent = view?.scroll === "content";

	return (
		<PropertyCheckbox
			isOn={isContent}
			part={documentPart("view.scroll", isContent ? null : "content")}
			label={messages.propertyPanelViewScrollContent}
		/>
	);
};

export const ViewScrollItem = memo(ViewScrollItemComponent);
