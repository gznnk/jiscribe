import {
	memo,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

import {
	PropertyDropdownChevron,
	PropertyDropdownFieldRoot,
	PropertyDropdownTrigger,
	PropertyMixedLabel,
} from "./PropertyControlsStyled";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import { ChevronDownIcon } from "../../../icons/ChevronDownIcon";
import { ObjectMenuDropdownPanel } from "../../ObjectMenu/common/ObjectMenuDropdownPanel";
import { PropertyPanelOverlayHostContext } from "../PropertyPanelOverlayHostContext";

const CHEVRON_SIZE = 12;

/**
 * Space (px) the panel keeps from the trigger and from the sidebar's edges: its
 * bottom and sides when under the trigger, its bottom and left when beside it.
 */
const PANEL_GAP = 4;

/** Where a field's panel opens (see PropertyDropdownFieldProps.placement). */
type PropertyDropdownPlacement = "under" | "beside";

type PropertyDropdownFieldProps = {
	/** Drawn on the closed trigger: a swatch, a preview, the current value's name. */
	preview: React.ReactNode;
	/**
	 * Whether the selection carries several values. The trigger then draws the
	 * muted word for that in place of `preview`, since a preview can only show one
	 * of them; the panel opens and writes to the whole selection unchanged.
	 */
	isMixed?: boolean;
	/**
	 * What the trigger draws while `isMixed`, in place of the word for it; for a
	 * trigger too narrow for the word. Omitted draws the word.
	 */
	mixedPreview?: React.ReactNode;
	/** title / aria-label of the trigger. */
	title: string;
	/**
	 * Where the panel opens. `"under"` (default): under the trigger inside the
	 * sidebar, never wider than the sidebar. `"beside"`: outside the sidebar to
	 * its left, over the canvas, its top level with the trigger's and as wide as
	 * its content; for a panel too wide for the sidebar. When the canvas row left
	 * of the sidebar (shape library included) is narrower than the panel, it
	 * opens `"under"` instead, decided afresh on every opening.
	 */
	placement?: PropertyDropdownPlacement;
	/** The panel's content. Mounted only while open, so its own effects do not run closed. */
	children: React.ReactNode;
};

/** Vertical extent (sidebar px) of the trigger and the open panel, and the sidebar's height. */
type PanelVerticalMetrics = {
	triggerTop: number;
	triggerBottom: number;
	panelHeight: number;
	hostHeight: number;
};

/**
 * Top of a panel opened under the trigger: under it, above it when it would run
 * past the sidebar's bottom, and pinned to that bottom when it fits neither way.
 */
function calcPanelTopUnderTrigger({
	triggerTop,
	triggerBottom,
	panelHeight,
	hostHeight,
}: PanelVerticalMetrics): number {
	const topUnderTrigger = triggerBottom + PANEL_GAP;
	const topAboveTrigger = triggerTop - PANEL_GAP - panelHeight;
	const topAtHostBottom = hostHeight - panelHeight - PANEL_GAP;
	if (topUnderTrigger <= topAtHostBottom) {
		return topUnderTrigger;
	}
	if (topAboveTrigger >= 0) {
		return topAboveTrigger;
	}
	return Math.max(0, topAtHostBottom);
}

/**
 * Top of a panel opened beside the sidebar: level with the trigger, raised as far
 * as it must be to end above the sidebar's bottom, but never above its top.
 */
function calcPanelTopBesideTrigger({
	triggerTop,
	panelHeight,
	hostHeight,
}: PanelVerticalMetrics): number {
	return Math.max(
		0,
		Math.min(triggerTop, hostHeight - panelHeight - PANEL_GAP),
	);
}

/** Inline style placing the panel for a placement; `top` is measured, the rest is fixed. */
function buildPanelStyle(
	placement: PropertyDropdownPlacement,
	top: number,
): React.CSSProperties {
	if (placement === "beside") {
		// Overrides the centring the dropdown panel draws itself with.
		return {
			top,
			left: "auto",
			right: `calc(100% + ${PANEL_GAP}px)`,
			transform: "none",
			width: "max-content",
		};
	}
	return { top, maxWidth: `calc(100% - ${PANEL_GAP * 2}px)` };
}

/**
 * A control whose choices are too many for a row: a trigger showing what is set,
 * and a panel of choices floating over the rows under it, or beside the sidebar
 * (see `placement`).
 *
 * The panel is portalled to the sidebar's root (see
 * PropertyPanelOverlayHostContext) and placed by measurement before it is
 * painted. Open state is this
 * field's own — no handler or command reads it, and it goes with the panel when
 * the sidebar closes. A press inside the panel writes through the gesture system
 * and leaves it open, so several choices can be tried in a row; a press anywhere
 * else, scrolling the rows away, or Escape closes it.
 */
const PropertyDropdownFieldComponent: React.FC<PropertyDropdownFieldProps> = ({
	preview,
	isMixed = false,
	mixedPreview,
	title,
	placement = "under",
	children,
}) => {
	const messages = useCanvasMessages();
	const overlayHost = useContext(PropertyPanelOverlayHostContext);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	// What the panel is drawn with: `placement`, until a measurement finds no room
	// beside the sidebar. Reset on every open, so a wider canvas gets it back.
	const [openedPlacement, setOpenedPlacement] =
		useState<PropertyDropdownPlacement>(placement);
	const [panelTop, setPanelTop] = useState(0);

	useLayoutEffect(() => {
		const trigger = triggerRef.current;
		const panel = panelRef.current;
		if (!isOpen || !overlayHost || !trigger || !panel) {
			return;
		}
		const hostRect = overlayHost.getBoundingClientRect();
		const triggerRect = trigger.getBoundingClientRect();
		// The rects are screen px, the `top` written below is the sidebar's own px:
		// the two differ by whatever scale a host has transformed the canvas with,
		// which the sidebar's on-screen height over its layout height gives back.
		const scale = hostRect.height / overlayHost.offsetHeight || 1;
		if (openedPlacement === "beside") {
			// The row the sidebar sits in is what the canvas clips the panel to.
			const rowLeft =
				overlayHost.parentElement?.getBoundingClientRect().left ??
				hostRect.left;
			const roomBeside = (hostRect.left - rowLeft) / scale;
			if (panel.offsetWidth + PANEL_GAP > roomBeside) {
				setOpenedPlacement("under");
				return;
			}
		}
		const metrics: PanelVerticalMetrics = {
			triggerTop: (triggerRect.top - hostRect.top) / scale,
			triggerBottom: (triggerRect.bottom - hostRect.top) / scale,
			panelHeight: panel.offsetHeight,
			hostHeight: overlayHost.offsetHeight,
		};
		setPanelTop(
			openedPlacement === "beside"
				? calcPanelTopBesideTrigger(metrics)
				: calcPanelTopUnderTrigger(metrics),
		);
	}, [isOpen, overlayHost, openedPlacement]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const isInsideField = (target: EventTarget | null) =>
			target instanceof Node &&
			(triggerRef.current?.contains(target) === true ||
				panelRef.current?.contains(target) === true);
		const handlePointerDown = (event: PointerEvent) => {
			if (!isInsideField(event.target)) {
				setIsOpen(false);
			}
		};
		// Capturing, so a scroll of the sidebar's body (which does not bubble) is
		// seen; one inside the panel (a font list) is the panel's own.
		const handleScroll = (event: Event) => {
			if (!isInsideField(event.target)) {
				setIsOpen(false);
			}
		};
		// Escape closes the panel and nothing more: taken in the capture phase so
		// it never reaches the canvas root, where the same key would drop the
		// selection the panel was opened for.
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			setIsOpen(false);
		};
		document.addEventListener("pointerdown", handlePointerDown, true);
		document.addEventListener("scroll", handleScroll, true);
		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
			document.removeEventListener("scroll", handleScroll, true);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [isOpen]);

	// The host is set by the sidebar's ref callback after its first commit, which
	// is before anything can be opened; null here means the field was rendered
	// somewhere else, which no fallback placement would make right.
	if (isOpen && !overlayHost) {
		throw new Error(
			"PropertyDropdownField must be rendered inside the properties sidebar (PropertyPanelOverlayHostContext is unset)",
		);
	}

	return (
		<PropertyDropdownFieldRoot>
			<PropertyDropdownTrigger
				ref={triggerRef}
				type="button"
				aria-expanded={isOpen}
				title={title}
				aria-label={title}
				data-gesture="none"
				onClick={() => {
					if (!isOpen) {
						setOpenedPlacement(placement);
					}
					setIsOpen(!isOpen);
				}}
			>
				{isMixed
					? (mixedPreview ?? (
							<PropertyMixedLabel>
								{messages.propertyPanelMixed}
							</PropertyMixedLabel>
						))
					: preview}
				<PropertyDropdownChevron>
					<ChevronDownIcon width={CHEVRON_SIZE} height={CHEVRON_SIZE} />
				</PropertyDropdownChevron>
			</PropertyDropdownTrigger>
			{isOpen &&
				overlayHost &&
				createPortal(
					<ObjectMenuDropdownPanel
						ref={panelRef}
						style={buildPanelStyle(openedPlacement, panelTop)}
					>
						{children}
					</ObjectMenuDropdownPanel>,
					overlayHost,
				)}
		</PropertyDropdownFieldRoot>
	);
};

export const PropertyDropdownField = memo(PropertyDropdownFieldComponent);
