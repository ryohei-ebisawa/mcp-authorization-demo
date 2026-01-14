# MCP認可デモ

このプロジェクトは、MCP認可のデモを行うためのサンプルプロジェクトです。  

## 目次

- [目次](#目次)
- [1. プロジェクト概要](#1-プロジェクト概要)
- [2. ローカル環境構築](#2-ローカル環境構築)
- [3. MCP 認可フロー](#3-mcp-認可フロー)
- [4. 認可サーバーの主要なエンドポイント](#4-認可サーバーの主要なエンドポイント)
  - [4.1 認可サーバーメタデータエンドポイント](#41-認可サーバーメタデータエンドポイント)
  - [4.2 動的クライアント登録エンドポイント](#42-動的クライアント登録エンドポイント)
  - [4.3 認可エンドポイント](#43-認可エンドポイント)
  - [4.4 トークンエンドポイント](#44-トークンエンドポイント)
  - [4.5 イントロスペクションエンドポイント](#45-イントロスペクションエンドポイント)
- [Credits / Acknowledgments](#credits--acknowledgments)

## 1. プロジェクト概要

- チケット販売Webアプリケーション - Express.js + Passport.js
- MCP サーバー - OAuth 保護されたチケット操作API
- OAuth 2.1 認可サーバー - [au3te-ts-hono](https://github.com/dentsusoken/au3te-ts-hono)を利用（本プロジェクトには含まれていません。別途構築してください。）

## 2. ローカル環境構築

[こちら](./docs/local-setup.md)を参照して下さい。

## 3. MCP 認可フロー

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

## 4. 認可サーバーの主要なエンドポイント

### 4.1 認可サーバーメタデータエンドポイント

認可サーバーの設定情報を JSON 形式で公開するエンドポイントです。通常 `/.well-known/oauth-authorization-server` や `/.well-known/openid-configuration` というパスで提供されます。
クライアントはこの情報を取得することで、認可サーバーがサポートしている機能（スコープ、グラントタイプ、署名アルゴリズムなど）や、他の各エンドポイントの URL を動的に知ることができます。

### 4.2 動的クライアント登録エンドポイント

OAuth クライアント（アプリケーション）が、自身のメタデータ（リダイレクト URI、アプリ名、ロゴの URL など）を送信し、動的にクライアント登録を行うためのエンドポイントです。
成功すると、認可サーバーから一意のクライアント ID（および必要に応じてクライアントシークレット）や登録メタデータが返却されます。

### 4.3 認可エンドポイント

リソースオーナー（エンドユーザー）が認証を行い、クライアントへのアクセス権限の付与（認可）を承認するためのエンドポイントです。
本プロジェクトでは、標準的なスコープに加え、**Rich Authorization Requests (RAR)** を利用して構造化された詳細な権限（例：「チケット予約」の「金額上限」など）を `authorization_details` パラメータで要求します。また、`resource` パラメータで使用する MCP サーバーを特定します。

### 4.4 トークンエンドポイント

クライアントがアクセストークンを取得するために使用するエンドポイントです。サーバー間通信（バックチャネル）で利用されます。
認可コードフローでは、認可エンドポイントで取得した「認可コード」をこのエンドポイントに送信し、引き換えに「アクセストークン」（および ID トークン、リフレッシュトークン）を受け取ります。

### 4.5 イントロスペクションエンドポイント

リソースサーバー（MCP サーバー）が、提示されたアクセストークンの有効性やメタデータを確認するために使用するエンドポイントです。
MCP サーバーはこのエンドポイントからの応答に含まれる `authorization_details` を確認し、MCP ツールの実行が許可されているか、またユーザーが設定した制約（例：購入枚数制限）内であるかを判断して、ツールの実行制御を行います。

## Credits / Acknowledgments

このプロジェクトは、以下のリポジトリをフォークして作成しました。

- **Original Repository**: [authlete-study-session-2025-08](https://github.com/watahani/authlete-study-session-2025-08)
- **Author**: [watahani](https://github.com/watahani)
