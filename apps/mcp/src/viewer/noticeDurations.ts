/**
 * What a notice says: that all is well (`info`), or that something of the person's
 * went somewhere other than they meant (`warning`: edits not saved, a reference
 * the viewer cannot open)
 */
export type NoticeKind = "info" | "warning";

/**
 * How long a notice stays up, fading in and back out included. The element is
 * dropped on the same timer the animation runs on, so it is passed to the
 * animation rather than repeated in the stylesheet. A warning names what was lost,
 * which takes longer to read than a line saying nothing had to be done
 */
export const noticeDurationsMs: Record<NoticeKind, number> = {
	info: 2_000,
	warning: 6_000,
};
