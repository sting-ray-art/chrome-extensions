# script

個人向けの Chrome 拡張機能をまとめたリポジトリです。
いずれも Chrome ウェブストアには公開しておらず、フォルダを手動で読み込んで使います。

---

## 収録しているツール

| フォルダ | 名前 | 対象サイト | 概要 |
|----------|------|------------|------|
| [`iachara-status-sum-extension/`](iachara-status-sum-extension/) | いあきゃら ステータス合計 | [いあきゃら](https://iachara.com) | キャラクターシートの能力値 8 種を読み取り、合計を右下に表示 |
| [`otanjoubi-birth-extractor-ext/`](otanjoubi-birth-extractor-ext/) | お誕生日.jp 誕生〇 抽出コピー | [お誕生日.jp](https://otanjoubi.jp) | 誕生花・石・色などをプレーンテキストに整形してコピー |
| [`daycode-whitelist-extension/`](daycode-whitelist-extension/) | デイコード 参加者フィルター | [デイコード](https://character-sheets.appspot.com/schedule) | 日程状況一覧で選択した参加者の列だけを表示（検索・50音順対応） |

各ツールの使い方・トラブルシューティングは、フォルダ内の README を参照してください。

- [いあきゃら ステータス合計](iachara-status-sum-extension/README.md)
- [お誕生日.jp 誕生〇 抽出コピー](otanjoubi-birth-extractor-ext/README.md)
- [デイコード 参加者フィルター](daycode-whitelist-extension/README.md)

---

## 事前に用意するもの

| 項目 | 内容 |
|------|------|
| ブラウザ | **Google Chrome**（推奨）または Chromium 系ブラウザ |
| 拡張機能のファイル | 使いたいツールのフォルダ一式（上記の表を参照） |
| 対象サイト | 各ツールが対応する Web サイトのアカウント（必要な場合） |

> **補足:** これらの拡張機能は Chrome ウェブストアには公開されていません。配布されたフォルダを、下記の手順で手動インストールします。

---

## インストール手順

### 1. 拡張機能のフォルダを用意する

`Code(緑のボタン)->Download ZIP`からリポジトリをダウンロードし、使いたい拡張機能のフォルダをわかりやすい場所に置いてください。

```
script/
├── iachara-status-sum-extension/   ← いあきゃら用
├── otanjoubi-birth-extractor-ext/  ← お誕生日.jp 用
└── daycode-whitelist-extension/    ← デイコード用
```

例:
- Windows: `C:\Users\（あなたの名前）\Downloads\script\iachara-status-sum-extension`
- Mac: `/Users/（あなたの名前）/Downloads/script/iachara-status-sum-extension`

### 2. Chrome の拡張機能ページを開く

1. Google Chrome を起動します
2. アドレスバー（画面上部の URL を入力する欄）に、次の文字を入力して Enter キーを押します

```
chrome://extensions
```

### 3. デベロッパーモードをオンにする

1. 拡張機能ページの右上にある **「デベロッパーモード」** のスイッチを **オン** にします
2. スイッチが青くなれば OK です

> 「デベロッパー」という名前ですが、プログラミングの知識は不要です。このスイッチをオンにすると、手動で拡張機能を追加できるようになります。

### 4. 拡張機能を読み込む

1. 左上付近に表示される **「パッケージ化されていない拡張機能を読み込む」** ボタンをクリックします
2. ファイル選択画面が開いたら、使いたい拡張機能のフォルダを選択します。このフォルダはmanifest.jsonが存在するフォルダを選択してください。（e.g. `chrome-extensions/otanjoubi-birth-extractor-ext`）
3. **「選択」**（Mac では「開く」）をクリックします

### 5. インストール完了の確認

拡張機能の一覧に、読み込んだツール名が表示されていれば成功です。複数のツールを使う場合は、フォルダごとに手順 4 を繰り返してください。

---

## アンインストール（削除）

1. Chrome で `chrome://extensions` を開く
2. 削除したい拡張機能を探す
3. **「削除」** をクリックする

---

## よくある質問

**Q. スマートフォンでも使えますか？**
A. いいえ。PC 版の Google Chrome 専用です。

**Q. データは外部に送信されますか？**
A. いいえ。いずれの拡張機能も、ページ上の情報をブラウザ内で処理するだけで、外部サーバーへ送信しません。

---

## 更新版を入れるとき

1. 新しいフォルダを受け取る（またはリポジトリを更新する）
2. `chrome://extensions` からリロードボタンを押下する

---

## 開発者向けメモ

- いずれも Manifest V3 の Chrome 拡張機能です
- ビルドやパッケージングは不要で、フォルダをそのまま読み込めます
- 各拡張機能の実装詳細は、対応フォルダ内のソースと README を参照してください
