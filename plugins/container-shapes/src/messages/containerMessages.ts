import type { LocaleMessages } from "@workspace/canvas/unstable";

/** UI strings owned by the container plugin, resolved via the canvas locale. */
type ContainerMessages = {
	menuHeaderColor: string;
};

export const containerMessagesByLocale: LocaleMessages<ContainerMessages> = {
	en: { menuHeaderColor: "Header Color" },
	ja: { menuHeaderColor: "ヘッダー色" },
};
