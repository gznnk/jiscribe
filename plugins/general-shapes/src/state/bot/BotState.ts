import type { CreateObjectState } from "@jiscribe/canvas";

import type { BotFeatures } from "../../schema/bot/BotDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BotStateBrand: unique symbol;

export type BotState = CreateObjectState<
	typeof BotFeatures,
	typeof BotStateBrand
>;
