import { CONTAINER_HEADER_HEIGHT } from "../schema/ContainerDoc";
import type { ContainerState } from "../state/ContainerState";

/**
 * Effective header band height for rendering: the per-object value
 * (absent = default), clamped so it never exceeds the box height.
 */
export const calcContainerHeaderHeight = (
	state: Pick<ContainerState, "headerHeight" | "height">,
): number =>
	Math.min(state.headerHeight ?? CONTAINER_HEADER_HEIGHT, state.height);
