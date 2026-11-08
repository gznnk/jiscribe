import { DocOperationError } from "@jiscribe/doc/ops/errors";
import type * as RoutingModule from "@jiscribe/doc/ops/routing";
import { routeConnectors } from "@jiscribe/doc/ops/routing";
import { describe, expect, it, vi } from "vitest";

import { buildChainDoc, layoutRegistries } from "./support/layoutFixtures";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import type { ExecutableCommand } from "../../../CommandTypes";

vi.mock("@jiscribe/doc/ops/routing", async (importOriginal) => ({
	...(await importOriginal<typeof RoutingModule>()),
	routeConnectors: vi.fn(),
}));

const routeCommand = layoutRegistries.command.get(
	"routeConnectors",
) as ExecutableCommand;

const state = deepFreezeState(
	createInitialControllerState(buildChainDoc(), layoutRegistries),
);

describe("the routeConnectors command when the op throws", () => {
	it("returns the state itself for a DocOperationError and warns with its message", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.mocked(routeConnectors).mockImplementation(() => {
			throw new DocOperationError("no box to measure");
		});

		expect(routeCommand.execute(state, layoutRegistries)).toBe(state);

		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0][0]).toContain("no box to measure");
		warn.mockRestore();
	});

	it("lets any other error through", () => {
		vi.mocked(routeConnectors).mockImplementation(() => {
			throw new TypeError("a bug");
		});

		expect(() => routeCommand.execute(state, layoutRegistries)).toThrow(
			TypeError,
		);
	});
});
