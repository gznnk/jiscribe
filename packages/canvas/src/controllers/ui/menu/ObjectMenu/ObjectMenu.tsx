import React, { memo, useCallback, useRef, useState } from "react";

import { useMenuSections } from "./hooks/useMenuSections";
import { useObjectMenuPosition } from "./hooks/useObjectMenuPosition";
import { AlignmentMenu } from "./items/AlignmentMenu";
import { ArrowHeadMenu } from "./items/ArrowHeadMenu";
import { AutoHeightMenu } from "./items/AutoHeightMenu";
import { BackgroundColorMenu } from "./items/BackgroundColorMenu";
import { BorderStyleMenu } from "./items/BorderStyleMenu";
import { FontColorMenu } from "./items/FontColorMenu";
import { FontFamilyMenu } from "./items/FontFamilyMenu";
import { FontSizeMenu } from "./items/FontSizeMenu";
import { GroupMenu } from "./items/GroupMenu";
import { KeepAspectRatioMenu } from "./items/KeepAspectRatioMenu";
import { LineColorMenu } from "./items/LineColorMenu";
import { LineStyleMenu } from "./items/LineStyleMenu";
import { OpenReferenceMenu } from "./items/OpenReferenceMenu";
import { StackOrderMenu } from "./items/StackOrderMenu";
import { StrokeColorMenu } from "./items/StrokeColorMenu";
import { TextFormatMenu } from "./items/TextFormatMenu";
import {
	ObjectMenuContainer,
	ObjectMenuSectionRow,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import type {
	ObjectMenuItem,
	ObjectMenuPropertyUpdater,
	ObjectMenuSection,
	OpenReferenceHandler,
} from "./ObjectMenuTypes";
import { resolveOpenReference } from "./utils/resolveOpenReference";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isArrangeableSelection } from "../../../utils/isArrangeableSelection";
import { resolveSelectedTextSlot } from "../../../utils/resolveSelectedTextSlot";

type ObjectMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
	onOpenReference?: OpenReferenceHandler;
};

const renderItem = (
	item: ObjectMenuItem,
	canvasState: CanvasControllerState,
	onPropertyUpdate: ObjectMenuPropertyUpdater,
	onOpenReference: OpenReferenceHandler | undefined,
): React.ReactNode => {
	switch (item.type) {
		case "arrowHead":
			return <ArrowHeadMenu key="arrowHead" canvasState={canvasState} />;
		case "lineColor":
			return (
				<LineColorMenu
					key="lineColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "lineStyle":
			return (
				<LineStyleMenu
					key="lineStyle"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "backgroundColor":
			return (
				<BackgroundColorMenu
					key="backgroundColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "borderColor":
			return (
				<StrokeColorMenu
					key="borderColor"
					canvasState={canvasState}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "borderStyle":
			return (
				<BorderStyleMenu
					key="borderStyle"
					canvasState={canvasState}
					showRadius={item.radius}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
		case "fontStyle":
			return (
				<React.Fragment key="fontStyle">
					<FontFamilyMenu canvasState={canvasState} />
					<FontSizeMenu
						canvasState={canvasState}
						onPropertyUpdate={onPropertyUpdate}
					/>
					<FontColorMenu
						canvasState={canvasState}
						onPropertyUpdate={onPropertyUpdate}
					/>
					<TextFormatMenu canvasState={canvasState} />
				</React.Fragment>
			);
		case "textAlignment":
			return (
				<AlignmentMenu
					key="textAlignment"
					canvasState={canvasState}
					vertical={item.vertical}
				/>
			);
		case "aspectRatio":
			return (
				<KeepAspectRatioMenu key="aspectRatio" canvasState={canvasState} />
			);
		case "autoHeight":
			return <AutoHeightMenu key="autoHeight" canvasState={canvasState} />;
		case "stackOrder":
			return <StackOrderMenu key="stackOrder" canvasState={canvasState} />;
		case "group":
			return <GroupMenu key="group" canvasState={canvasState} />;
		case "openReference":
			// The section is only built when the host supplies a handler, but a custom
			// menu definition can name the item without one.
			if (!onOpenReference) {
				return null;
			}
			return (
				<OpenReferenceMenu
					key="openReference"
					canvasState={canvasState}
					onOpenReference={onOpenReference}
				/>
			);
		case "custom":
			return (
				<item.component
					key={item.id}
					objects={canvasState.objects}
					selectedIds={canvasState.selectedIds}
					selectedConnectorId={canvasState.selectedConnectorId}
					openSectionId={canvasState.objectMenuOpenId}
					onPropertyUpdate={onPropertyUpdate}
				/>
			);
	}
};

const buildSystemSections = (
	canvasState: CanvasControllerState,
	onOpenReference: OpenReferenceHandler | undefined,
): ObjectMenuSection[] => {
	const systemSections: ObjectMenuSection[] = [];

	// To show StackOrder including connector selection (selectedConnectorId), use
	// isArrangeableSelection, which judges by the effective selection rather than selectedIds alone.
	if (isArrangeableSelection(canvasState)) {
		systemSections.push({
			id: "system-stack-order",
			items: [{ type: "stackOrder" }],
		});
	}

	const { selectedIds, objects } = canvasState;
	const singleSelected =
		selectedIds.length === 1 ? objects[selectedIds[0]] : undefined;

	// Like multiSelectGroup, a group holds its own lockAspectRatio, so show the
	// aspect-ratio menu regardless of the type composition of its descendants
	if (canvasState.multiSelectGroup || singleSelected?.type === "group") {
		systemSections.push({
			id: "system-aspect-ratio",
			items: [{ type: "aspectRatio" }],
		});
	}

	const shouldShowGroup =
		selectedIds.length > 1 || singleSelected?.type === "group";
	if (shouldShowGroup) {
		systemSections.push({
			id: "system-group",
			items: [{ type: "group" }],
		});
	}

	if (onOpenReference && resolveOpenReference(canvasState) !== null) {
		systemSections.push({
			id: "system-reference",
			items: [{ type: "openReference" }],
		});
	}

	return systemSections;
};

/**
 * Floating menu displayed below the selected object.
 * Placed inside ScrollSyncedOverlay and follows canvas scrolling.
 */
/**
 * Keeps the press from taking the focus off an open text editor: the selection
 * the text items style lives in that editor, and a blur would also drop the
 * caret the user types back into. The controls that need the focus themselves —
 * the font-size input, the sliders — keep the default.
 */
const keepTextEditorFocus = (event: React.PointerEvent<HTMLElement>): void => {
	if (
		(event.target as HTMLElement).closest("input, textarea, select") === null
	) {
		event.preventDefault();
	}
};

const ObjectMenuComponent: React.FC<ObjectMenuProps> = ({
	canvasState,
	onPropertyUpdate,
	onOpenReference,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	// Reported to the positioning hook, which holds the menu still while it is
	// under the pointer — the flat format buttons resize an auto-sized text on
	// every toggle, and the menu must not walk away between two presses.
	// The dropdown panels are DOM children of the container, so moving onto one
	// is not a leave.
	const [isPointerOverMenu, setIsPointerOverMenu] = useState(false);
	const handlePointerEnter = useCallback(() => setIsPointerOverMenu(true), []);
	const handlePointerLeave = useCallback(() => setIsPointerOverMenu(false), []);
	const { shouldRender, x, y } = useObjectMenuPosition(
		canvasState,
		menuRef,
		isPointerOverMenu,
	);
	// Skip the section computations while the menu is hidden (e.g. during a drag, where
	// canvasState.objects churns every frame) — the result would not be shown anyway.
	const objectSections = useMenuSections(canvasState, shouldRender);
	// None of the system sections acts on a text slot, so they all go while one is
	// selected — and likewise while an editor is open, where the menu is there to
	// style the text being edited.
	const showSystemSections =
		shouldRender &&
		resolveSelectedTextSlot(canvasState) === null &&
		canvasState.textEditState?.kind !== "shape";
	const systemSections = showSystemSections
		? buildSystemSections(canvasState, onOpenReference)
		: [];
	const allSections = [...objectSections, ...systemSections];

	if (!shouldRender || allSections.length === 0) {
		return null;
	}

	// Since both objectSections and systemSections may contain the same item type,
	// prefer the first occurrence and prevent duplicate rendering
	const renderedItemKeys = new Set<string>();

	// Wrap each section in an ObjectMenuSectionRow. Dividers are drawn in CSS (::before), and
	// empty sections (custom returns null / all items skipped as duplicates) are
	// automatically collapsed along with their divider via `:empty`.
	const sections = allSections.map((section) => {
		const sectionItems: React.ReactNode[] = [];
		section.items.forEach((item) => {
			const key = item.type === "custom" ? item.id : item.type;
			if (renderedItemKeys.has(key)) {
				return;
			}
			renderedItemKeys.add(key);
			sectionItems.push(
				renderItem(item, canvasState, onPropertyUpdate, onOpenReference),
			);
		});
		return (
			<ObjectMenuSectionRow key={section.id}>
				{sectionItems}
			</ObjectMenuSectionRow>
		);
	});

	return (
		<ObjectMenuWrapper style={{ left: x, top: y }}>
			<ObjectMenuContainer
				ref={menuRef}
				data-kind="menu"
				data-id="object-menu"
				// Only while an editor is open, so a press outside one keeps behaving
				// exactly as it did (a menu button taking the focus on click included).
				onPointerDown={
					canvasState.textEditState === null ? undefined : keepTextEditorFocus
				}
				onPointerEnter={handlePointerEnter}
				onPointerLeave={handlePointerLeave}
			>
				{sections}
			</ObjectMenuContainer>
		</ObjectMenuWrapper>
	);
};

export const ObjectMenu = memo(ObjectMenuComponent);
