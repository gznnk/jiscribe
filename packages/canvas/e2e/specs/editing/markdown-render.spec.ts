import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * markdown 図形（type: "markdown"）が、本文を「プレーンテキストではなく HTML として」
 * 描画することを守る。
 *
 * 既存の draw.spec は textContent に "Title" が含まれることだけを見るため、Markdown 変換が
 * 壊れて生テキストを流し込むだけになっても気づけない。ここでは renderMarkdown →
 * （DOMPurify サニタイズ）→ foreignObject 内 HTML というパイプラインの結果を、
 * 見出し・強調・リストといった実要素の有無で検証する。
 */

/**
 * 図形 id に対応する TextOverlay（foreignObject 内のテキスト div）の中から、
 * セレクタにマッチした要素の textContent 一覧を返す。
 */
async function renderedText(
	canvas: CanvasDriver,
	id: string,
	selector: string,
): Promise<string[]> {
	return canvas.page.evaluate(
		({ targetId, sel }) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const wrapper = sibling?.firstElementChild;
			const textDiv = wrapper?.firstElementChild ?? null;
			if (!textDiv) {
				return [];
			}
			return [...textDiv.querySelectorAll(sel)].map(
				(el) => el.textContent ?? "",
			);
		},
		{ targetId: id, sel: selector },
	);
}

test.describe("Markdown 描画", () => {
	test("既定の Markdown 文面は見出しと強調を HTML 要素として描画する", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);

		// "# Title" → <h1>Title</h1>、"**markdown**" → <strong>markdown</strong>
		await expect.poll(() => renderedText(canvas, id, "h1")).toEqual(["Title"]);
		expect(await renderedText(canvas, id, "strong")).toEqual(["markdown"]);
	});

	test("本文を編集すると Markdown 描画が更新される（見出しとリスト）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		// 既存の生 Markdown を全選択して置き換える。
		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await expect(canvas.textArea()).toBeVisible();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("## Updated\n\n- first\n- second");
		await canvas.commitText();

		await expect
			.poll(() => renderedText(canvas, id, "h2"))
			.toEqual(["Updated"]);
		expect(await renderedText(canvas, id, "li")).toEqual(["first", "second"]);
		// 旧見出しが残っていないこと（置き換わったこと）。
		expect(await renderedText(canvas, id, "h1")).toEqual([]);
	});

	test("リンクは target=_blank / rel=noopener noreferrer 付きで描画される", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await expect(canvas.textArea()).toBeVisible();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("[Example](https://example.com)");
		await canvas.commitText();

		// アンカーが描画され、新規タブ用の安全属性が DOMPurify 通過後も保持される。
		const anchor = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const link = sibling?.querySelector("a");
			return link
				? {
						text: link.textContent,
						href: link.getAttribute("href"),
						target: link.getAttribute("target"),
						rel: link.getAttribute("rel"),
					}
				: null;
		}, id);

		expect(anchor).not.toBeNull();
		expect(anchor?.text).toBe("Example");
		expect(anchor?.href).toBe("https://example.com");
		expect(anchor?.target).toBe("_blank");
		expect(anchor?.rel).toBe("noopener noreferrer");
	});

	test("言語付きコードフェンスは language- クラス付きの code になる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await expect(canvas.textArea()).toBeVisible();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("```js\nconst x = 1;\n```");
		await canvas.commitText();

		const code = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const codeEl = sibling?.querySelector("pre code");
			return codeEl
				? {
						className: codeEl.className,
						text: codeEl.textContent,
					}
				: null;
		}, id);

		expect(code).not.toBeNull();
		expect(code?.className).toContain("language-js");
		expect(code?.text).toContain("const x = 1;");
	});

	test("言語指定なしのコードフェンスはクラスなしの素の code になる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		await canvas.deselect();

		const center = canvas.toScreen({ x: 550, y: 300 });
		await canvas.page.mouse.dblclick(center.x, center.y);
		await expect(canvas.textArea()).toBeVisible();
		await canvas.page.keyboard.press("Control+a");
		await canvas.page.keyboard.type("```\nplain text\n```");
		await canvas.commitText();

		const code = await canvas.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			let sibling = shape?.nextElementSibling ?? null;
			while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
				sibling = sibling.nextElementSibling;
			}
			const codeEl = sibling?.querySelector("pre code");
			return codeEl
				? {
						className: codeEl.className,
						text: codeEl.textContent,
					}
				: null;
		}, id);

		expect(code).not.toBeNull();
		expect(code?.className).toBe("");
		expect(code?.text).toContain("plain text");
	});
});
