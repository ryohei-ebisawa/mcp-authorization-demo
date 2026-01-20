# MCP認可デモ

このプロジェクトは、MCP認可のデモを行うためのサンプルプロジェクトです。
OAuth 2.0 / 2.1 に基づく認可フローを利用し、MCP クライアントが MCP サーバー（リソースサーバー）上の保護されたリソースに安全にアクセスする仕組みを実証します。
Authlete をバックエンドに利用した認可サーバーと連携し、詳細な認可制御（Rich Authorization Requests）や動的クライアント登録（Dynamic Client Registration）の動作を確認できます。

## 目次

- [1. システム構成](#1-システム構成)
- [2. ローカル環境構築](#2-ローカル環境構築)
  - [2.1. リポジトリのクローン](#21-リポジトリのクローン)
  - [2.2. 依存パッケージのインストール](#22-依存パッケージのインストール)
- [3. MCP 認可フローの動作確認](#3-mcp-認可フローの動作確認)
  - [3.1. ローカルサーバーの起動](#31-ローカルサーバーの起動)
  - [3.2. curlコマンドを使用した動作確認手順](#32-curlコマンドを使用した動作確認手順)
    - [3.2.1. 最初のアクセス（Authorizationヘッダーなし）](#321-最初のアクセスauthorizationヘッダーなし)
    - [3.2.2. リソースサーバー（MCPサーバー）のメタデータを取得する](#322-リソースサーバーmcpサーバーのメタデータを取得する)
    - [3.2.3. 認可サーバーのメタデータを取得する](#323-認可サーバーのメタデータを取得する)
    - [3.2.4. クライアントを登録する（動的クライアント登録）](#324-クライアントを登録する動的クライアント登録)
    - [3.2.5. 認可リクエストを実行する（ブラウザでの承認）](#325-認可リクエストを実行するブラウザでの承認)
    - [3.2.6. トークンリクエストを実行する](#326-トークンリクエストを実行する)
    - [3.2.7. トークンを使ってMCPサーバーにリクエストする](#327-トークンを使ってmcpサーバーにリクエストする)
  - [3.3. MCP Inspectorを使用した動作確認手順](#33-mcp-inspectorを使用した動作確認手順)
    - [3.3.1. MCP Inspectorにアクセスする](#331-mcp-inspectorにアクセスする)
    - [3.3.2. MCP Inspectorの準備](#332-mcp-inspectorの準備)
    - [3.3.3. 認可設定画面を開く](#333-認可設定画面を開く)
    - [3.3.4. 認可フローを実行する](#334-認可フローを実行する)
    - [3.3.5. MCPサーバーに接続する](#335-mcpサーバーに接続する)
- [4. MCP 認可フロー](#4-mcp-認可フロー)
- [5. 認可サーバーの主要なエンドポイント](#5-認可サーバーの主要なエンドポイント)
  - [5.1. 認可サーバーメタデータエンドポイント](#51-認可サーバーメタデータエンドポイント)
    - [パスコンポーネントが必要な場合](#パスコンポーネントが必要な場合)
    - [パスコンポーネントが不要な場合](#パスコンポーネントが不要な場合)
  - [5.2. 動的クライアント登録エンドポイント](#52-動的クライアント登録エンドポイント)
  - [5.3. 認可エンドポイント](#53-認可エンドポイント)
  - [5.4. トークンエンドポイント](#54-トークンエンドポイント)
  - [5.5. イントロスペクションエンドポイント](#55-イントロスペクションエンドポイント)
- [6. Authleteコンソール上での各エンドポイントの設定例](#6-authleteコンソール上での各エンドポイントの設定例)
  - [6.1. 動的クライアント登録エンドポイント](#61-動的クライアント登録エンドポイント)
  - [6.2. 認可エンドポイント](#62-認可エンドポイント)
  - [6.3. トークンエンドポイント](#63-トークンエンドポイント)
  - [6.4. イントロスペクションエンドポイント](#64-イントロスペクションエンドポイント)
- [Credits / Acknowledgments](#credits--acknowledgments)

## 1. システム構成

- チケット販売Webアプリケーション - Express.js + Passport.js
- MCP サーバー - OAuth 保護されたチケット操作API
- OAuth 2.1 認可サーバー - [au3te-ts-hono](https://github.com/dentsusoken/au3te-ts-hono)を利用（本プロジェクトには含まれていません。別途構築してください。）

## 2. ローカル環境構築

### 2.1. リポジトリのクローン

```bash
git clone https://github.com/ryohei-ebisawa/mcp-authorization-demo.git
cd mcp-authorization-demo
```

### 2.2. 依存パッケージのインストール

```bash
npm install
```

> [!NOTE]
> デモのためTLS通信を使用するためのセットアップは実施しません。

## 3. MCP 認可フローの動作確認

### 3.1. ローカルサーバーの起動

```bash
sh ./scripts/launch-local-server.sh
```

### 3.2. curlコマンドを使用した動作確認手順

ここでは、ターミナルで `curl` コマンドを使い、実際にサーバーと通信しながら認可の流れを体験します。
「MCPクライアント」が、まだ権限を持っていない状態からスタートし、最終的に「アクセストークン」を手に入れて「MCPサーバー」の機能を使えるようになるまでのステップを順に追っていきます。

この手順では、`curl`コマンドおよび`openssl`コマンドを使用します。  
それぞれのコマンドがインストールされていない場合は、インストールしてください。  
以下のコマンドでインストール済みかを確認できます。(インストール済みの場合は各コマンドのバージョンが表示されます。)

```bash
curl -V
# curl 8.7.1

openssl -v
# OpenSSL 3.5.0
```

#### 3.2.1. 最初のアクセス（Authorizationヘッダーなし）

まずは、**何の権限（アクセストークン）も持たずに** MCPサーバーにアクセスしてみます。
MCPサーバーが保護されている（誰でもアクセス可能なものではない）場合、サーバーは「誰ですか？権限がありません」と拒否します（HTTP 401 Unauthorized）。

しかし、この拒否レスポンスには重要なヒントが含まれています。
「アクセスするにはトークンが必要です。トークンを発行するための情報はここにありますよ」という案内（`WWW-Authenticate` ヘッダー）が返ってくるのです。

**実行するコマンド:**

```bash
# リクエスト
curl -iX POST http://localhost:3443/mcp \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'
```

**結果の確認:**

レスポンスヘッダーの `WWW-Authenticate` の部分に注目してください。

```bash
# レスポンス（抜粋）
HTTP/1.1 401 Unauthorized
...
WWW-Authenticate: Bearer realm="http://localhost:3443", ..., resource_metadata="http://localhost:3443/.well-known/oauth-protected-resource/mcp", ...
...
```

ここにある `resource_metadata` のURLが、次のステップへの案内です。

#### 3.2.2. リソースサーバー（MCPサーバー）のメタデータを取得する

前のステップで確認した `resource_metadata` のURLにアクセスして、**このサーバーの詳細情報（メタデータ）** を取得します。
ここには、「このMCPサーバーを使うためのアクセストークンは、どの認可サーバーで発行できるか」という情報が書かれています。

**実行するコマンド:**

```bash
# リクエスト
curl -i http://localhost:3443/.well-known/oauth-protected-resource/mcp
```

**結果の確認:**

レスポンス（JSON）の中に `authorization_servers` という項目があります。  

```json
{
  "resource": "http://localhost:3443/mcp",
  "authorization_servers": ["https://vc-issuer.g-trustedweb.workers.dev"],
  ...
}
```

このURL（`https://vc-issuer.g-trustedweb.workers.dev`）が、今回利用すべき**認可サーバー**です。

> [!NOTE]
> 今回のデモでは認可サーバーが一つだけですが、実際には認可サーバーは複数の存在する可能性があります。
> その場合、MCPクライアントはその中から使用する認可サーバーを選択します。

#### 3.2.3. 認可サーバーのメタデータを取得する

認可サーバーがわかったので、次はその**具体的なエンドポイント**を調べます。
認可サーバーのURLの後ろに `/.well-known/oauth-authorization-server` を付けたURLにアクセスすると、設定情報が取得できます。

**実行するコマンド:**

```bash
# リクエスト
curl -i https://vc-issuer.g-trustedweb.workers.dev/.well-known/oauth-authorization-server
```

**結果の確認:**

レスポンス（JSON）から、以下の3つのURLを確認します。これらが後の手順で使うエンドポイントです。

- `registration_endpoint`: アプリを登録するエンドポイント (`.../connect/register`)
- `authorization_endpoint`: ユーザーが承認を行う画面のURL (`.../api/authorization`)
- `token_endpoint`: 認可コードをトークンに交換するエンドポイント (`.../api/token`)

```json
{
  "issuer": "https://vc-issuer.g-trustedweb.workers.dev",
  "authorization_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/api/authorization",
  "token_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/api/token",
  "registration_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/connect/register",
  ...
}
```

#### 3.2.4. クライアントを登録する（動的クライアント登録）

認可サーバーを利用するには、まず「私はこういうアプリです」と名乗って登録する必要があります。
通常は事前に手動登録することもありますが、今回は**その場で自動的に登録する仕組み（動的クライアント登録）** を利用します。

認可サーバーの登録エンドポイントに対して登録リクエストを送ります。

**実行するコマンド:**

```bash
# リクエスト
curl -iX POST https://vc-issuer.g-trustedweb.workers.dev/connect/register \
    -H "Content-Type: application/json" \
    -d '{
            "redirect_uris": ["http://localhost:6274/oauth/callback/debug"],
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "client_name": "MCP Inspector",
            "client_uri": "https://github.com/modelcontextprotocol/inspector",
            "scope": "mcp:tickets:read mcp:tickets:write"
        }'
```

**結果の確認と変数の設定:**

レスポンスに含まれる `client_id` は**次のステップで必ず必要になる**重要なIDです。

```json
{
  ...
  "client_id": "1687054126",
  ...
}
```

この `client_id`の値 （例：`1687054126`）をコピーして、変数 `CLIENT_ID` に設定します。

```bash
# 【入力】レスポンスの client_id の値をセットします
CLIENT_ID="YOUR_CLIENT_ID"
```

#### 3.2.5. 認可リクエストを実行する（ブラウザでの承認）

ここからはコマンドではなく、**Webブラウザ**を使います。
ユーザーがログインし、「このアプリに権限を与えてもよい」と承認するプロセスです。

以下の**URLを生成するコマンド**を実行し、表示されたURLをコピーしてください。

**URLを生成するコマンド:**

```bash
# Code Verifier (ランダム文字列) の生成
CODE_VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')

# Code Challenge (Verifierのハッシュ値) の生成
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=')

# 認可リクエスト用URLを表示します
echo "https://vc-issuer.g-trustedweb.workers.dev/api/authorization?response_type=code&client_id=$CLIENT_ID&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Foauth%2Fcallback%2Fdebug&state=random_state_value&scope=mcp%3Atickets%3Aread+mcp%3Atickets%3Awrite&resource=http%3A%2F%2Flocalhost%3A3443%2Fmcp"
```

**ブラウザでの操作:**

1. 上記コマンドで表示された `https://...` から始まるURLをコピーし、ブラウザでアクセスします。
2. 同意画面が表示されたら、以下の認証情報を入力して`Authorize`（承認）ボタンをクリックします。
   - **ID**: `inga`
   - **PW**: `inga`

**結果の確認と変数の設定:**

承認が終わると、画面が切り替わるか、指定したURL（localhost）にリダイレクトされます。
その際、ブラウザのアドレスバー（または画面表示）にある `code=` の後ろの文字列が重要です。これが**認可コード**です。

```bash
http://localhost:6274/oauth/callback/debug?state=...&code=MggNs47bcav...&iss=...
```

この `code` の値（`&`の前まで）をコピーして、変数 `CODE` に設定します。

```bash
# 【入力】ブラウザで取得した認可コードをセットします
CODE="YOUR_CODE"
```

#### 3.2.6. トークンリクエストを実行する

手に入れた「認可コード」を使って、ついに**アクセストークン**を受け取ります。
これまで設定してきた変数 `$CODE`、`$CLIENT_ID` を使うので、コマンドの書き換えは不要です。

**実行するコマンド:**

```bash
# リクエスト
curl -iX POST https://vc-issuer.g-trustedweb.workers.dev/api/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=$CODE&code_verifier=$CODE_VERIFIER&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Foauth%2Fcallback%2Fdebug&resource=http%3A%2F%2Flocalhost%3A3443%2Fmcp&client_id=$CLIENT_ID"
```

**結果の確認と変数の設定:**

成功すると、レスポンス（JSON）に `access_token` が含まれています。これが**目的のアクセストークン**です。

```json
{
  "access_token": "IU7JGeoJxJSGfAY7nT9A-kK4GAGQgenvHtaRbaUcwoU",
  "token_type": "Bearer",
  ...
}
```

このトークン（例：`IU7JGeo...`）をコピーして、変数 `ACCESS_TOKEN` に設定します。

```bash
# 【入力】レスポンスの access_token の値をセットします
ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
```

#### 3.2.7. トークンを使ってMCPサーバーにリクエストする

最後に、手に入れた「アクセストークン」を使って、最初に拒否されたリクエストにもう一度挑戦します。
変数 `$ACCESS_TOKEN` をヘッダーに埋め込んで送信します。

**実行するコマンド:**

```bash
# リクエスト
curl -iX POST http://localhost:3443/mcp \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'
```

**結果の確認:**

今度は `401 Unauthorized` ではなく、`202 Accepted`（または `200 OK`）が返ってくるはずです。
これで、認可された状態で安全にMCPサーバーへアクセスできることが確認できました。

### 3.3. MCP Inspectorを使用した動作確認手順

ここでは、`curl`コマンドではなく、開発者向けのGUIツールである **MCP Inspector** を使用して、視覚的に認可フローを確認します。
MCP Inspector は、ブラウザ上で動作するMCPクライアントとして振る舞い、認可フロー（OAuth 2.1）を実行してアクセストークンを取得し、MCPサーバーに接続する一連の流れを自動的に行ってくれます。

#### 3.3.1. MCP Inspectorにアクセスする

[セクション 3.1.](#31-ローカルサーバーの起動)でローカルサーバーを起動した際に、ターミナルに以下のようなURLが表示されます。
このURLをコピーしてブラウザで開いてください。（`MCP_PROXY_AUTH_TOKEN=`以降の値は起動ごとに変わります）

```bash
[INSPECT]    http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=xxxxxxxx...
```

#### 3.3.2. MCP Inspectorの準備

MCP Inspectorが開いたら、画面左側の設定パネルを確認します。

1.  **Transport Type**: `Streamable HTTP` を選択してください。
2.  **URL**: `http://localhost:3443/mcp` になっていることを確認してください。

![mcp-inspector1](./docs/images/readme/mcp-inspector-oauth1.png)

#### 3.3.3. 認可設定画面を開く

画面右側のメインエリアにある `Open OAuth Settings` ボタンをクリックします。

![mcp-inspector3](./docs/images/readme/mcp-inspector-oauth3.png)

#### 3.3.4. 認可フローを実行する

設定画面（Authentication Settings）の上部中央にある`Quick OAuth Flow` ボタンをクリックすると、認可フローが開始されます。

![mcp-inspector4](./docs/images/readme/mcp-inspector-oauth4.png)

自動的に認可サーバーの同意画面に遷移します。
以下のデモ用アカウントでログインし、承認を行ってください。

- **ID**: `inga`
- **PW**: `inga`

承認が完了するとポップアップが閉じ、元の画面に戻ります。
画面下部の `OAuth Flow Progress` セクションで、各ステップ（メタデータ取得、クライアント登録、認可リクエスト、トークン取得）が成功したことを確認できます。

![mcp-inspector5](./docs/images/readme/mcp-inspector-oauth5.png)

#### 3.3.5. MCPサーバーに接続する

認可フローが完了しアクセストークンが取得できたら、MCPサーバーに接続します。
画面左側の `Connect` ボタンをクリックしてください。

発行されたアクセストークンを使ってMCPサーバーへの接続が行われます。
`Connect`ボタンの下のエリアに表示されているステータスが`Connected`になっていれば成功です。

![mcp-inspector8](./docs/images/readme/mcp-inspector-oauth8.png)

画面右側のメインエリアにある `List Tools` ボタンをクリックすると使用可能なツールの一覧が表示され、
任意のツールを選択して実行することができます。

## 4. MCP 認可フロー

```mermaid
---
config:
  theme: default
---
sequenceDiagram
    participant U as User
    participant C as MCP Client
    participant AS as Authorization Server (AS)
    participant MS as MCP Server (= Resource Server)<br/>(MCP API + Protected Resources)

    %% Initial MCP Server Access (Authentication Challenge)
    rect rgb(255, 240, 240)
        Note over C,MS: Initial MCP Server Access (Authentication Challenge)
        C->>MS: POST /mcp (MCP Protocol)<br/>(without Authorization header)
        MS-->>C: 401 Unauthorized<br>WWW-Authenticate: Bearer realm="baseUrl",<br>error="invalid_request",<br>error_description="Access token is required",<br>resource_metadata="baseUrl/.well-known/oauth-protected-resource/mcp"
    end

    %% MCP Protected Resource Metadata
    rect rgb(240, 255, 240)
        Note over C,MS: MCP Protected Resource Metadata Discovery
        C->>MS: GET /.well-known/oauth-protected-resource/mcp
        MS-->>C: 200 {authorization_servers: [baseUrl], resource: "baseUrl/mcp",<br/>scopes_supported: ["mcp:tickets:read", "mcp:tickets:write"], ...}

    end

    %% Authorization Server Metadata Discovery
    rect rgb(240, 240, 255)
        Note over C,AS: Authorization Server Metadata Discovery
        C->>AS: GET /.well-known/oauth-authorization-server
        AS-->>C: 200 {authorization_endpoint, token_endpoint,<br/>registration_endpoint, introspection_endpoint,<br/>code_challenge_methods_supported: ["S256"], ...}
    end

    %% Dynamic Client Registration (if needed)
    rect rgb(255, 255, 240)
        Note over C,AS: Dynamic Client Registration (RFC 7591)
        C->>AS: POST /oauth/register {redirect_uris, grant_types, response_types,<br/>client_name, token_endpoint_auth_method, ...}
        AS-->>C: 201 {client_id, client_secret, registration_access_token, ...}
    end

    %% Authorization (PKCE, two-step with Authlete)
    rect rgb(250, 240, 255)
        Note over U,AS: OAuth 2.1 Authorization Code + PKCE Flow
        U->>C: Start sign-in / connect MCP
        C->>C: Generate code_verifier / code_challenge=S256(...)<br/>state, nonce
        C->>AS: GET /oauth/authorize?response_type=code&<br/>client_id, redirect_uri, scope=mcp:tickets:read&state, nonce,<br/>code_challenge, code_challenge_method=S256&<br/>resource=https://localhost:3443/mcp&<br/>authorization_details=[{type:"ticket-reservation"}]

        alt User not authenticated
            AS-->>C: 302 /auth/login?return_to=/oauth/authorize/consent
            C->>AS: Login credentials (Passport.js)
            AS-->>C: 302 /oauth/authorize/consent
        end

        AS->>U: Consent UI with authorization details options<br/>(standard vs custom limits)
        U-->>AS: POST /oauth/authorize/decision<br/>{authorized: true, authorizationDetailsJson}

        AS-->>C: 302 redirect_uri?code=...&state=...
    end

    %% Token Request
    rect rgb(240, 255, 255)
        Note over C,AS: Token Request
        C->>AS: POST /oauth/token<br/>grant_type=authorization_code, code,<br/>redirect_uri, code_verifier, client_id, client_secret
        AS-->>C: 200 {access_token, token_type: "Bearer",<br/>refresh_token?, expires_in, scope, ...}
    end

    %% Access MCP Resource
    rect rgb(255, 250, 240)
        Note over C,MS: MCP Protocol with OAuth Protection
        C->>MS: POST /mcp (MCP Protocol)<br/>Authorization: Bearer <access_token>

        Note over MS,AS: Token Validation
        MS->>AS: POST /api/introspect<br>Authorization: Basic abcdefg==<br>token=<access_token>
        AS-->>MS: 200 {"active", "scope", "token_type": "Bearer", <br>"exp", "sub", "aud", "iss", "auth_time"}
        MS->>MS: Verify accessTokenResources matches MCP endpoint<br/>Execute MCP tool with authorization details constraints<br/>(e.g., maxAmount limit for ticket reservations)
        MS-->>C: 200 MCP Protocol Response

        C->>U: Show results
    end
```

## 5. 認可サーバーの主要なエンドポイント

ここでは、MCP 認可フローで登場する認可サーバーの主要なエンドポイントについて解説します。

### 5.1. 認可サーバーメタデータエンドポイント

認可サーバーの設定情報（メタデータ）をJSON形式で公開するエンドポイントです。
クライアントは、まずこのエンドポイントにアクセスして、「どこに認可リクエストを送ればいいか」「どの署名アルゴリズムが使えるか」などの情報を取得します。

[RFC8414](https://datatracker.ietf.org/doc/html/rfc8414)（OAuth 2.0 Authorization Server Metadata）および、[OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)で仕様が定義されています。
メタデータは`/.well-known/oauth-authorization-server` や `/.well-known/openid-configuration` という決まったパスで公開されます。

MCPクライアントは、以下の順にリクエストを行い、最初に見つかったメタデータを使用します。

#### パスコンポーネントが必要な場合

（例：`https://example.com/tenant-a` のようなテナント別のURLの場合）

1. OAuth 2.0 Authorization Server Metadata: `https://example.com/.well-known/oauth-authorization-server/tenant-a`
2. OpenID Connect Discovery 1.0 (path insertion): `https://example.com/.well-known/openid-configuration/tenant-a`
3. OpenID Connect Discovery 1.0 (path appending): `https://example.com/tenant-a/.well-known/openid-configuration`

#### パスコンポーネントが不要な場合

1. OAuth 2.0 Authorization Server Metadata: `https://example.com/.well-known/oauth-authorization-server`
2. OpenID Connect Discovery 1.0: `https://example.com/.well-known/openid-configuration`

### 5.2. 動的クライアント登録エンドポイント

クライアント（アプリケーション）が、自分自身の情報を登録するためのエンドポイントです。
[RFC7591](https://datatracker.ietf.org/doc/html/rfc7591)で仕様が定義されています。

通常、OAuthクライアントを利用するには事前の登録が必要ですが、MCPのように「ユーザーが任意のサーバーに接続したい」という場面では、事前に全てのクライアントを登録しておくことは不可能です。
そこで、接続時に動的にクライアント登録を行うことで、シームレスな利用を実現します。成功すると、一意のクライアントIDが発行されます。

### 5.3. 認可エンドポイント

ユーザー（リソースオーナー）が、「このアプリに権限を与えてもよいか」を確認し、承認するためのエンドポイントです。
OAuth 2.1（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で仕様が定義されています。

MCPの文脈では、以下のパラメータが特に重要です。

- **`authorization_details`**: **Rich Authorization Requests (RAR)** と呼ばれる仕組みで、「チケット予約の金額上限は10,000円まで」のような、構造化された詳細な権限を要求するために使います。
- **`resource`**: どのMCPサーバー（リソースサーバー）にアクセスしたいかを指定します。

### 5.4. トークンエンドポイント

認可コードをアクセストークンと交換するためのエンドポイントです。
OAuth 2.1（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で仕様が定義されています。

クライアントは、認可エンドポイントで取得した「認可コード」と、PKCE用の「Code Verifier」などを送信し、アクセストークンを取得します。
また、ここでも `resource` パラメータを指定して、特定のMCPサーバー向けのトークンであることを明示する必要があります。

### 5.5. イントロスペクションエンドポイント

トークンの有効性や内容を検証するためのエンドポイントです。
[RFC7662](https://datatracker.ietf.org/doc/html/rfc7662)で仕様が定義されています。

これは主に**MCPサーバー（リソースサーバー）が使用します**。
MCPサーバーは、クライアントから送られてきたアクセストークンが本物かどうか、期限切れではないか、どのような権限（スコープ）を持っているかを、このエンドポイントに問い合わせて確認します。
これにより、トークン自体に情報を詰め込まない「リファレンストークン」形式でも安全に検証が可能になります。

## 6. Authleteコンソール上での各エンドポイントの設定例

### 6.1. 動的クライアント登録エンドポイント

![console-dcr](./docs/images/readme/console-dcr.png)

### 6.2. 認可エンドポイント

![console-authorization](./docs/images/readme/console-authorization.png)

### 6.3. トークンエンドポイント

![console-token](./docs/images/readme/console-token.png)

### 6.4. イントロスペクションエンドポイント

![console-introspection](./docs/images/readme/console-introspection.png)

## Credits / Acknowledgments

このプロジェクトは、以下のリポジトリをフォークして作成しました。

- **Original Repository**: [authlete-study-session-2025-08](https://github.com/watahani/authlete-study-session-2025-08)
- **Author**: [watahani](https://github.com/watahani)
