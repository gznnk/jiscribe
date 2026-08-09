import type { CreateObjectState } from "@jiscribe/canvas";

import type { TerminalWindowFeatures } from "../../schema/terminalWindow/TerminalWindowDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TerminalWindowStateBrand: unique symbol;

export type TerminalWindowState = CreateObjectState<
	typeof TerminalWindowFeatures,
	typeof TerminalWindowStateBrand
>;
