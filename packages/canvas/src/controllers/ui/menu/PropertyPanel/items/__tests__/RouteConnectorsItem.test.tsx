// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { defaultCanvasMessages } from "../../../../../../foundation/i18n/CanvasMessages";
import { CanvasMessagesContext } from "../../../../../../foundation/i18n/CanvasMessagesContext";
import { jaCanvasMessages } from "../../../../../../foundation/i18n/jaCanvasMessages";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import {
	buildChainDoc,
	layoutDocOps,
	layoutRegistries,
} from "../../../../../commands/arrange/layout/__tests__/support/layoutFixtures";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../../../registries/CanvasRegistries";
import { CanvasRegistriesContext } from "../../../../../registries/CanvasRegistriesContext";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { RouteConnectorsItem } from "../RouteConnectorsItem";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (
	canvasState: CanvasControllerState,
	registries: CanvasRegistries = layoutRegistries,
	messages = defaultCanvasMessages,
): HTMLDivElement => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	const mounted = root;
	act(() => {
		mounted.render(
			<CanvasRegistriesContext.Provider value={registries}>
				<CanvasMessagesContext.Provider value={messages}>
					<RouteConnectorsItem canvasState={canvasState} />
				</CanvasMessagesContext.Provider>
			</CanvasRegistriesContext.Provider>,
		);
	});
	return container;
};

const buttonOf = (element: HTMLElement): HTMLButtonElement => {
	const button = element.querySelector("button");
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("the row draws no button");
	}
	return button;
};

const withConnector = (): CanvasControllerState =>
	createInitialControllerState(buildChainDoc(), layoutRegistries);

const withoutConnector = (): CanvasControllerState => {
	const doc = buildChainDoc();
	layoutDocOps.deleteObjects(doc, ["connector-1", "connector-2"]);
	return createInitialControllerState(doc, layoutRegistries);
};

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = null;
	container = null;
});

describe("RouteConnectorsItem", () => {
	it("draws the label, one enabled button routed to the command, and its tooltip", () => {
		const element = render(withConnector());

		const button = buttonOf(element);
		expect(element.querySelectorAll("button")).toHaveLength(1);
		expect(element.textContent).toContain("Lines only");
		expect(button.textContent).toBe("Redraw");
		expect(button.disabled).toBe(false);
		expect(button.title).toBe(
			"Redraws the lines around the shapes without moving any shape",
		);
		expect(button.getAttribute("data-action")).toBe("command:routeConnectors");
	});

	it("stays in place, disabled, with nothing to redraw", () => {
		const button = buttonOf(render(withoutConnector()));

		expect(button.disabled).toBe(true);
	});

	it("reads in Japanese", () => {
		const element = render(withConnector(), layoutRegistries, jaCanvasMessages);

		const button = buttonOf(element);
		expect(element.textContent).toContain("線だけ整える");
		expect(button.textContent).toBe("引き直す");
		expect(button.title).toBe("図形を動かさず、図形を避けて線を引き直します");
	});

	it("draws no row when the command is not registered", () => {
		const element = render(
			withConnector(),
			createCanvasRegistries({ commands: ["undo"] }),
		);

		expect(element.textContent).toBe("");
		expect(element.querySelector("button")).toBeNull();
	});
});
