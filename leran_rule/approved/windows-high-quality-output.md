# Windows互換の高画質出力

- 1920×1080、30fps、16秒、無音のMP4を標準とする。
- PNG品質のProRes 4444・10bit中間映像から、H.264へ一度だけ圧縮する。
- H.264 High／Level 4.2、YUV 4:2:0、約12Mbps、BT.709 limited range、fast-startで出力する。
- RGBからlimited rangeへの変換を二重適用せず、Windowsメディアプレイヤーとの互換性を維持する。
- 最終MP4の検証に成功した後で、中間映像を削除する。
