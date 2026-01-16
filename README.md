# MCP認可デモ

このプロジェクトは、MCP認可のデモを行うためのサンプルプロジェクトです。
OAuth 2.0 / 2.1 に基づく認可フローを利用し、MCP クライアントが MCP サーバー（リソースサーバー）上の保護されたリソースに安全にアクセスする仕組みを実証します。
Authlete をバックエンドに利用した認可サーバーと連携し、詳細な認可制御（Rich Authorization Requests）や動的クライアント登録（Dynamic Client Registration）の動作を確認できます。

## 目次

- [1. システム構成](#1-システム構成)
- [2. ローカル環境構築](#2-ローカル環境構築)
- [3. MCP 認可フローの動作確認](#3-mcp-認可フローの動作確認)
  - [3.1 ローカルサーバーの起動](#31-ローカルサーバーの起動)
  - [3.2 curlコマンドを使用した動作確認手順](#32-curlコマンドを使用した動作確認手順)
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

## 3. MCP 認可フローの動作確認

### 3.1 ローカルサーバーの起動

```bash
sh ./scripts/launch-local-server.sh
```

### 3.2 curlコマンドを使用した動作確認手順

1. Authorizationヘッダーを用いずにMCPサーバーにリクエストする。

```bash
# リクエスト
curl -iX POST http://localhost:3443/mcp \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'
```

```bash
# レスポンス
HTTP/1.1 401 Unauthorized
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Vary: Origin
Access-Control-Allow-Credentials: true
WWW-Authenticate: Bearer realm="http://localhost:3443", error="invalid_request", error_description="Access token is required", resource_metadata="http://localhost:3443/.well-known/oauth-protected-resource/mcp", scope="mcp:tickets:read"
Content-Type: application/json; charset=utf-8
Content-Length: 74
ETag: W/"4a-chtfV9P482M7qfx9ctf/dIuif+o"
Date: Fri, 16 Jan 2026 06:20:33 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"invalid_request","error_description":"Access token is required"}
```

2. `WWW-Authenticate`ヘッダーの`resource_metadata`に記載されているURLにリクエストする。

```bash
# リクエスト
curl -i http://localhost:3443/.well-known/oauth-protected-resource/mcp
```

```bash
# レスポンス
HTTP/1.1 200 OK
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=3600
Access-Control-Allow-Origin: *
Content-Length: 387
ETag: W/"183-l7a4e8G0p2xK/Od2f+n4aM3za8c"
Date: Fri, 16 Jan 2026 06:27:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"resource":"http://localhost:3443/mcp","authorization_servers":["https://vc-issuer.g-trustedweb.workers.dev"],"scopes_supported":["mcp:tickets:read","mcp:tickets:write"],"bearer_methods_supported":["header"],"resource_documentation":"http://localhost:3443/docs/mcp","resource_policy_uri":"http://localhost:3443/policy/mcp","authorization_details_types_supported":["ticket-reservation"]}
```

3. レスポンスボディの`authorization_servers`から利用できる認可サーバーのURLを確認し、認可サーバーのメタデータをリクエストする。

```bash
# リクエスト
curl -i https://vc-issuer.g-trustedweb.workers.dev/.well-known/oauth-authorization-server
```

```bash
# レスポンス（レスポンスボディは長いため中略）
HTTP/2 200 
date: Fri, 16 Jan 2026 06:39:35 GMT
content-type: application/json;charset=utf-8
content-length: 8013
access-control-allow-origin: *
cache-control: no-store
set-cookie: __session=cec0ad80-056c-4f7f-8c1f-8f92b524b021; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax
pragma: no-cache
vary: accept-encoding
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=Q7Xf5l%2BgmDJrNP%2BpH4s5tv3GuBaoF13JfWTzrgr6X4qcns1vYyImLYnz%2FrYYl8uXhD4GYzfd5YNrq%2BF5Q5%2BprYD2WbWv8cUjtzabLSnxN6KDIs2MAKZkDPTkc0%2BOf%2FFvNEc%3D"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server: cloudflare
cf-ray: 9beb9dd09814fcaf-KIX
alt-svc: h3=":443"; ma=86400

{
  "issuer": "https://vc-issuer.g-trustedweb.workers.dev",
  "authorization_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/api/authorization",
  "token_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/api/token",
  "registration_endpoint": "https://vc-issuer.g-trustedweb.workers.dev/connect/register",
  "scopes_supported": [
    "address",
    "email",
    "openid",
    "offline_access",
    "phone",
    "profile",
    "grant_management_query",
    "grant_management_revoke",
    "org.iso.18013.5.1.mDL",
    "test",
    "mcp:tickets:read",
    "mcp:tickets:write"
  ],
  "response_types_supported": [
    "none",
    "code",
    "id_token",
    "code id_token"
  ],
}
```

4. 認可サーバーのメタデータから`registration_endpoint`のURLを取得し、クライアントの登録をリクエストする。

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

```bash
# レスポンス
HTTP/2 201 
date: Fri, 16 Jan 2026 06:47:19 GMT
content-type: application/json;charset=utf-8
content-length: 970
access-control-allow-origin: *
cache-control: no-store
set-cookie: __session=e2aef599-695d-47e3-93f0-9b314bfdfa1e; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax
pragma: no-cache
vary: accept-encoding
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=uOnjKyrrMG0IlmMlxXk1bkLqtdB9TUSrt7OB5UjIWSBSrGAxV5iI4950nFIOa6ZK6hS3o5INzx1fnT2RHw1eVCD1OqGdW%2BELwESSSCfswmsEASrGY0es8enSylNJhHUjkis%3D"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server: cloudflare
cf-ray: 9beba9230c40d3cd-KIX
alt-svc: h3=":443"; ma=86400

{"default_max_age":0,"client_id":"1687054126","backchannel_user_code_parameter":false,"client_id_issued_at":1768546039,"tls_client_certificate_bound_access_tokens":false,"id_token_signed_response_alg":"RS256","redirect_uris":["http://localhost:6274/oauth/callback/debug"],"require_signed_request_object":false,"response_types":["code"],"client_uri":"https://github.com/modelcontextprotocol/inspector","registration_client_uri":"https://vc-issuer.g-trustedweb.workers.dev/connect/register/1687054126","registration_access_token":"msVNZHIuRTX8MW7Y03O1usW0TqK70-M1l6whFy6cUeM","token_endpoint_auth_method":"none","use_mtls_endpoint_aliases":false,"require_pushed_authorization_requests":false,"scope":"mcp:tickets:read mcp:tickets:write","client_name":"MCP Inspector","grant_types":["authorization_code","refresh_token"],"subject_type":"public","response_modes":["query","fragment","form_post","jwt","query.jwt","fragment.jwt","form_post.jwt"],"client_secret_expires_at":0}
```

5. 作成されたクライアントの`client_id`を使用してブラウザで認可リクエストする。（`client_id`は適宜書き換える。）

```bash
# リクエストURL

https://vc-issuer.g-trustedweb.workers.dev/api/authorization?response_type=code&client_id=1687054126&code_challenge=Skniu4mLy-GJhZzvSmLQpxDLGa_eSwW_cayjPqYSAaw&code_challenge_method=S256&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Foauth%2Fcallback%2Fdebug&state=90a927408e0065c96358550992ed9ddee5fd796abef051060617560da32ab6a4&scope=mcp%3Atickets%3Aread+mcp%3Atickets%3Awrite&resource=http%3A%2F%2Flocalhost%3A3443%2Fmcp
```

```bash
# コールバックURL
http://localhost:6274/oauth/callback/debug?state=90a927408e0065c96358550992ed9ddee5fd796abef051060617560da32ab6a4&code=MggNs47bcav_X55Ck8yBjLJ5RQqaLDAWMrRG_e0F4uI&iss=https%3A%2F%2Fvc-issuer.g-trustedweb.workers.dev
```

認可リクエストに成功すると上記のようなURLにリダイレクトし、クエリパラメータから認可コードが取得できます。

6. 取得した認可コードを用いてトークンリクエストをする。（`client_id`は適宜書き換える。）

```bash
# リクエスト
curl -iX POST https://vc-issuer.g-trustedweb.workers.dev/api/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=MggNs47bcav_X55Ck8yBjLJ5RQqaLDAWMrRG_e0F4uI&code_verifier=bgQH5h5Aizcmvw98iJUVeiXhkzKa_oz8nJ8Y_JodWXM&redirect_uri=http%3A%2F%2Flocalhost%3A6274%2Foauth%2Fcallback%2Fdebug&resource=http%3A%2F%2Flocalhost%3A3443%2Fmcp&client_id=1687054126"

```

```bash
# レスポンス
HTTP/2 200 
date: Fri, 16 Jan 2026 07:01:05 GMT
content-type: application/json;charset=utf-8
content-length: 210
access-control-allow-origin: *
cache-control: no-store
set-cookie: __session=d2f9786f-cbc0-4f69-bd6d-da8b28228204; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax
pragma: no-cache
vary: accept-encoding
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=EBu9p99GPt9eL8be9mgUMU6lpgucmkRf0T2QK9WaRR54iOU2ifqaSvBMFRBf5ij5DfdUXpHL8nIDUpV1s7%2B%2Bhkw8t1lIi3YaezZDPOC%2FEnTmngjSp86LpFojaV8oM0U4j7s%3D"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server: cloudflare
cf-ray: 9bebbd574f5b8382-KIX
alt-svc: h3=":443"; ma=86400

{"access_token":"IU7JGeoJxJSGfAY7nT9A-kK4GAGQgenvHtaRbaUcwoU","token_type":"Bearer","expires_in":86400,"scope":"mcp:tickets:read mcp:tickets:write","refresh_token":"quiRRKL1NWotRSJOYpegKPZQn5_G6NezhRFIJKGcrJs"}
```

7. 発行されたアクセストークンをAuthoriztionヘッダーに設定してMCPサーバーにリクエストする。

リクエスト例：

```bash
# リクエスト
curl -iX POST http://localhost:3443/mcp \
    -H "Authorization: Bearer IU7JGeoJxJSGfAY7nT9A-kK4GAGQgenvHtaRbaUcwoU" \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'
```

```bash
# レスポンス
HTTP/1.1 202 Accepted
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Vary: Origin
Access-Control-Allow-Credentials: true
content-type: text/plain; charset=UTF-8
Date: Fri, 16 Jan 2026 07:26:24 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked
```

無事MCPサーバーにアクセスできました。

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

OAuth クライアント（アプリケーション）が、自身のメタデータ（リダイレクト URI、アプリ名、ロゴの URL など）を送信し、動的にクライアント登録を行うためのエンドポイントです。[RFC7591](https://datatracker.ietf.org/doc/html/rfc7591)で仕様が定義されています。
成功すると、認可サーバーから一意のクライアント ID（および必要に応じてクライアントシークレット）や登録メタデータが返却されます。

多くの場合、MCPクライアントは事前にMCPサーバーの認可サーバーについての情報を持っておらず、また手動での登録作業はユーザーにとって抵抗があります。
動的クライアント登録の仕組みを利用することでMCPクライアントは新たなMCPサーバーおよびその認可サーバーとシームレスに接続することが可能になります。

### 5.3 認可エンドポイント

リソースオーナー（エンドユーザー）が認証を行い、クライアントへのアクセス権限の付与（認可）を承認するためのエンドポイントです。OAuth2.1（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で仕様が定義されています。
本プロジェクトでは、標準的なスコープに加え、**Rich Authorization Requests (RAR)** を利用して構造化された詳細な権限（例：「チケット予約」の「金額上限」など）を `authorization_details` パラメータで要求します。また、`resource` パラメータで使用する MCP サーバーを特定する必要があります。

### 5.4 トークンエンドポイント

クライアントがアクセストークンを取得するために使用するエンドポイントです。OAuth2.1（[draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)）で仕様が定義されています。
認可エンドポイントで取得した「認可コード」をこのエンドポイントに送信し、引き換えに「アクセストークン」（および ID トークン、リフレッシュトークン）を受け取ります。また、リクエスト時には`resource` パラメータで使用する MCP サーバーを特定する必要があります。（`resource`パラメータの値は認可エンドポイントにリクエストする際と同じです。）

### 5.5 イントロスペクションエンドポイント

リソースサーバー（MCP サーバー）が、提示されたアクセストークンの有効性やメタデータを確認するために使用するエンドポイントです。[RFC7662](https://datatracker.ietf.org/doc/html/rfc7662)で仕様が定義されています。
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
