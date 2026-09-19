import type {
	CommentDoc,
	CommentThreadDoc,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { countOpenCommentThreads } from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	CheckGlyph,
	ChevronGlyph,
	PencilGlyph,
	TrashGlyph,
} from "./CommentGlyphs";
import {
	CommentActions,
	CommentAuthorName,
	CommentAvatar,
	CommentBody,
	CommentComposer,
	CommentComposerActions,
	CommentContent,
	CommentHeading,
	CommentIconButton,
	CommentPanelBody,
	CommentPanelCloseButton,
	CommentPanelFooter,
	CommentPanelFooterButton,
	CommentPanelHeader,
	CommentPanelLabel,
	CommentPanelOpenCount,
	CommentPanelReadOnlyNotice,
	CommentPanelRoot,
	CommentPanelTargetName,
	CommentResolvedBy,
	CommentResolvedSectionToggle,
	CommentRow,
	CommentSecondaryButton,
	CommentSubmitButton,
	CommentTextArea,
	CommentThreadCollapsedRow,
	CommentThreadExpanded,
	CommentThreadPreview,
	CommentThreadReplyCount,
	CommentThreadResolvedFrame,
	CommentTimestamp,
} from "./CommentPanelStyled";
import { COMMENTS_SECTION_ID } from "./CommentsConstants";
import { formatCommentTime } from "./utils/formatCommentTime";
import { pickAvatarColor, pickAvatarInitial } from "./utils/pickAvatarColor";
import { sortCommentThreads } from "./utils/sortCommentThreads";
import { togglePart } from "../../gestures/handlers/menu/utils/menuParts";
import { useCanvasLocale } from "../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../messages/CanvasMessagesContext";
import type { CommentOp } from "../../reducer/CanvasActions";
import { CloseIcon } from "../icons/CloseIcon";

/** Which surface draws the panel; reported as `data-placement` for the e2e selectors. */
export type CommentPanelPlacement = "menu" | "marker";

type CommentPanelProps = {
	/**
	 * Object the threads hang off. Every op names it, and the call site keys the
	 * panel on it so the local UI state starts over on a different object.
	 */
	objectId: string;
	/** Header title: the object's `meta.name`, or its type where it has no name. */
	objectLabel: string;
	/** Threads as `readCommentThreads` returned them; document order, both resolutions mixed. */
	threads: readonly CommentThreadDoc[];
	/**
	 * Display name written onto what is posted here. Undefined or blank makes the
	 * panel read-only: the threads still read, but nothing can be written.
	 */
	commentAuthor?: string;
	/** Which of the two placements this is. */
	placement: CommentPanelPlacement;
	/** Applies one op to the document; the caller dispatches it. */
	onCommentUpdate: (op: CommentOp) => void;
};

/** Ctrl (or Cmd) with Enter submits every composer and the edit box. */
const isSubmitChord = (event: React.KeyboardEvent): boolean =>
	event.key === "Enter" && (event.ctrlKey || event.metaKey);

/**
 * The comment threads of one object, as drawn by both entry points: the
 * ObjectMenu's comment dropdown and the panel that opens beside the marker
 * while the properties sidebar hides that menu.
 *
 * Every control inside is opted out of the gesture system
 * (`data-gesture="none"`), so a press reaches its React handler and never the
 * canvas. The close button is the one exception: it carries the menu's
 * `toggle:comments` part, which is what lets the same button shut both
 * placements without any state of its own (ObjectMenuHandler).
 */
const CommentPanelComponent: React.FC<CommentPanelProps> = ({
	objectId,
	objectLabel,
	threads,
	commentAuthor,
	placement,
	onCommentUpdate,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();

	const { open: openThreads, resolved: resolvedThreads } = useMemo(
		() => sortCommentThreads(threads),
		[threads],
	);

	// Null means "whatever the newest open thread is", so a thread posted or
	// resolved elsewhere moves the expansion without the panel tracking it.
	const [chosenThreadId, setChosenThreadId] = useState<string | null>(null);
	const [replyDraft, setReplyDraft] = useState("");
	const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
	const [newThreadDraft, setNewThreadDraft] = useState("");
	const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState("");
	const [isResolvedSectionOpen, setIsResolvedSectionOpen] = useState(false);
	const newThreadTextAreaRef = useRef<HTMLTextAreaElement>(null);

	const knownThreadIds = new Set(threads.map((thread) => thread.id));
	const expandedThreadId =
		chosenThreadId !== null && knownThreadIds.has(chosenThreadId)
			? chosenThreadId
			: (openThreads[0]?.id ?? null);

	const author = commentAuthor?.trim() ?? "";
	const canPost = author !== "";
	// An object without a thread opens straight onto the composer: the first
	// comment is the only thing the panel could be for.
	const isNewThreadComposerShown =
		canPost && (isNewThreadOpen || threads.length === 0);

	// The footer button is what opens the composer, so the caret belongs in it
	// straight away rather than after a second press.
	useLayoutEffect(() => {
		if (isNewThreadComposerShown) {
			newThreadTextAreaRef.current?.focus();
		}
	}, [isNewThreadComposerShown]);

	const mintComment = useCallback(
		(body: string): CommentDoc => ({
			id: crypto.randomUUID(),
			author,
			body,
			createdAt: new Date().toISOString(),
		}),
		[author],
	);

	const expandThread = useCallback((threadId: string) => {
		setChosenThreadId(threadId);
		setReplyDraft("");
		setEditingCommentId(null);
	}, []);

	const submitReply = useCallback(
		(threadId: string) => {
			const body = replyDraft.trim();
			if (body === "" || !canPost) {
				return;
			}
			onCommentUpdate({
				kind: "addReply",
				objectId,
				threadId,
				comment: mintComment(body),
			});
			setReplyDraft("");
		},
		[canPost, mintComment, objectId, onCommentUpdate, replyDraft],
	);

	const submitNewThread = useCallback(() => {
		const body = newThreadDraft.trim();
		if (body === "" || !canPost) {
			return;
		}
		onCommentUpdate({
			kind: "addThread",
			objectId,
			threadId: crypto.randomUUID(),
			comment: mintComment(body),
		});
		setNewThreadDraft("");
		setIsNewThreadOpen(false);
	}, [canPost, mintComment, newThreadDraft, objectId, onCommentUpdate]);

	const submitEdit = useCallback(
		(threadId: string, commentId: string) => {
			const body = editDraft.trim();
			if (body === "") {
				return;
			}
			onCommentUpdate({
				kind: "editComment",
				objectId,
				threadId,
				commentId,
				body,
				editedAt: new Date().toISOString(),
			});
			setEditingCommentId(null);
		},
		[editDraft, objectId, onCommentUpdate],
	);

	const renderComment = (
		thread: CommentThreadDoc,
		comment: CommentDoc,
		index: number,
	): React.ReactNode => {
		const isOwnComment = canPost && comment.author === author;
		const isEditing = editingCommentId === comment.id;
		return (
			<CommentRow
				key={comment.id}
				isReply={index > 0}
				data-testid="comment"
				data-comment-id={comment.id}
			>
				<CommentAvatar color={pickAvatarColor(comment.author)}>
					{pickAvatarInitial(comment.author)}
				</CommentAvatar>
				<CommentContent>
					<CommentHeading>
						<CommentAuthorName>{comment.author}</CommentAuthorName>
						<CommentTimestamp>
							{formatCommentTime(comment.createdAt, locale)}
						</CommentTimestamp>
						{comment.editedAt !== undefined && (
							<CommentTimestamp>{messages.commentsEdited}</CommentTimestamp>
						)}
					</CommentHeading>
					{isEditing ? (
						<>
							<CommentTextArea
								data-gesture="none"
								data-testid="comment-edit-input"
								value={editDraft}
								onChange={(event) => setEditDraft(event.target.value)}
								onKeyDown={(event) => {
									if (isSubmitChord(event)) {
										event.preventDefault();
										submitEdit(thread.id, comment.id);
										return;
									}
									if (event.key === "Escape") {
										event.preventDefault();
										setEditingCommentId(null);
									}
								}}
							/>
							<CommentComposerActions>
								<CommentSecondaryButton
									data-gesture="none"
									data-testid="comment-edit-cancel"
									onClick={() => setEditingCommentId(null)}
								>
									{messages.commentsCancel}
								</CommentSecondaryButton>
								<CommentSubmitButton
									data-gesture="none"
									data-testid="comment-edit-save"
									disabled={editDraft.trim() === ""}
									onClick={() => submitEdit(thread.id, comment.id)}
								>
									{messages.commentsSave}
								</CommentSubmitButton>
							</CommentComposerActions>
						</>
					) : (
						<CommentBody data-gesture="none" data-testid="comment-body">
							{comment.body}
						</CommentBody>
					)}
				</CommentContent>
				{/* Resolving is the thread's primary action, so it stays visible; a
				    touch screen has no hover to reveal it with. */}
				{index === 0 && thread.resolved !== true && canPost && (
					<CommentIconButton
						data-gesture="none"
						data-testid="comment-resolve"
						title={messages.commentsResolve}
						aria-label={messages.commentsResolve}
						onClick={() =>
							onCommentUpdate({
								kind: "resolveThread",
								objectId,
								threadId: thread.id,
								resolvedBy: author,
							})
						}
					>
						<CheckGlyph />
					</CommentIconButton>
				)}

				<CommentActions className="jiscribe-comment-actions">
					{isOwnComment && !isEditing && (
						<>
							<CommentIconButton
								data-gesture="none"
								data-testid="comment-edit"
								title={messages.commentsEdit}
								aria-label={messages.commentsEdit}
								onClick={() => {
									setEditingCommentId(comment.id);
									setEditDraft(comment.body);
								}}
							>
								<PencilGlyph />
							</CommentIconButton>
							<CommentIconButton
								data-gesture="none"
								data-testid="comment-delete"
								title={messages.commentsDelete}
								aria-label={messages.commentsDelete}
								onClick={() =>
									onCommentUpdate({
										kind: "deleteComment",
										objectId,
										threadId: thread.id,
										commentId: comment.id,
									})
								}
							>
								<TrashGlyph />
							</CommentIconButton>
						</>
					)}
				</CommentActions>
			</CommentRow>
		);
	};

	const renderCollapsedThread = (thread: CommentThreadDoc): React.ReactNode => {
		const root = thread.comments[0];
		const replyCount = thread.comments.length - 1;
		return (
			<CommentThreadCollapsedRow
				key={thread.id}
				data-gesture="none"
				data-testid="comment-thread"
				data-thread-id={thread.id}
				data-resolved={String(thread.resolved === true)}
				data-expanded="false"
				onClick={() => expandThread(thread.id)}
			>
				<CommentAvatar color={pickAvatarColor(root.author)}>
					{pickAvatarInitial(root.author)}
				</CommentAvatar>
				<CommentHeading>
					<CommentAuthorName>{root.author}</CommentAuthorName>
					<CommentTimestamp>
						{formatCommentTime(root.createdAt, locale)}
					</CommentTimestamp>
				</CommentHeading>
				{thread.resolved === true && canPost ? (
					// Reopening is one click from the folded list; the row's own click
					// (expanding) must not fire with it.
					<CommentSecondaryButton
						data-gesture="none"
						data-testid="comment-reopen"
						onClick={(event) => {
							event.stopPropagation();
							onCommentUpdate({
								kind: "reopenThread",
								objectId,
								threadId: thread.id,
							});
						}}
					>
						{messages.commentsReopen}
					</CommentSecondaryButton>
				) : (
					<CommentThreadReplyCount>
						{replyCount > 0 ? `${replyCount} ${messages.commentsReplies}` : ""}
					</CommentThreadReplyCount>
				)}
				<CommentThreadPreview>{root.body.split("\n")[0]}</CommentThreadPreview>
			</CommentThreadCollapsedRow>
		);
	};

	const renderExpandedThread = (thread: CommentThreadDoc): React.ReactNode => {
		const isResolved = thread.resolved === true;
		return (
			<CommentThreadExpanded
				key={thread.id}
				data-testid="comment-thread"
				data-thread-id={thread.id}
				data-resolved={String(isResolved)}
				data-expanded="true"
			>
				{isResolved && (
					<CommentResolvedBy>
						<CheckGlyph size={14} />
						<span>
							{[
								messages.commentsResolvedByPrefix,
								thread.resolvedBy ?? "",
								messages.commentsResolvedBySuffix,
							]
								.filter((part) => part !== "")
								.join(" ")}
						</span>
						{canPost && (
							<CommentSecondaryButton
								data-gesture="none"
								data-testid="comment-reopen"
								onClick={() =>
									onCommentUpdate({
										kind: "reopenThread",
										objectId,
										threadId: thread.id,
									})
								}
							>
								{messages.commentsReopen}
							</CommentSecondaryButton>
						)}
					</CommentResolvedBy>
				)}
				{thread.comments.map((comment, index) =>
					renderComment(thread, comment, index),
				)}
				{canPost && !isResolved && (
					<CommentComposer>
						<CommentTextArea
							data-gesture="none"
							data-testid="comment-composer"
							value={replyDraft}
							placeholder={messages.commentsReplyPlaceholder}
							onChange={(event) => setReplyDraft(event.target.value)}
							onKeyDown={(event) => {
								if (isSubmitChord(event)) {
									event.preventDefault();
									submitReply(thread.id);
								}
							}}
						/>
						<CommentComposerActions>
							<CommentSubmitButton
								data-gesture="none"
								data-testid="comment-submit"
								disabled={replyDraft.trim() === ""}
								onClick={() => submitReply(thread.id)}
							>
								{messages.commentsReply}
							</CommentSubmitButton>
						</CommentComposerActions>
					</CommentComposer>
				)}
			</CommentThreadExpanded>
		);
	};

	const renderThread = (thread: CommentThreadDoc): React.ReactNode =>
		thread.id === expandedThreadId
			? renderExpandedThread(thread)
			: renderCollapsedThread(thread);

	const openCount = countOpenCommentThreads(threads);

	return (
		<CommentPanelRoot data-testid="comment-panel" data-placement={placement}>
			<CommentPanelHeader>
				<CommentPanelLabel>{messages.menuComments}</CommentPanelLabel>
				<CommentPanelTargetName>{objectLabel}</CommentPanelTargetName>
				<CommentPanelOpenCount>
					{`· ${openCount} ${messages.commentsOpenCount}`}
				</CommentPanelOpenCount>
				<CommentPanelCloseButton
					data-kind="menu"
					data-id="object-menu"
					data-part={togglePart(COMMENTS_SECTION_ID)}
					data-testid="comment-close"
					title={messages.commentsClose}
					aria-label={messages.commentsClose}
				>
					<CloseIcon width={14} height={14} />
				</CommentPanelCloseButton>
			</CommentPanelHeader>
			<CommentPanelBody>
				{openThreads.map(renderThread)}
				{resolvedThreads.length > 0 && (
					<CommentResolvedSectionToggle
						data-gesture="none"
						data-testid="comment-resolved-toggle"
						onClick={() => setIsResolvedSectionOpen(!isResolvedSectionOpen)}
					>
						<ChevronGlyph isOpen={isResolvedSectionOpen} />
						{`${messages.commentsResolvedSection} ${resolvedThreads.length}`}
					</CommentResolvedSectionToggle>
				)}
				{isResolvedSectionOpen &&
					resolvedThreads.map((thread) => (
						<CommentThreadResolvedFrame key={thread.id}>
							{renderThread(thread)}
						</CommentThreadResolvedFrame>
					))}
				{isNewThreadComposerShown && (
					<CommentComposer>
						<CommentTextArea
							ref={newThreadTextAreaRef}
							data-gesture="none"
							data-testid="comment-composer"
							value={newThreadDraft}
							placeholder={messages.commentsNewThreadPlaceholder}
							onChange={(event) => setNewThreadDraft(event.target.value)}
							onKeyDown={(event) => {
								if (isSubmitChord(event)) {
									event.preventDefault();
									submitNewThread();
								}
							}}
						/>
						<CommentComposerActions>
							<CommentSubmitButton
								data-gesture="none"
								data-testid="comment-submit"
								disabled={newThreadDraft.trim() === ""}
								onClick={submitNewThread}
							>
								{messages.commentsPost}
							</CommentSubmitButton>
						</CommentComposerActions>
					</CommentComposer>
				)}
			</CommentPanelBody>
			{/* While the composer is out, the button that opens it has nothing to do */}
			{!canPost ? (
				<CommentPanelFooter>
					<CommentPanelReadOnlyNotice data-testid="comment-readonly">
						{messages.commentsReadOnly}
					</CommentPanelReadOnlyNotice>
				</CommentPanelFooter>
			) : (
				!isNewThreadComposerShown && (
					<CommentPanelFooter>
						<CommentPanelFooterButton
							data-gesture="none"
							data-testid="comment-new-thread"
							onClick={() => setIsNewThreadOpen(true)}
						>
							{`+ ${messages.commentsNewThread}`}
						</CommentPanelFooterButton>
					</CommentPanelFooter>
				)
			)}
		</CommentPanelRoot>
	);
};

export const CommentPanel = memo(CommentPanelComponent);
