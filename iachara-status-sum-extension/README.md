# いあきゃら ステータス合計（Chrome拡張）

`iachara.com` のキャラクターシート画面で、STR/DEX/…/HP/SAN などのステータス値を拾って合計を右下に表示します。

## 使い方（ローカルで読み込み）

1. Chromeで `chrome://extensions` を開く
2. 右上の **デベロッパーモード** をON
3. **パッケージ化されていない拡張機能を読み込む** → このフォルダ（`iachara-status-sum-extension`）を選択
4. `https://iachara.com` のキャラシート（閲覧/編集）を開く

## 仕様

- 対象ラベル: `STR, DEX, CON, POW, APP, SIZ, INT, EDU, HP, MP, SAN, 幸運, アイデア, 知識`
- DOMの「ラベル文字」から近傍の `input` / 数値テキストを探して値として採用します。
- 画面がReactで再描画されても追従するため、DOM変更を監視して自動更新します。

