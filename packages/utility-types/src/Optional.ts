import type { Prettify } from "./Prettify";

export type Optional<T, K extends keyof T> = Prettify<
	Omit<T, K> & Partial<Pick<T, K>>
>;
