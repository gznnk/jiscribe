import type { ExecuteEvent } from "../../events/ExecuteEvent";

/**
 * Props for executable component.
 */
export type ExecutableProps = {
	onExecute?: (e: ExecuteEvent) => void;
};
