# Project Format

Use this layout for project ID `yymmdd_xx`.

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
    }
  ]
}
```

- `kind`: `title`、`relation`、`node`、`icon`、`annotation`、`group` のいずれか。
- `box`: 元画像を横・縦とも0〜1000とした座標。重要要素は上下80pxの16:9セーフエリアに置く。
- すべての `id` を一意にし、矢印・接続線は独立した `relation` にする。

## animation.json

```json
[
  {
    "elementId": "title",
    "order": 1,
    "motion": "fade",
    "durationMs": 700,
    "delayMs": 0
  }
]
```

- `motion`: `fade`、`slide-left`、`slide-right`、`slide-up`、`slide-down`。
- タイトル→関係線→ノード→注釈を標準順とし、最終要素後は1.8秒保持する。
- 30fps、無音、8〜20秒に収める。
