# Project Format

案件ID `yymmdd_xx` では次の構成を使う。

```text
export/yymmdd_xx/
  yymmdd_xx.mp4
  yymmdd_xx_構造/
    project.json
    generated-image.png
    structure.json
    animation.json
```

## structure.json

```json
{
  "title": "短いタイトル",
  "summary": "図解の要約",
  "elements": [
    {
      "id": "title",
      "label": "短いタイトル",
      "kind": "title",
      "box": { "x": 250, "y": 70, "width": 500, "height": 100 },
      "connectsTo": []
    },
    {
      "id": "relation-1",
      "label": "左から右への関係線",
      "kind": "relation",
      "box": { "x": 350, "y": 300, "width": 300, "height": 180 },
      "connectsTo": ["node-2"],
      "relationPath": {
        "strokeWidth": 28,
        "commands": [
          { "type": "M", "x": 370, "y": 350 },
          { "type": "C", "cx1": 450, "cy1": 270, "cx2": 560, "cy2": 450, "x": 650, "y": 360 }
        ]
      }
    }
  ]
}
```

- `kind`: `title`、`relation`、`node`、`icon`、`annotation`、`group`。
- `box`: 画像全体の横・縦を0〜1000とした座標。全要素を画面内に収める。
- すべての `id` を一意にする。矢印や接続線は独立した `relation` にする。
- 新しい関係線には `relationPath` を設定する。座標は画面全体を0〜1000とし、最初のコマンドを `M`、以降を `L`、`Q`、`C` のいずれかにする。
- `strokeWidth` は1〜120。コマンド数は2〜32。

## animation.json

台本の意味に合わせ、次の安全な動きを自由に組み合わせる。名前付きテンプレートは選ばない。

```json
[
  {
    "elementId": "title",
    "order": 1,
    "durationMs": 1000,
    "delayMs": 0,
    "keyframes": [
      {
        "at": 0,
        "opacity": 0,
        "y": -30,
        "scale": 0.94,
        "easing": "ease-out"
      },
      {
        "at": 0.75,
        "opacity": 1,
        "y": 0,
        "scale": 1.04,
        "easing": "spring-soft"
      },
      {
        "at": 1,
        "opacity": 1,
        "x": 0,
        "y": 0,
        "scale": 1,
        "rotateDeg": 0,
        "reveal": 1
      }
    ]
  },
  {
    "elementId": "relation-1",
    "order": 2,
    "durationMs": 1200,
    "delayMs": 1000,
    "revealStyle": {
      "mode": "path",
      "direction": "forward"
    },
    "keyframes": [
      { "at": 0, "opacity": 1, "reveal": 0 },
      {
        "at": 1,
        "opacity": 1,
        "x": 0,
        "y": 0,
        "scale": 1,
        "rotateDeg": 0,
        "reveal": 1
      }
    ]
  }
]
```

### キーフレーム

- 1要素につき2〜8個。最初を `at: 0`、最後を `at: 1` とし、途中は小さい順にする。
- 省略した値は直前のキーフレームから引き継ぐ。最初の省略値は完成状態を使う。
- `opacity`: 0〜1。
- `x`、`y`: -240〜240px。
- `scale`: 0.75〜1.3。
- `rotateDeg`: -15〜15度。
- `reveal`: 0〜1。
- `easing`: `linear`、`ease-in`、`ease-out`、`ease-in-out`、`spring-soft`。
- 最後は必ず `opacity: 1`、`x: 0`、`y: 0`、`scale: 1`、`rotateDeg: 0`、`reveal: 1` にする。

### 描画方法と時間

- `revealStyle.mode`: `clip-x`、`clip-y`、`path`。
- `revealStyle.direction`: `forward` または `reverse`。省略時は `forward`。
- `path` は `relationPath` を持つ `relation` 要素だけで使う。
- `durationMs`: 200〜5000の整数。全要素の終了は18,200ms以内とし、完成図を最低1.8秒保持する。
- 30fps、無音、全体8〜20秒。

## 旧形式

既存の `motion: fade`、`draw`、`slide-left`、`slide-right`、`slide-up`、`slide-down` は引き続き読み込める。新しい案件ではキーフレーム形式を使う。