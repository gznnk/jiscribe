import type { ContainerFeatures } from "../../../../schemas/objects/containers/container/ContainerDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ContainerStateBrand: unique symbol;

export type ContainerState = CreateObjectState<
	typeof ContainerFeatures,
	typeof ContainerStateBrand,
	{
		/** Header band fill, independent of `fill` (the body). Default `"auto"` = theme surface. */
		headerFill?: string;
	}
>;
