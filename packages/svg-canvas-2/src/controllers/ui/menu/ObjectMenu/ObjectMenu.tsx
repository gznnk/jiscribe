import { memo, useRef } from "react";

import { useMenuConfig } from "./hooks/useMenuConfig";
import { useObjectMenuPosition } from "./hooks/useObjectMenuPosition";
import {
	ObjectMenuContainer,
	ObjectMenuDivider,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import { AlignmentMenu } from "./sections/AlignmentMenu";
import { ArrowHeadMenu } from "./sections/ArrowHeadMenu";
import { BackgroundColorMenu } from "./sections/BackgroundColorMenu";
import { BoldMenu } from "./sections/BoldMenu";
import { BorderStyleMenu } from "./sections/BorderStyleMenu";
import { FontColorMenu } from "./sections/FontColorMenu";
import { FontSizeMenu } from "./sections/FontSizeMenu";
import { GroupMenu } from "./sections/GroupMenu";
import { KeepAspectRatioMenu } from "./sections/KeepAspectRatioMenu";
import { StackOrderMenu } from "./sections/StackOrderMenu";
import { StrokeColorMenu } from "./sections/StrokeColorMenu";
import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { isSameGroupSelection } from "../../../utils/isSameGroupSelection";

type ObjectMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * 選択中オブジェクトの下に表示されるフローティングメニュー。
 * ScrollSyncedOverlay 内に配置され、キャンバススクロールに追従する。
 *
 * Based on svg-canvas's DiagramMenu but adapted for svg-canvas-2 architecture.
 * Uses ObjectMenuConfig to control which sections are displayed.
 */
const ObjectMenuComponent: React.FC<ObjectMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const { shouldRender, x, y } = useObjectMenuPosition(canvasState, menuRef);
	const menuConfig = useMenuConfig(canvasState);

	if (!shouldRender) return null;

	const { selectedIds, objects } = canvasState;

	// Get single selected object (if only one is selected)
	const singleSelectedId =
		selectedIds.length === 1 ? selectedIds[0] : undefined;
	const singleSelectedObject = singleSelectedId
		? objects[singleSelectedId]
		: undefined;

	// Array to hold the menu item components
	const menuItemComponents: React.ReactNode[] = [];

	// Arrow head section
	if (menuConfig.arrowHead) {
		menuItemComponents.push(
			<ArrowHeadMenu key="Arrow" canvasState={canvasState} />,
		);
		menuItemComponents.push(<ObjectMenuDivider key="ArrowDivider" />);
	}

	// Line appearance section (lineColor only for now)
	// TODO: lineStyle needs dedicated component implementation
	if (menuConfig.lineColor) {
		menuItemComponents.push(
			<StrokeColorMenu key="LineColor" canvasState={canvasState} />,
		);
		menuItemComponents.push(<ObjectMenuDivider key="LineSectionDivider" />);
	}

	// Shape style section (backgroundColor, borderColor, and borderStyle)
	if (menuConfig.backgroundColor) {
		menuItemComponents.push(
			<BackgroundColorMenu key="BgColor" canvasState={canvasState} />,
		);
	}

	if (menuConfig.borderColor) {
		menuItemComponents.push(
			<StrokeColorMenu key="BorderColor" canvasState={canvasState} />,
		);
	}

	if (menuConfig.borderStyle) {
		menuItemComponents.push(
			<BorderStyleMenu
				key="BorderStyle"
				canvasState={canvasState}
				showRadius={menuConfig.borderStyle.radius}
				onPropertyUpdate={onPropertyUpdate}
			/>,
		);
	}

	if (
		menuConfig.backgroundColor ||
		menuConfig.borderColor ||
		menuConfig.borderStyle
	) {
		menuItemComponents.push(
			<ObjectMenuDivider key="ShapeStyleSectionDivider" />,
		);
	}

	// Text appearance section (fontStyle and textAlignment)
	if (menuConfig.fontStyle) {
		menuItemComponents.push(
			<FontSizeMenu
				key="FontSize"
				canvasState={canvasState}
				onPropertyUpdate={onPropertyUpdate}
			/>,
		);
		menuItemComponents.push(
			<FontColorMenu key="FontColor" canvasState={canvasState} />,
		);
		menuItemComponents.push(<BoldMenu key="Bold" canvasState={canvasState} />);
	}

	if (menuConfig.textAlignment) {
		menuItemComponents.push(
			<AlignmentMenu key="Alignment" canvasState={canvasState} />,
		);
	}

	if (menuConfig.fontStyle || menuConfig.textAlignment) {
		menuItemComponents.push(
			<ObjectMenuDivider key="TextAppearanceSectionDivider" />,
		);
	}

	// Stack order section (visible when all selected objects are siblings)
	const shouldDisplayStackOrderMenu = isSameGroupSelection(canvasState);
	if (shouldDisplayStackOrderMenu) {
		menuItemComponents.push(
			<StackOrderMenu key="StackOrder" canvasState={canvasState} />,
		);
		menuItemComponents.push(
			<ObjectMenuDivider key="StackOrderSectionDivider" />,
		);
	}

	// Keep aspect ratio section
	const shouldDisplayKeepAspectRatioMenu = Boolean(
		(singleSelectedObject &&
			(objectRegistry.getMenuConfig(singleSelectedObject.type)?.aspectRatio ||
				singleSelectedObject.type === "group")) ||
			canvasState.multiSelectGroup,
	);
	if (shouldDisplayKeepAspectRatioMenu) {
		menuItemComponents.push(
			<KeepAspectRatioMenu key="KeepAspectRatio" canvasState={canvasState} />,
		);
		menuItemComponents.push(
			<ObjectMenuDivider key="KeepAspectRatioSectionDivider" />,
		);
	}

	// Group / Ungroup section
	const shouldShowGroupMenu = Boolean(
		selectedIds.length > 1 ||
		(singleSelectedObject && singleSelectedObject.type === "group"),
	);
	if (shouldShowGroupMenu) {
		menuItemComponents.push(
			<GroupMenu key="Group" canvasState={canvasState} />,
		);
		menuItemComponents.push(<ObjectMenuDivider key="GroupSectionDivider" />);
	}

	// Remove the last divider
	if (
		menuItemComponents.length > 0 &&
		(
			menuItemComponents[menuItemComponents.length - 1] as React.ReactElement
		)?.key
			?.toString()
			.includes("Divider")
	) {
		menuItemComponents.pop();
	}

	return (
		<ObjectMenuWrapper left={x} top={y}>
			<ObjectMenuContainer ref={menuRef}>
				{menuItemComponents}
			</ObjectMenuContainer>
		</ObjectMenuWrapper>
	);
};

export const ObjectMenu = memo(ObjectMenuComponent);
