# ローカル環境構築手順

本プロジェクトをローカル環境で実行するためのセットアップ手順です。

## 目次

- [1. 事前準備](#1-事前準備)
  - [mkcertのインストール](#mkcertのインストール)
    - [Homebrewを使用したインストール](#homebrewを使用したインストール)
    - [ルート CA のセットアップ](#ルート-ca-のセットアップ)
    - [ルート証明書のパスを確認](#ルート証明書のパスを確認)
- [2. プロジェクトのセットアップ](#2-プロジェクトのセットアップ)
  - [リポジトリのクローン](#リポジトリのクローン)
  - [依存パッケージのインストール](#依存パッケージのインストール)
  - [SSL証明書の生成](#ssl証明書の生成)
- [3. ローカルサーバーの起動](#3-ローカルサーバーの起動)

## 1. 事前準備

### mkcertのインストール

#### Homebrewを使用したインストール

```bash
brew install mkcert
brew install nss # Required if using Firefox
```

#### ルート CA のセットアップ

```bash
mkcert -install
```

#### ルート証明書のパスを確認

```bash
mkcert -CAROOT
```

## 2. プロジェクトのセットアップ

### リポジトリのクローン

```bash
git clone https://github.com/ryohei-ebisawa/authlete-study-session-2025-08.git
cd authlete-study-session-2025-08
```

### 依存パッケージのインストール

```bash
npm install
```

### SSL証明書の生成

ローカルHTTPS通信を有効にするため、`mkcert` を使用して証明書を発行します。

```bash
sh ./scripts/ssl-setup.sh
```

## 3. ローカルサーバーの起動

以下のスクリプトを実行して、アプリケーションを起動します。

```bash
sh ./scripts/launch-local-server.sh
```
