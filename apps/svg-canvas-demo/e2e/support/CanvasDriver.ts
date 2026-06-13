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

	/**
	 * 選択中の図形の ObjectMenu からカラーピッカーを開き、CSS カラーを設定する。
	 * プリセットにない色も hex や "transparent" で指定できる。
	 */
	async setColor(sectionId: ColorSectionId, cssColor: string) {
		await this.page.click(selectors.objectMenuToggle(sectionId));
		const input = this.page.locator(selectors.cssColorInput);
		await input.fill(cssColor);
		await input.press("Enter");
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
