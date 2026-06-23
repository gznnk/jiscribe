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

/** 図形のない場所。選択解除やテキスト確定のクリックに使う（コンテンツ座標） */
const EMPTY_SPOT = { x: 70, y: 820 };

/**
 * canvas を実ユーザーと同じ UI 操作で動かすドライバ。
 *
 * 方針: 失敗を隠すリトライは入れない。時間待ち（waitForTimeout）ではなく
 * 状態待ち（要素の出現・数の変化）で同期し、操作が効かなかった場合は
 * そのままテストを失敗させてプロダクトの問題として顕在化させる。
 */
export class CanvasDriver {
	/**
	 * キャンバス領域（SVG）の画面上の原点（左上）。
	 *
	 * テストはすべて「コンテンツ座標」（= 画面座標 − 原点）で記述する。上部の
	 * ツールバーがレイアウト上の領域を占めるため、キャンバスは画面 y=ツールバー高さ
	 * から始まり、画面座標 = コンテンツ座標 + 原点 で対応づく。pan / zoom は viewBox を
	 * 変えるだけで SVG 要素自体の画面位置は動かさないため、この原点は一度測れば不変。
	 *
	 * boundingBox() 由来の座標は画面座標なので、ドライバへ渡す前に toContent() で
	 * コンテンツ座標へ変換すること。
	 */
	private originX = 0;
	private originY = 0;

	constructor(readonly page: Page) {}

	async goto() {
		await this.page.goto("/", { waitUntil: "networkidle" });
		await expect(
			this.page.locator(selectors.toolButton("Rectangle")),
		).toBeVisible();
		// キャンバス領域（data-kind="canvas"）の画面オフセットを測る。flex 子なので
		// マウント直後から実サイズを持ち、左上はツールバー高さ分だけ下にずれる。
		const origin = await this.page.evaluate(() => {
			const el = document.querySelector('[data-kind="canvas"]');
			const rect = el?.getBoundingClientRect();
			return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
		});
		this.originX = origin.x;
		this.originY = origin.y;
	}

	/**
	 * コンテンツ座標 → 画面座標。ドライバ内部の入力系で使うほか、CDP で生の画面座標を
	 * 送るテスト（マルチタッチ等）がコンテンツ座標を画面座標へ変換するのにも使う。
	 */
	toScreen(point: { x: number; y: number }): { x: number; y: number } {
		return { x: point.x + this.originX, y: point.y + this.originY };
	}

	/**
	 * 画面座標 → コンテンツ座標。boundingBox() で得た座標をドライバへ渡す前に通す。
	 */
	toContent(point: { x: number; y: number }): { x: number; y: number } {
		return { x: point.x - this.originX, y: point.y - this.originY };
	}

	/** 画面座標での中間イベント付きドラッグ（内部用・座標変換しない） */
	private async dragScreen(
		fromScreen: { x: number; y: number },
		toScreen: { x: number; y: number },
		steps = 8,
	) {
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down();
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		await this.page.mouse.up();
	}

	/** 図形・コネクターのスナップショットを取得する */
	async captureObjects(): Promise<ObjectSnapshot[]> {
		return this.page.evaluate(
			({ objectSelector, connectorSelector }) =>
				[
					...document.querySelectorAll(
						`${objectSelector}, ${connectorSelector}`,
					),
				].map((el) => {
					// 色は SVG 属性ではなく emotion CSS で当たるため computed style で読む
					// （issue #38 / theme 追従）。値はブラウザ正規化済みの rgb(...) 形式。
					const style = getComputedStyle(el);
					return {
						id: el.getAttribute("data-id"),
						tag: el.tagName.toLowerCase(),
						transform: el.getAttribute("transform"),
						fill: style.fill,
						stroke: style.stroke,
					};
				}),
			{
				objectSelector: selectors.object,
				connectorSelector: selectors.connectorPolyline,
			},
		);
	}

	/**
	 * 中間イベント付きのドラッグ（コンテンツ座標）。ジェスチャー認識には steps が必要。
	 * boundingBox 由来の座標を渡す場合は事前に toContent() で変換すること。
	 */
	async drag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		await this.dragScreen(this.toScreen(from), this.toScreen(to), steps);
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
		const screen = this.toScreen(point);
		await this.page.mouse.move(screen.x, screen.y);
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
	 * shift=true で Shift を押しながらドラッグする（軸固定の検証用）。
	 */
	async dragInspecting(
		from: { x: number; y: number },
		to: { x: number; y: number },
		inspect: () => Promise<void>,
		{
			steps = 10,
			ctrl = false,
			shift = false,
		}: { steps?: number; ctrl?: boolean; shift?: boolean } = {},
	) {
		const fromScreen = this.toScreen(from);
		const toScreen = this.toScreen(to);
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down();
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		if (shift) {
			await this.page.keyboard.down("Shift");
		}
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		try {
			await inspect();
		} finally {
			await this.page.mouse.up();
			if (ctrl) {
				await this.page.keyboard.up("Control");
			}
			if (shift) {
				await this.page.keyboard.up("Shift");
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

	/** 表示中の軸固定ガイド（指定軸）のロケーター。x=縦ガイド / y=横ガイド */
	axisLockGuides(axis: "x" | "y") {
		return this.page.getByTestId(`axis-lock-guide:${axis}`);
	}

	/**
	 * 表示中の軸固定ガイド（指定軸）の整列座標を返す。
	 * x軸ガイド（縦線）は x1、y軸ガイド（横線）は y1 が固定軸の座標。
	 * 既定ビューポート（zoom=1・パンなし）では SVG 座標＝画面座標。
	 */
	async axisLockGuideCoordinates(axis: "x" | "y"): Promise<number[]> {
		return this.page.evaluate((targetAxis) => {
			const attr = targetAxis === "x" ? "x1" : "y1";
			return [
				...document.querySelectorAll(
					`[data-testid="axis-lock-guide:${targetAxis}"]`,
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
		const fromScreen = this.toScreen(from);
		const toScreen = this.toScreen(to);
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down({ button: "right" });
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
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

		// ツールの click は描画モード（state.shapeDrawing）をセットするが、これは
		// React の非同期な状態更新なので、armed になる前にキャンバスをドラッグすると
		// CanvasEventHandler が shapeDrawing=null と判断し、描画ではなく範囲選択になる。
		// armed なツールボタンは cursor: crosshair（非 armed は grab）になるため、
		// これを状態待ちのシグナルにしてからドラッグする。
		await expect
			.poll(
				() =>
					this.page
						.locator(selectors.toolButton(tool))
						.evaluate((el) => getComputedStyle(el).cursor),
				{ message: `${tool} ツールが描画モードになること` },
			)
			.toBe("crosshair");

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

	/**
	 * クリックだけで配置される図形（Sticky）をツールボタンのクリックで
	 * キャンバス中央へ即時追加し、新規 data-id を返す。
	 * これらは対角ドラッグではなく ShapeLibraryItemHandler が即配置するため、
	 * crosshair 待ち＋ドラッグの drawShape ではなく本メソッドを使う。
	 */
	async placeShape(tool: ToolTitle): Promise<string> {
		const before = await this.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await this.page.click(selectors.toolButton(tool));

		await expect
			.poll(async () => (await this.captureObjects()).length, {
				message: `${tool} で新規図形が配置されること`,
			})
			.toBe(before.length + 1);

		const created = (await this.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		if (!created?.id) {
			throw new Error(`${tool} で配置された図形の data-id が取得できない`);
		}
		return created.id;
	}

	/** 図形をクリックで選択し、ObjectMenu の表示を待つ */
	async selectAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y);
		await expect(this.page.locator(selectors.control).first()).toBeVisible();
	}

	/**
	 * コンテンツ座標を左クリックする（選択状態のアサーションはしない）。
	 * コネクターなど selectAt の制御ハンドル前提が当てはまらない対象の選択に使う。
	 */
	async clickAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y);
	}

	/** 空きスペースをクリックして選択解除（テキスト編集中なら確定）する */
	async deselect() {
		const screen = this.toScreen(EMPTY_SPOT);
		await this.page.mouse.click(screen.x, screen.y);
		await expect(this.page.locator(selectors.control)).toHaveCount(0);
	}

	/** ダブルクリックでテキストエディタを開き、タイプする。確定は commitText() */
	async typeTextAt(point: { x: number; y: number }, text: string) {
		const screen = this.toScreen(point);
		await this.page.mouse.dblclick(screen.x, screen.y);
		await expect(this.page.locator(selectors.textEditor)).toBeVisible();
		await this.page.keyboard.type(text);
	}

	/** テキスト編集を外側クリックで確定する（Escape はキャンセルなので使わない） */
	async commitText() {
		const screen = this.toScreen(EMPTY_SPOT);
		await this.page.mouse.click(screen.x, screen.y);
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
		// box は画面座標。dragScreen で画面座標のまま操作する。
		const startX = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await this.dragScreen({ x: startX, y }, { x: startX + dx, y }, 10);
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
		// box は画面座標、dropPoint はコンテンツ座標。dragScreen に画面座標で揃える。
		await this.dragScreen(
			{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
			this.toScreen(dropPoint),
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
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y, { button: "right" });
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
		{ shift = false, ctrl = false }: { shift?: boolean; ctrl?: boolean } = {},
	) {
		const control = this.page.locator(selectors.transformControl(handle));
		await expect(control).toBeVisible();
		const box = await control.boundingBox();
		if (!box) {
			throw new Error(`変形ハンドル ${handle} の位置が取得できない`);
		}
		// box（ハンドル位置）は画面座標、to はコンテンツ座標。画面座標で揃える。
		const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const toScreen = this.toScreen(to);
		if (!shift && !ctrl) {
			await this.dragScreen(from, toScreen, 10);
			return;
		}
		// Shift 押下中のリサイズはアスペクト比を保つ（event.mods.shift 経路）。
		// Ctrl 押下中のリサイズはスナップを無効化する（event.mods.ctrl 経路）。
		// 押下はドラッグ開始（mouse.down）後に行い、解放前まで保持する。
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		if (shift) {
			await this.page.keyboard.down("Shift");
		}
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps: 10 });
		await this.page.mouse.up();
		if (shift) {
			await this.page.keyboard.up("Shift");
		}
		if (ctrl) {
			await this.page.keyboard.up("Control");
		}
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

	/** 選択をコピー（Ctrl+C）。内部クリップボードに載る */
	async copy() {
		await this.page.keyboard.press("Control+c");
	}

	/** 選択を切り取り（Ctrl+X）。コピー＋削除 */
	async cut() {
		await this.page.keyboard.press("Control+x");
	}

	/** クリップボードから貼り付け（Ctrl+V） */
	async paste() {
		await this.page.keyboard.press("Control+v");
	}

	/** 選択を複製（Ctrl+D）。クリップボードを介さない */
	async duplicate() {
		await this.page.keyboard.press("Control+d");
	}

	/** 全選択（Ctrl+A） */
	async selectAll() {
		await this.page.keyboard.press("Control+a");
	}

	/** Escape で選択解除（テキスト編集中でないこと） */
	async pressEscape() {
		await this.page.keyboard.press("Escape");
	}

	/** 選択をグループ化（Ctrl+G） */
	async group() {
		await this.page.keyboard.press("Control+g");
	}

	/** グループを解除（Ctrl+Shift+G） */
	async ungroup() {
		await this.page.keyboard.press("Control+Shift+g");
	}

	/**
	 * 矢印キーで選択図形をナッジ移動する。
	 * large=true（Shift 併用）で大きく移動する（通常 1px / 大 10px）。
	 */
	async nudge(
		direction: "up" | "down" | "left" | "right",
		{ large = false }: { large?: boolean } = {},
	) {
		const arrowKey = {
			up: "ArrowUp",
			down: "ArrowDown",
			left: "ArrowLeft",
			right: "ArrowRight",
		}[direction];
		await this.page.keyboard.press(large ? `Shift+${arrowKey}` : arrowKey);
	}

	/** 全体をビューに合わせる（Ctrl+0） */
	async zoomToFit() {
		await this.page.keyboard.press("Control+0");
	}

	/** 選択をビューに合わせる（Ctrl+2） */
	async zoomToSelection() {
		await this.page.keyboard.press("Control+2");
	}

	/**
	 * ObjectMenu の重なり順セクションを開いて arrange コマンドを実行する。
	 * commandId は bringToFront / bringForward / sendBackward / sendToBack。
	 */
	async arrange(
		commandId: "bringToFront" | "bringForward" | "sendBackward" | "sendToBack",
	) {
		await this.openObjectMenu("stack-order");
		await this.page.click(selectors.objectMenuCommand(commandId));
	}

	/** 図形（コネクター除く）の DOM 順インデックス。SVG では後ろの要素ほど前面 */
	async objectIndex(id: string): Promise<number> {
		return this.page.evaluate(
			({ objectSelector, targetId }) => {
				const objects = [...document.querySelectorAll(objectSelector)];
				return objects.findIndex(
					(el) => el.getAttribute("data-id") === targetId,
				);
			},
			{ objectSelector: selectors.object, targetId: id },
		);
	}

	/**
	 * z-order インデックス（図形 + コネクターを含む DOM 順）。SVG では後ろの要素ほど前面。
	 * objectIndex は [data-kind=object] のみでコネクターを含まないため、コネクターの
	 * 重なり順を確認するときはこちらを使う（複数要素で描かれるコネクターは最初の出現位置を返す）。
	 */
	async zOrderIndex(id: string): Promise<number> {
		return this.page.evaluate(
			({ objectSelector, connectorSelector, targetId }) =>
				[
					...document.querySelectorAll(
						`${objectSelector}, ${connectorSelector}`,
					),
				].findIndex((el) => el.getAttribute("data-id") === targetId),
			{
				objectSelector: selectors.object,
				connectorSelector: selectors.connectorPolyline,
				targetId: id,
			},
		);
	}

	/** data-id で図形のロケーターを取得する */
	objectById(id: string) {
		return this.page.locator(`[data-id="${id}"]`).first();
	}

	/**
	 * 図形の描画色（fill / stroke）を computed style から取得する。
	 * 色は SVG presentation 属性ではなく emotion CSS で当たるため、属性ではなく
	 * getComputedStyle で検証する必要がある（issue #38 / theme 追従）。
	 * 戻り値はブラウザ正規化済みの `rgb(...)` / `rgba(...)` 形式。
	 */
	async computedColor(id: string, prop: "fill" | "stroke"): Promise<string> {
		return this.objectById(id).evaluate(
			(el, p) => getComputedStyle(el).getPropertyValue(p),
			prop,
		);
	}

	/**
	 * CSS カラー文字列をブラウザの computed 形式（`rgb(...)` 等）へ正規化する。
	 * computedColor の戻り値と比較するために使う（hex で書いたテストを保ちつつ照合できる）。
	 */
	async normalizeColor(cssColor: string): Promise<string> {
		return this.page.evaluate((color) => {
			const probe = document.createElement("span");
			probe.style.color = color;
			document.body.appendChild(probe);
			const resolved = getComputedStyle(probe).color;
			probe.remove();
			return resolved;
		}, cssColor);
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
