# MCP認可デモ

このプロジェクトは、MCP認可のデモを行うためのサンプルプロジェクトです。
OAuth 2.0 / 2.1 に基づく認可フローを利用し、MCP クライアントが MCP サーバー（リソースサーバー）上の保護されたリソースに安全にアクセスする仕組みを実証します。
Authlete をバックエンドに利用した認可サーバーと連携し、詳細な認可制御（Rich Authorization Requests）や動的クライアント登録（Dynamic Client Registration）の動作を確認できます。

## 目次

- [1. システム構成](#1-システム構成)
- [2. ローカル環境構築](#2-ローカル環境構築)
- [3. 各エンドポイントの動作確認](#3-各エンドポイントの動作確認)
  - [3.1 ローカルサーバーの起動](#31-ローカルサーバーの起動)
  - [3.2 確認手順](#32-確認手順)
- [4. MCP 認可フロー](#4-mcp-認可フロー)
- [5. 認可サーバーの主要なエンドポイント](#5-認可サーバーの主要なエンドポイント)
  - [5.1 認可サーバーメタデータエンドポイント](#51-認可サーバーメタデータエンドポイント)
    - [パスコンポーネントが必要な場合](#パスコンポーネントが必要な場合)
    - [パスコンポーネントが不要な場合](#パスコンポーネントが不要な場合)
  - [5.2 動的クライアント登録エンドポイント](#52-動的クライアント登録エンドポイント)
  - [5.3 認可エンドポイント](#53-認可エンドポイント)
  - [5.4 トークンエンドポイント](#54-トークンエンドポイント)
  - [5.5 イントロスペクションエンドポイント](#55-イントロスペクションエンドポイント)
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

> [!IMPORTANT]
> 環境構築の詳細手順は [こちら](./docs/local-setup.md) を参照して下さい。

## 3. 各エンドポイントの動作確認

### 3.1 ローカルサーバーの起動

```bash
sh ./scripts/launch-local-server.sh
```

### 3.2 確認手順

1. MCP Inspectorの画面で「Open Auth Settings」をクリック。
   ![3.2-1](./docs/images/readme/mcp-inspector-oauth1.png)
2. Auth Settings画面上部の「Quick OAuth Flow」をクリック
   ![3.2-2](./docs/images/readme/mcp-inspector-oauth2.png)
3. 認可画面が表示されたら認証情報を入力
4. MCP Inspectorの画面に戻ってきたら画面下部から各エンドポイントの実行結果が確認できます。
   ![3.2-3](./docs/images/readme/mcp-inspector-oauth3.png)

> [!TIP]
> Auth Settings画面の下部にある「Continue」ボタンをクリックすることでフローをステップバイステップで実行できます。
> ![5.2-4](./docs/images/readme/mcp-inspector-oauth4.png)

5. 「Authentication Complete」のアコーディオンを開いてアクセストークンを取得
   ![3.2-5](./docs/images/readme/mcp-inspector-oauth5.png)
6. 以下のコマンドを実行してIntrospectionエンドポイントにリクエスト
    ```bash
    curl -X POST https://<au3te-ts-hono_domain>/api/introspect \
        -u "mcp-server:mcp-server-secret" \
        -d "token=<access_token>"
    
    #  {"active":true,"scope": ...
    ```

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

### 5.1 認可サーバーメタデータエンドポイント

認可サーバーの設定情報（メタデータ）をJSON形式で公開するエンドポイントです。
[RFC8414](https://datatracker.ietf.org/doc/html/rfc8414)（OAuth 2.0 Authorization Server Metadata）および、[OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)で仕様が定義されています。
メタデータは`/.well-known/oauth-authorization-server` や `/.well-known/openid-configuration` というWell-Known URIを利用して公開されます。

MCPクライアントは、以下の順にリクエストを行いメタデータが取得できるか試みます。

#### パスコンポーネントが必要な場合

1. OAuth 2.0 Authorization Server Metadata with path insertion: `https://example.com/.well-known/oauth-authorization-server/**path**`
2. OpenID Connect Discovery 1.0 with path insertion: `https://example.com/.well-known/openid-configuration/**path**`
3. OpenID Connect Discovery 1.0 with path appending: `https://example.com/**path**/.well-known/openid-configuration`

#### パスコンポーネントが不要な場合

1. OAuth 2.0 Authorization Server Metadata: `https://example.com/.well-known/oauth-authorization-server`
2. OpenID Connect Discovery 1.0: `https://example.com/.well-known/openid-configuration`

### 5.2 動的クライアント登録エンドポイント

OAuth クライアント（アプリケーション）が、自身のメタデータ（リダイレクト URI、アプリ名、ロゴの URL など）を送信し、動的にクライアント登録を行うためのエンドポイントです。[RFC7591](https://datatracker.ietf.org/doc/html/rfc7591)で定義されています。
成功すると、認可サーバーから一意のクライアント ID（および必要に応じてクライアントシークレット）や登録メタデータが返却されます。

多くの場合、MCPクライアントは事前にMCPサーバーの認可サーバーについての情報を持っておらず、また手動での登録作業はユーザーにとって抵抗があります。
動的クライアント登録の仕組みを利用することでMCPクライアントは新たなMCPサーバーおよびその認可サーバーとシームレスに接続することが可能になります。

### 5.3 認可エンドポイント

リソースオーナー（エンドユーザー）が認証を行い、クライアントへのアクセス権限の付与（認可）を承認するためのエンドポイントです。OAuth2.1仕様（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で定義されています。
本プロジェクトでは、標準的なスコープに加え、**Rich Authorization Requests (RAR)** を利用して構造化された詳細な権限（例：「チケット予約」の「金額上限」など）を `authorization_details` パラメータで要求します。また、`resource` パラメータで使用する MCP サーバーを特定する必要があります。

### 5.4 トークンエンドポイント

クライアントがアクセストークンを取得するために使用するエンドポイントです。OAuth2.1仕様（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で定義されています。
認可エンドポイントで取得した「認可コード」をこのエンドポイントに送信し、引き換えに「アクセストークン」（および ID トークン、リフレッシュトークン）を受け取ります。また、リクエスト時には`resource` パラメータで使用する MCP サーバーを特定する必要があります。（`resource`パラメータの値は認可エンドポイントにリクエストする際と同じです。）

### 5.5 イントロスペクションエンドポイント

リソースサーバー（MCP サーバー）が、提示されたアクセストークンの有効性やメタデータを確認するために使用するエンドポイントです。[RFC7662](https://datatracker.ietf.org/doc/html/rfc7662)で定義されています。
MCP サーバーはMCPクライアントから受け取ったアクセストークンが有効なものであるかを検証する必要があります。
アクセストークンにはリファレンストークンと自己エンコードトークンの２種類があり、リファレンストークンの場合はトークン自体に有効性を確認する機能が存在せず、本エンドポイントを利用することでトークンの有効性を検証することができます。

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
