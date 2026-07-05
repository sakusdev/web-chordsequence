# Chord Sequence Studio

ブラウザ上でコードを選び、コードシーケンスを作成し、プレビュー再生・MIDI/WAV書き出しができる静的Webアプリです。

## Features

- Root / Quality / Octave / 長さを指定してコードを追加
- 王道進行、小室進行、ii-V-I系などのプリセット
- Web Audio APIによるコードプレビュー
- シーケンス全体の再生
- MIDIファイルの書き出し
- WAVファイルのオフラインレンダリング書き出し
- JSON形式でプロジェクト保存・読み込み
- GitHub Pagesでそのままホスト可能

## Usage

`index.html` をブラウザで開くだけで動作します。

GitHub Pagesで公開する場合は、Repository Settings → Pages から `main` ブランチの root を公開してください。

## Notes

このアプリは外部ライブラリなしで動作します。MIDI生成、WAV生成、再生処理はすべてブラウザ内で完結します。
