import { expect, type Page } from "@playwright/test";

import {
	selectors,
	type AnchorId,
	type ColorSectionId,
	type ToolTitle,
} from "./selectors";

/**
 * キャンバス操作の状態スナップショット比較などに使う図形情報。
 * transform の e,f が図形の中心座標。
 */
export type ObjectSnapshot = {
	id: string | null;
	tag: string;
	transform: string | null;
	fill: string | null;
	stroke: string | null;
};

/**
 * ビューポート端から 20px 以内のドラッグはキャンバスの自動スクロールを誘発する
 * （AUTO_SCROLL_THRESHOLD）。テスト座標はこのマージンの内側に収めること。
 */
export const AUTO_SCROLL_MARGIN = 25;

/** 図形のない場所。選択解除やテキスト確定のクリックに使う */
const EMPTY_SPOT = { x: 70, y: 860 };

/**
 * svg-canvas-2 を実ユーザーと同じ UI 操作で動かすドライバ。
 *
 * 方針: 失敗を隠すリトライは入れない。時間待ち（waitForTimeout）ではなく
 * 状態待ち（要素の出現・数の変化）で同期し、操作が効かなかった場合は
 * そのままテストを失敗させてプロダクトの問題として顕在化させる。
 */
export class CanvasDriver {
	constructor(readonly page: Page) {}

	async goto() {
		await this.page.goto("/", { waitUntil: "networkidle" });
		await expect(
			this.page.locator(selectors.toolButton("Rectangle")),
		).toBeVisible();
	}

	/** 図形・コネクターのスナップショットを取得する */
	async captureObjects(): Promise<ObjectSnapshot[]> {
		return this.page.evaluate(
			({ objectSelector, connectorSelector }) =>
				[
					...document.querySelectorAll(
						`${objectSelector}, ${connectorSelector}`,
					),
				].map((el) => ({
					id: el.getAttribute("data-id"),
					tag: el.tagName.toLowerCase(),
					transform: el.getAttribute("transform"),
					fill: el.getAttribute("fill"),
					stroke: el.getAttribute("stroke"),
				})),
			{
				objectSelector: selectors.object,
				connectorSelector: selectors.connectorPolyline,
			},
		);
	}

	/** 中間イベント付きのドラッグ。ジェスチャー認識には steps が必要 */
	async drag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		await this.page.mouse.move(to.x, to.y, { steps });
		await this.page.mouse.up();
	}

	/**
	 * 指定座標でホイールを回す。ctrl=true でキャンバスズーム、それ以外はスクロール。
	 * 先に move でポインタを置いてから wheel を送る（wheel の target を確定させるため）。
	 */
	async wheel(
		point: { x: number; y: number },
		{
			deltaX = 0,
			deltaY = 0,
			ctrl = false,
		}: { deltaX?: number; deltaY?: number; ctrl?: boolean },
	) {
		await this.page.mouse.move(point.x, point.y);
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		await this.page.mouse.wheel(deltaX, deltaY);
		if (ctrl) {
			await this.page.keyboard.up("Control");
		}
	}

	/**
	 * ドラッグを「押下→移動」まで進めて保持したまま inspect を実行し、その後に解放する。
	 * スナップガイドは drag 中のみ DOM に存在し dragEnd でクリアされるため、
	 * ガイドの検証は解放前のこのコールバック内で行う必要がある。
	 * ctrl=true で Control を押しながらドラッグする（スナップ無効化の検証用）。
	 */
	async dragInspecting(
		from: { x: number; y: number },
		to: { x: number; y: number },
		inspect: () => Promise<void>,
		{ steps = 10, ctrl = false }: { steps?: number; ctrl?: boolean } = {},
	) {
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		await this.page.mouse.move(to.x, to.y, { steps });
		try {
			await inspect();
		} finally {
			await this.page.mouse.up();
			if (ctrl) {
				await this.page.keyboard.up("Control");
			}
		}
	}

	/** 表示中のスナップガイド（指定軸）のロケーター。x=縦ガイド / y=横ガイド */
	snapGuides(axis: "x" | "y") {
		return this.page.getByTestId(`snap-guide:${axis}`);
	}

	/**
	 * 表示中のスナップガイド（指定軸）の整列座標を返す。
	 * x軸ガイド（縦線）は x1、y軸ガイド（横線）は y1 が整列座標そのもの。
	 * 既定ビューポート（zoom=1・パンなし）では SVG 座標＝画面座標。
	 */
	async snapGuideCoordinates(axis: "x" | "y"): Promise<number[]> {
		return this.page.evaluate((targetAxis) => {
			const attr = targetAxis === "x" ? "x1" : "y1";
			return [
				...document.querySelectorAll(
					`[data-testid="snap-guide:${targetAxis}"]`,
				),
			].map((el) => Number(el.getAttribute(attr)));
		}, axis);
	}

	/** 右ボタンドラッグ（ビューポートのパンに使う） */
	async rightDrag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down({ button: "right" });
		await this.page.mouse.move(to.x, to.y, { steps });
		await this.page.mouse.up({ button: "right" });
	}

	/**
	 * いま表示されているコントロール（選択ハンドル・接続アンカー等）の data-id 一覧。
	 * コントロールは表示中のみ DOM にマウントされるため、これがそのまま可視集合になる。
	 */
	async visibleControlIds(): Promise<string[]> {
		return this.page.evaluate(
			(controlSelector) =>
				[...document.querySelectorAll(controlSelector)]
					.map((el) => el.getAttribute("data-id"))
					.filter((id): id is string => id !== null),
			selectors.control,
		);
	}

	/** 特定のコントロールが表示されているか */
	async isControlVisible(controlId: string): Promise<boolean> {
		return (await this.visibleControlIds()).includes(controlId);
	}

	/** いずれかのコントロールが表示されているか（選択状態の簡易判定） */
	async hasAnyControl(): Promise<boolean> {
		return (await this.visibleControlIds()).length > 0;
	}

	/**
	 * ツールを選んでドラッグで図形を描き、新規図形の data-id を返す。
	 * 描画直後は図形が自動選択され ObjectMenu が表示される。
	 */
	async drawShape(
		tool: ToolTitle,
		from: { x: number; y: number },
		to: { x: number; y: number },
	): Promise<string> {
		const before = await this.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await this.page.click(selectors.toolButton(tool));
		await this.drag(from, to);

		// 状態待ち: 新規オブジェクトの出現を待つ（出なければ操作が効いていない）
		await expect
			.poll(async () => (await this.captureObjects()).length, {
				message: `${tool} で新規図形が作成されること`,
			})
			.toBe(before.length + 1);

		const after = await this.captureObjects();
		const created = after.find((obj) => !beforeIds.has(obj.id));
		if (!created?.id) {
			throw new Error(`${tool} で作成された図形の data-id が取得できない`);
		}
		return created.id;
	}

	/** 図形をクリックで選択し、ObjectMenu の表示を待つ */
	async selectAt(point: { x: number; y: number }) {
		await this.page.mouse.click(point.x, point.y);
		await expect(this.page.locator(selectors.control).first()).toBeVisible();
	}

	/** 空きスペースをクリックして選択解除（テキスト編集中なら確定）する */
	async deselect() {
		await this.page.mouse.click(EMPTY_SPOT.x, EMPTY_SPOT.y);
		await expect(this.page.locator(selectors.control)).toHaveCount(0);
	}

	/** ダブルクリックでテキストエディタを開き、タイプする。確定は commitText() */
	async typeTextAt(point: { x: number; y: number }, text: string) {
		await this.page.mouse.dblclick(point.x, point.y);
		await expect(this.page.locator(selectors.textEditor)).toBeVisible();
		await this.page.keyboard.type(text);
	}

	/** テキスト編集を外側クリックで確定する（Escape はキャンセルなので使わない） */
	async commitText() {
		await this.page.mouse.click(EMPTY_SPOT.x, EMPTY_SPOT.y);
		await expect(this.page.locator(selectors.textEditor)).toHaveCount(0);
	}

	/** テキスト編集を Escape でキャンセルする */
	async cancelText() {
		await this.page.keyboard.press("Escape");
		await expect(this.page.locator(selectors.textEditor)).toHaveCount(0);
	}

	/** 編集中の textarea 要素のロケーター（data-kind ラッパーの内側） */
	textArea() {
		return this.page.locator(`${selectors.textEditor} textarea`);
	}

	/** 編集中の textarea にフォーカスが当たっているか */
	async isTextEditorFocused(): Promise<boolean> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			return textarea !== null && document.activeElement === textarea;
		}, selectors.textEditor);
	}

	/**
	 * 編集中エディタの縦方向アライメントを top / middle / bottom で返す。
	 * ラッパー（flex）の computed align-items から逆算する。
	 */
	async textEditorVerticalAlign(): Promise<"top" | "middle" | "bottom" | null> {
		return this.page.evaluate((sel) => {
			const wrapper = document.querySelector(sel);
			if (!wrapper) {
				return null;
			}
			const align = getComputedStyle(wrapper).alignItems;
			if (align === "flex-start") {
				return "top";
			}
			if (align === "flex-end") {
				return "bottom";
			}
			if (align === "center") {
				return "middle";
			}
			return null;
		}, selectors.textEditor);
	}

	/** 編集中 textarea のスクロール位置 */
	async textEditorScrollTop(): Promise<number> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			return textarea instanceof HTMLTextAreaElement ? textarea.scrollTop : 0;
		}, selectors.textEditor);
	}

	/** 編集中 textarea の選択範囲（selectionStart / selectionEnd） */
	async textEditorSelection(): Promise<{ start: number; end: number } | null> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			if (!(textarea instanceof HTMLTextAreaElement)) {
				return null;
			}
			return { start: textarea.selectionStart, end: textarea.selectionEnd };
		}, selectors.textEditor);
	}

	/** ObjectMenu のセクション（ドロップダウン）をトグルで開く */
	async openObjectMenu(sectionId: string) {
		await this.page.click(selectors.objectMenuToggle(sectionId));
	}

	/**
	 * 選択中の図形の ObjectMenu からカラーピッカーを開き、CSS カラーを設定する。
	 * プリセットにない色も hex や "transparent" で指定できる。
	 */
	async setColor(sectionId: ColorSectionId, cssColor: string) {
		await this.openObjectMenu(sectionId);
		const input = this.page.locator(selectors.cssColorInput);
		await input.fill(cssColor);
		await input.press("Enter");
	}

	/**
	 * カラーピッカーのプリセットスウォッチをクリックして色を設定する。
	 * セクションはあらかじめ開いておくか、open=true で開いてから押す。
	 */
	async pickColorSwatch(
		sectionId: ColorSectionId,
		property: string,
		value: string,
		open = true,
	) {
		if (open) {
			await this.openObjectMenu(sectionId);
		}
		await this.page.click(selectors.objectMenuSet(property, value));
	}

	/**
	 * ObjectMenu のスライダーを水平ドラッグして値を変える。
	 * セクションは事前に開いておくこと。dx 正で右（増加）方向。
	 * スライダーは gesture（native-pointer）経由で drag/dragEnd を発火させる必要があるため
	 * 実際のポインタドラッグで操作する。
	 */
	async dragSliderBy(property: string, dx: number) {
		const slider = this.page.locator(selectors.objectMenuSlider(property));
		await expect(slider).toBeVisible();
		const box = await slider.boundingBox();
		if (!box) {
			throw new Error(`スライダー ${property} の位置が取得できない`);
		}
		const startX = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await this.drag({ x: startX, y }, { x: startX + dx, y }, 10);
	}

	/**
	 * ObjectMenu スライダー横の数値入力欄に値を入れて Enter で確定する。
	 * セクションは事前に開いておくこと。テスト専用フック data-testid で特定する。
	 */
	async setNumberInput(property: string, value: number) {
		const input = this.page.getByTestId(`menu-number-input:${property}`);
		await input.fill(String(value));
		await input.press("Enter");
	}

	/** 選択中の図形の縦方向アライメント（top / middle / bottom）を設定する */
	async setVerticalAlign(value: "top" | "middle" | "bottom") {
		await this.openObjectMenu("alignment");
		await this.page.click(selectors.objectMenuSet("verticalAlign", value));
	}

	/** 選択中の線・コネクター・図形枠線の線種を設定する */
	async setStrokeDashType(
		menuSectionId: "line-style" | "border-style",
		dashType: "solid" | "dashed" | "dotted",
	) {
		await this.page.click(selectors.objectMenuToggle(menuSectionId));
		await this.page.click(selectors.objectMenuSet("strokeDashType", dashType));
	}

	/**
	 * 選択中の図形の接続アンカーから指定座標へドラッグしてコネクターを作成し、
	 * 新規コネクターの data-id を返す。接続元はあらかじめ選択しておくこと。
	 */
	async createConnector(
		sourceAnchorId: AnchorId,
		dropPoint: { x: number; y: number },
	): Promise<string> {
		const beforeIds = new Set(
			(await this.captureObjects()).map((obj) => obj.id),
		);

		const anchor = this.page.locator(selectors.createAnchor(sourceAnchorId));
		await expect(anchor).toBeVisible();
		const box = await anchor.boundingBox();
		if (!box) {
			throw new Error(`アンカー ${sourceAnchorId} の位置が取得できない`);
		}
		await this.drag(
			{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
			dropPoint,
			12,
		);

		await expect
			.poll(
				async () =>
					(await this.captureObjects()).filter((obj) => !beforeIds.has(obj.id))
						.length,
			)
			.toBeGreaterThan(0);

		const created = (await this.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		if (!created?.id) {
			throw new Error("作成されたコネクターの data-id が取得できない");
		}
		return created.id;
	}

	/** 指定座標を右クリックして自前のコンテキストメニューを開く */
	async openContextMenu(point: { x: number; y: number }) {
		await this.page.mouse.click(point.x, point.y, { button: "right" });
		await expect(
			this.page.locator(selectors.contextMenuAny).first(),
		).toBeVisible();
	}

	/** 自前のコンテキストメニューが表示されているか */
	async contextMenuVisible(): Promise<boolean> {
		return (await this.page.locator(selectors.contextMenuAny).count()) > 0;
	}

	/** コンテキストメニューの command 項目をクリックする */
	async clickContextMenuCommand(commandId: string) {
		await this.page.click(selectors.contextMenuCommand(commandId));
	}

	/** コンテキストメニューの callback 項目をクリックする */
	async clickContextMenuItem(id: string) {
		await this.page.click(selectors.contextMenuCallback(id));
	}

	/**
	 * 変形ハンドル（リサイズ8方向 / 回転）をドラッグする。対象は選択済みであること。
	 * handle は selectors.transformControl と同じ識別子。
	 */
	async dragTransformHandle(
		handle:
			| "topLeft"
			| "topCenter"
			| "topRight"
			| "leftCenter"
			| "rightCenter"
			| "bottomLeft"
			| "bottomCenter"
			| "bottomRight"
			| "rotation",
		to: { x: number; y: number },
	) {
		const control = this.page.locator(selectors.transformControl(handle));
		await expect(control).toBeVisible();
		const box = await control.boundingBox();
		if (!box) {
			throw new Error(`変形ハンドル ${handle} の位置が取得できない`);
		}
		await this.drag(
			{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
			to,
			10,
		);
	}

	/** 選択中のオブジェクトを Delete キーで削除する */
	async deleteSelection() {
		await this.page.keyboard.press("Delete");
	}

	/** Undo（Ctrl+Z） */
	async undo() {
		await this.page.keyboard.press("Control+z");
	}

	/** Redo（Ctrl+Shift+Z） */
	async redo() {
		await this.page.keyboard.press("Control+Shift+z");
	}

	/** data-id で図形のロケーターを取得する */
	objectById(id: string) {
		return this.page.locator(`[data-id="${id}"]`).first();
	}

	/**
	 * ポリラインの描画要素のロケーターを取得する。
	 * ポリラインは当たり判定用（data-id 付き・透明）と描画用（stroke 等のスタイル付き）の
	 * 2要素で構成されるため、スタイルの検証は描画側に対して行う必要がある。
	 */
	async visualPolylineFor(id: string) {
		const points = await this.objectById(id).getAttribute("points");
		return this.page.locator(`polyline[points="${points}"]:not([data-kind])`);
	}

	/** キャンバスのパン/ズーム状態（メイン svg の viewBox）を取得する */
	async getViewBox(): Promise<string | null> {
		return this.page.evaluate(() => {
			const svgs = [...document.querySelectorAll("svg")];
			let canvas: SVGSVGElement | null = null;
			let best = 0;
			for (const svg of svgs) {
				const rect = svg.getBoundingClientRect();
				if (rect.width * rect.height > best) {
					best = rect.width * rect.height;
					canvas = svg;
				}
			}
			return canvas?.getAttribute("viewBox") ?? null;
		});
	}
}
