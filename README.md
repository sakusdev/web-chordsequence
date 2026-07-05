# Chord Sequence Studio

ブラウザ上でコードを選び、コードシーケンスを作成し、ピアノ風音源でプレビュー再生し、MIDI/WAVを書き出せる静的Webアプリです。

## Features

- Root / Quality / Octave / 長さを指定してコードを追加
- 王道進行、小室進行、丸サ進行、コンファメ進行、枯葉進行、カノン進行などのプリセット
- コード帳からコードを検索・プレビュー・追加
- Web Audio APIによるコードプレビュー再生
- ピアノ風ブラウザシンセ音源
- Warm Pad / Sine / Triangle / Sawtooth / Square 音色
- ループ再生
- Velocity / Humanize / Reverb / Attack / Release 調整
- シーケンス全体の再生
- MIDIファイルの書き出し
- WAVファイルのオフラインレンダリング書き出し
- JSON形式でプロジェクト保存・読み込み
- Cloudflare Pages / GitHub Pagesでそのままホスト可能

## Presets

現在のプリセット例:

- 王道
- 小室
- 丸サ
- コンファメ
- 枯葉
- カノン
- 王道JPOP
- 逆循環
- Just Two
- Neo Soul
- Andalusian
- Blues
- 暗め
- 浮遊
- Lo-fi
- EDM

Cloudflare Pagesでは `_worker.js` により、既存の単一HTMLを保ったままプリセットと `m7b5` コードを上書き追加します。

## Usage

`index.html` をブラウザで開くだけで動作します。

Cloudflare Pagesで公開する場合は、以下の設定でデプロイできます。

| Setting | Value |
| --- | --- |
| Framework preset | None / No framework |
| Build command | `exit 0` |
| Build output directory | `/` または `.` |
| Production branch | `main` |

## Notes

このアプリは外部ライブラリなしで動作します。MIDI生成、WAV生成、再生処理はすべてブラウザ内で完結します。

ピアノ音源はサンプルファイルではなく、複数倍音・短いアタック・指数減衰・軽いディチューンで作った軽量なブラウザシンセです。そのため、Cloudflare Pagesなどの静的ホスティングでも追加アセットなしで動作します。
