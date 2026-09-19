import {
	countOpenCommentThreads,
	readCommentThreads,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { memo, useRef } from "react";

import { CommentCountBadge, CommentIconWithBadge } from "./CommentsMenuStyled";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CommentOp } from "../../../../../reducer/CanvasActions";
import { resolveMetaTargetId } from "../../../../../utils/resolveMetaTargetId";
import { CommentPanel } from "../../../../comments/CommentPanel";
import { COMMENTS_SECTION_ID } from "../../../../comments/CommentsConstants";
import { resolveCommentTargetLabel } from "../../../../comments/utils/resolveCommentTargetLabel";
import { CommentIcon } from "../../../../icons/CommentIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type CommentsMenuProps = {
	canvasState: CanvasControllerState;
	/** Display name written onto posts; absent or blank makes the panel read-only. */
	commentAuthor?: string;
	/** Applies one op to the document. */
	onCommentUpdate: (op: CommentOp) => void;
};

/**
 * Comment menu: opens the thread panel of the one object the selection names,
 * and carries the number of its open threads as a badge.
 *
 * Shown only while `resolveMetaTargetId` names an object, since a thread belongs
 * to one object — the same rule the "open reference" item follows.
 */
const CommentsMenuComponent: React.FC<CommentsMenuProps> = ({
	canvasState,
	commentAuthor,
	onCommentUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === COMMENTS_SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const objectId = resolveMetaTargetId(canvasState);
	const targetObject =
		objectId === null ? undefined : canvasState.objects[objectId];
	if (objectId === null || targetObject === undefined) {
		return null;
	}

	const threads = readCommentThreads(targetObject.meta);
	const openCount = countOpenCommentThreads(threads);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={togglePart(COMMENTS_SECTION_ID)}
				aria-label={messages.menuComments}
				title={messages.menuComments}
			>
				<CommentIconWithBadge>
					<CommentIcon title={messages.menuComments} />
					{openCount > 0 && (
						<CommentCountBadge data-testid="comment-count">
							{openCount}
						</CommentCountBadge>
					)}
				</CommentIconWithBadge>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<CommentPanel
						key={objectId}
						objectId={objectId}
						objectLabel={resolveCommentTargetLabel(targetObject)}
						threads={threads}
						commentAuthor={commentAuthor}
						placement="menu"
						onCommentUpdate={onCommentUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const CommentsMenu = memo(CommentsMenuComponent);
