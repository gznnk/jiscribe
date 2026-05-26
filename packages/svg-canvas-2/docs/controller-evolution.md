# Controller層の肥大化対策（Fat Controller問題への処方箋）

作成日: 2026-04-29

## 背景と課題感

現在の `svg-canvas-2` のアーキテクチャでは、`ObjectRegistry` による「描画オブジェクト（Shapes）の拡張性」は完璧に担保されています。
しかし、スナップ、グリッド、整列、ショートカット、スマートガイドなどの **「機能（Features）」** が追加されるたびに、Controller層の中核である `handleGesture.ts` や各種 `EventHandler` にif文や事前計算のロジックが差し込まれ、コードがパッチワーク的に肥大化していくリスク（Fat Controller問題）があります。

将来的に機能が10倍になっても破綻せず、かつAIエージェントが局所的にコードを修正しやすいクリーンな境界を保つためのアイデアを以下にまとめます。

---

## 1. 「意図（Intent）」と「実行（Execution）」の分離（Actionパターンの導入）

現在、`GestureHandler` や `Controller` は「イベントを受け取る」「計算をする」「新しいStateを直接返す」という役割を兼任しています。これをCQRS（コマンドクエリ責務分離）ライクに分離します。

- **現状**: `Gesture` → `EventHandler` が複雑な状態更新を行い、新たな State を返す。
- **改善案**:
  1.  `EventHandler` はイベントの文脈を解釈し、純粋な **`Action`** オブジェクト（例: `{ type: 'MOVE_OBJECTS', ids: ['rect-1'], delta: {x: 10, y: 0} }`）を発行（Dispatch）するレイヤーに留める。
  2.  実際の State の更新は純粋関数である `Reducer` や `ActionProcessor` に委譲する。
- **メリット**:
  - Undo/Redo の実装が特定のActionの逆再生という形でシンプルになります。
  - 「マウスのドラッグ」「矢印キーの押下」「プロパティパネルでの数値入力」という異なる起点からの操作ロジックを1つの Action で統合できます。

## 2. 機能（Features）の Middleware 化（プラグイン拡張）

`handleGesture.ts` のイベント開始時（`dragStart`など）に、スナップの事前計算（`calcSnapCandidates`）などがハードコードされていますが、機能が増えるほどこのフックが肥大化します。

- **改善案**: ReduxのMiddlewareのような **ライフサイクルフック（プラグインアーキテクチャ）** を導入します。
  ```typescript
  // handleGestureの内部をシンプルに保つ
  let nextState = state;
  if (EVENT_START_TYPES.includes(canvasEvent.type)) {
  	// 各機能（プラグイン）が独自のSnapshotを生成・追加できるようにする
  	nextState = featurePluginRegistry.onEventStart(nextState, canvasEvent);
  }
  ```
- **メリット**: スナップや整列といった機能を `controllers/features/snap` のような独立したディレクトリに完全に切り出すことができ、コアロジックを汚染せずに機能のオン/オフ（または後付け追加）が可能になります。

## 3. UI State（ViewModel）と Domain State の階層分離

キャンバスが複雑化すると、「保存すべき永続化データ」と「操作中のみ必要な一時データ」が混在し、Stateが肥大化します。

- **対象**:
  スナップのフィードバック線（`snapFeedback`）、範囲選択の矩形情報、現在のカーソル座標、ホバー中のオブジェクトIDなど。
- **改善案**:
  1.  `CanvasState` （ファイルに保存される Domain State）
  2.  `CanvasViewState` （操作中のUI表示やキャッシュなどを持つ UI State）
      これらを型、あるいは Store 階層で明確に分離します。
- **メリット**: ファイルのセーブ/ロード処理が堅牢になり、カーソル移動などの頻繁な UI State 更新処理で、重い Domain State のバリデーションや差分計算が不要にトリガーされるのを防げます。

## 4. Controller 内の「純粋な計算」の徹底排除

Controllerの行数が増える最大の原因は、コンポーネント内に「行列計算」や「木構造の探索処理」が混入することです。

- **改善案**: Controllerの中にループや複雑な演算を見つけたら、「State全体を知らなくても、必要な引数だけで結果が返る Pure Function（純粋関数）」に切り出し、`@workspace/geometry` 等の共通ユーティリティに追い出します。
- **理想形**: Controller は「Utility関数を呼び出し、その結果をStoreに詰めて返すだけの極めて薄い指揮者」に徹します。

## 5. 【追加】複雑な操作モードの State Machine（ステートマシン）化

図形描画ツールは「通常選択モード」「テキスト編集中」「多角形(Polygon)の頂点追加モード」など、モードによってイベントの解釈が全く異なります。これを `if (mode === 'xyz')` で分岐し始めると Controller がスパゲッティ化します。

- **改善案**: XState などのステートマシン設計を下敷きにし、モードごとの遷移ルールと許可されるイベントを宣言的に定義します。
- **メリット**: 「テキスト編集中にショートカットキーが暴発する」といった複雑なUIバグをアーキテクチャレベルで防ぐことができ、エージェント（AI）に特定モードの処理だけを追加・修正させやすくなります。
