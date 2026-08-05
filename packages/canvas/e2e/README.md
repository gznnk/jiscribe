# canvas E2E tests

Test canvas with Playwright Test, driving the UI exactly like a real user.
This document is both a layout guide and a collection of know-how for driving
canvas from Playwright.

## Layout

```
packages/canvas/
├── playwright.config.mts   # webServer auto-starts the vite dev server for e2e/harness. testDir: e2e/specs (.mts because of top-level await)
├── e2e/
│   ├── harness/           # test-only harness (a minimal Vite app that mounts Canvas)
│   │   ├── main.tsx       # a single Canvas with an empty document (dark theme fixed). ?multi gives a 2-canvas setup
│   │   └── MultiCanvasApp.tsx  # a 2-canvas page for verifying keyboard scope
│   ├── fixtures.ts        # the canvas fixture (injects CanvasDriver)
│   ├── support/
│   │   ├── selectors.ts   # data-kind / data-id selector constants
│   │   └── CanvasDriver.ts # operation API (drawing, selection, text, color, connectors)
│   └── specs/             # the tests themselves (run by test:e2e)
```

Running:

```bash
pnpm --filter @workspace/canvas test:e2e         # from the root, pnpm test:e2e
pnpm --filter @workspace/canvas test:e2e:headed  # with the browser shown
pnpm --filter @workspace/canvas test:e2e:ui      # Playwright UI mode
pnpm --filter @workspace/canvas dev:harness      # start the harness manually (for visual debugging)
```

Design policy: **no retries that hide failures**. CanvasDriver synchronizes by waiting on
state rather than on time (waiting for elements to appear or for the object count to change
with `expect.poll` and friends), and when an operation does not take effect it lets the test
fail so the problem surfaces as a product problem. Recovery retries via Ctrl+Z (see the
gotchas below) are not brought into the tests.

## Basic setup

```js
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 10 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
```

- The dev server is `pnpm --filter @workspace/canvas dev:harness` (see the startup log for the port)
- On WSL2, WSLg (`DISPLAY=:0`) is available, so a headed run can show a real window
- Use `headless: false` + `slowMo` when you want to watch the motion; use headless (faster) when you only need verification
- **headless packs the operations closer together, so race conditions surface more easily**. Passing in headless implies passing in headed, but the converse may not hold

## DOM structure and selectors

The gesture system routes events by `data-kind` / `data-id`, so using the same attributes in
tests is the reliable choice.

How to pick between the attributes:

- **`data-kind` / `data-id`** … the product's **functional contract** (read by the gesture system). Tests use it "as a side benefit"
- **`data-testid`** … a **test-only hook**. Put it on elements that cannot be identified functionally (number inputs that do not go through gestures, decorative elements with `pointerEvents: none`, and so on). It is already enabled through `testIdAttribute: "data-testid"` in `playwright.config.mts`, and is used like `page.getByTestId("menu-number-input:strokeWidth")`. Keeping it out of the functional contract (`data-id`) separates test-driven identifiers from functional ones

### data-testid list

| data-testid                     | Element                                  | Notes                                                                                                                                         |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `menu-number-input:{property}`  | number input in the ObjectMenu           | a form element that does not go through gestures                                                                                              |
| `text-editor`                   | the text editing overlay                 | shared by shapes and connector labels. The inner TEXTAREA is `[data-testid="text-editor"] textarea`                                           |
| `context-menu-callback:{id}`    | callback items of the context menu       | items such as paste that do not go through gestures                                                                                           |
| `snap-guide:x` / `snap-guide:y` | snap guide lines (vertical / horizontal) | decoration with `pointerEvents: none`. Present only during a drag. The aligned coordinate is held in the line's `x1` (x axis) / `y1` (y axis) |

| data-kind     | Meaning                                | data-id / data-part                                                                                                                                                                                                                                                                                                                     |
| ------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas`      | the canvas itself (DIV)                | id: `canvas`                                                                                                                                                                                                                                                                                                                            |
| `object`      | a shape (rect / ellipse / polyline …)  | id: UUID. **1 object = 1 element** (what `captureObjects` counts). Shapes with sections (record) carry part: `name` / `rows` on their section elements                                                                                                                                                                                  |
| `connector`   | a connector (polyline + arrow + label) | id: UUID. The label box is part: `label` (dragging it moves position / offset)                                                                                                                                                                                                                                                          |
| `control`     | handles shown while selected           | see the table below                                                                                                                                                                                                                                                                                                                     |
| `menu`        | UI menus in general                    | id: `toolbar` / `object-menu` / `context-menu` / `stencil-library` / `stencil-category`. Buttons use part (see the table below). The toolbar's own buttons carry **only** part and take kind / id from the bar element, so select them as a descendant: `[data-id="toolbar"] [data-part="command:zoomIn"]` (`selectors.toolbarCommand`) |
| `text-editor` | the TEXTAREA while editing text        | id: `textarea`                                                                                                                                                                                                                                                                                                                          |

For the three-axis grammar of kind / id / part, see
`packages/canvas/docs/04-gesture-system.md`.
Shape library buttons use part: `item:<presetId>` (for example `item:rect`).

Toolbar buttons can also be identified by the `title` attribute, as in
`button[title="Rectangle"]` (Rectangle / Ellipse / Polyline / Polygon / Callout /
Sticky / Markdown — the harness pins all of them, including the plugin-supplied
Sticky and Markdown).

### data-id / data-part of control

| data-id / data-part                                                          | Role                                                                                                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id: `transform`, part: `resize:topLeft` … `resize:bottomRight`, 8 directions | resize handles (8px square)                                                                                                                               |
| id: `transform`, part: `rotation`                                            | the rotation handle (around +15,-15 outside topRight)                                                                                                     |
| id: `<uuid>`, part: `anchor:<anchorId>`                                      | the connector creation anchor. `anchorId` is `topCenter` / `bottomCenter` / `leftCenter` / `rightCenter`. Drawn **20px outside the midpoint of the edge** |
| id: `<uuid>`, part: `vertex:<i>` / `vertex-insert:<seg>`                     | handles for moving and inserting polyline / polygon vertices (moving a connector waypoint is also `vertex:<i>`)                                           |
| id: `<uuid>`, part: `endpoint:source\|target` / `waypoint-insert:<seg>`      | handles for reconnecting a connector endpoint and inserting a waypoint                                                                                    |

### data-part of object-menu (data-id="object-menu")

| data-part                                        | What it opens                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `toggle:bg-color`                                | background color (property: `fill`)                                                      |
| `toggle:stroke-color`                            | border color (`stroke`)                                                                  |
| `toggle:line-color`                              | line color (`stroke`, for lines and connectors)                                          |
| `toggle:font-color`                              | font color (`fontColor`)                                                                 |
| `toggle:line-style` / `border-style`             | line type and width (and corner radius)                                                  |
| `toggle:font-size` / `alignment` / `stack-order` | font size / alignment / stacking order                                                   |
| `set:<property>:<value>`                         | immediate-apply buttons (for example `set:strokeDashType:dashed`, preset color swatches) |

The color picker has a **text input for a CSS color** (`input[placeholder="CSS color"]`)
where any hex value or `transparent` can be typed and **confirmed with Enter**. Use it for
colors that are not in the presets.

## Coordinate systems

- By default (zoom 1, no pan) **document coordinates ≒ screen coordinates**
- Pan/zoom is implemented through the SVG `viewBox`. Reading the `viewBox` attribute of the largest `svg` tells you the current pan/zoom state (useful as an invariant check during a test)
- Shape elements carry `transform="matrix(1,0,0,1,cx,cy)"`, where **e,f are the center coordinates of the shape**. `x,y,width,height` are relative to that center origin
- A connector's `points` are in SVG coordinates. Convert to screen coordinates with `el.getScreenCTM()` + `DOMPoint.matrixTransform()`

## Semantics of the operations

| Operation        | How                                                                        | Notes                                                                                                               |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| draw a shape     | click the tool button → drag diagonally                                    | the tool returns to select mode after drawing. **A new shape is automatically selected** and the ObjectMenu appears |
| select           | click the shape                                                            | hits the frontmost shape                                                                                            |
| multi-select     | drag from empty space (marquee)                                            |                                                                                                                     |
| move             | mousedown on the shape → move → up                                         |                                                                                                                     |
| edit text        | double click → type into the TEXTAREA                                      | **Escape cancels**. Commit by **clicking outside** (starting another gesture also commits)                          |
| color and style  | from the ObjectMenu while selected                                         | see the data-id above                                                                                               |
| create connector | select the source → drag from the creation anchor to an edge of the target | **it is not selected right after creation**. To style it, click the line to select it again                         |
| rotate           | drag the rotation handle along a circular path around the center           | compute the radius from the handle position                                                                         |
| Undo / Redo      | Ctrl+Z / Ctrl+Shift+Z (modifier required)                                  | useful for recovering from a mistake                                                                                |

Drags must use `page.mouse.move(x, y, { steps: N })` so intermediate events are produced.
An instantaneous move without steps is bad for gesture recognition and for the visibility of
demos.

## Gotchas (important)

### 1. Clicks on tool buttons "sometimes" do not take effect

If the interval since the previous click is short, tool selection can be ignored because of
a collision with the double-click decision and the like. Dragging in that state
**grabs and moves an existing shape instead**, and subsequent color settings and text input
are misapplied to that shape too (the damage cascades).

Countermeasures:

- Put a **pause of about 300ms** between clicks
- **Verify that the object count increased** after drawing. If it did not, check whether the transform of an existing shape changed, and if it did, **restore with Ctrl+Z and retry**

```js
const before = await captureObjects(); // id and transform of [data-kind=object]
await page.click('button[title="Rectangle"]');
await drag(...);
const after = await captureObjects();
if (after.length === before.length) {
	// if a shape was moved by mistake, restore it with Ctrl+Z and retry
}
```

### 2. Escape "cancels" text editing

What you typed is discarded. Commit by clicking outside
(`commitTextEditIfNeeded` runs when another gesture starts).

### 3. Color dropdowns can cover the shape

The ObjectMenu appears below the selected shape, but near the bottom edge of the screen the
dropdown **flips upward and covers the shape itself**. Double clicking in that state hits
the panel (a preset swatch), which misbehaves: the text editor does not open, an unintended
color is applied, and so on.

Countermeasure: **clear the selection to close the menu** before editing text. On top of
that, confirm with `waitForSelector` that `[data-kind=text-editor]` appeared after the
double click, and retry if it did not.

### 4. Auto-scroll (pan) within 20px of the viewport edge

If the pointer comes within `AUTO_SCROLL_THRESHOLD = 20` px of an edge during a drag, the
canvas pans (10px per step). Operations that drag right up to the edge (a rectangle filling
the screen, for example) shift the viewBox and break every coordinate assumption that
follows.

Countermeasure: keep operation coordinates **at least 25px** away from the edges. Watch for
changes to the viewBox as an invariant across the whole test.

### 5. Verify by the result, not by "having performed the operation"

- Check for the presence of text with `document.body.textContent` (`innerHTML` escapes `&` into `&amp;` and gives false negatives)
- Taking a snapshot of each object's `id / transform / fill` after every operation and **detecting unintended moves and recoloring** makes it much faster to find the cause
- Leaving screenshots (`page.screenshot`) lets you check the appearance even in headless
