import { Request, Response, NextFunction } from "express";
import { AuthorizationDetailsElement } from "@authlete/typescript-sdk/models";
// import { getAuthleteContext } from "../authlete-sdk.js";
import { oauthLogger } from "../../utils/logger.js";
import { getOAuthConfig } from "../config/oauth-config.js";

interface OAuthValidationOptions {
  requiredScopes?: string[];
  requireSSL?: boolean;
  // OAuth 2.1ではheaderのみ許可
}

interface AuthenticatedRequest extends Request {
  oauth?: {
    token: string;
    subject: string;
    clientId: string;
    scopes: string[];
    username?: string;
    exp?: number;
    authorizationDetails?: { elements: AuthorizationDetailsElement[] }; // オブジェクト形式
  };
}

/**
 * OAuth Bearer Token認証ミドルウェア
 * Authlete Introspection APIを使用してアクセストークンを検証
 */
export const oauthAuthentication = (options: OAuthValidationOptions = {}) => {
  const { requiredScopes = [], requireSSL = true } = options;

  // const { authlete, serviceId } = getAuthleteContext();

  // RFC 6750 Section 3 (https://www.rfc-editor.org/rfc/rfc6750#page-7)
  // "The \"scope\" attribute is a space-delimited list of case-sensitive scope values
  // indicating the required scope of the access token for accessing the requested resource."
  const scopeAttributeSuffix =
    requiredScopes.length > 0 ? `, scope="${requiredScopes.join(" ")}"` : "";

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // HTTPS必須チェック
      if (requireSSL && req.protocol !== "https") {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "HTTPS is required for OAuth protected resources",
        });
      }

      // Bearer tokenの抽出（OAuth 2.1ではheaderのみ）
      const token = extractBearerToken(req);

      if (!token) {
        // RFC 6750 Section 3: WWW-Authenticate ヘッダーを設定
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const wwwAuth =
          `Bearer realm="${baseUrl}", ` +
          `error="invalid_request", ` +
          `error_description="Access token is required", ` +
          `resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp"` +
          scopeAttributeSuffix;

        res.set("WWW-Authenticate", wwwAuth);
        return res.status(401).json({
          error: "invalid_request",
          error_description: "Access token is required",
        });
      }

      const { issuer } = getOAuthConfig();
      const metadateResponse = await fetch(
        `${issuer}/.well-known/oauth-authorization-server`
      );
      const { introspection_endpoint } = (await metadateResponse.json()) as {
        introspection_endpoint: string;
      };

      const formData = new URLSearchParams({
        token: token,
      });

      const response = await fetch(introspection_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic bWNwLXNlcnZlcjptY3Atc2VydmVyLXNlY3JldA==`,
        },
        body: formData.toString(),
      });

      // Authlete Introspection APIでトークンを検証
      // const introspectionRequest: IntrospectionRequest = {
      //   token,
      //   scopes: requiredScopes,
      // };

      // const introspectionResponse = await authlete.introspection.process({
      //   serviceId,
      //   introspectionRequest,
      // });

      // console.log("middleware introspection called");

      // // デバッグログ: Introspection レスポンスを出力
      // oauthLogger.debug(
      //   "Authlete introspection response",
      //   introspectionResponse
      // );

      // baseUrl を事前に定義
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      // Introspection結果の処理
      // switch (introspectionResponse.action) {
      switch (response.status) {
        case 500:
          oauthLogger.error("Authlete introspection error", {
            message: await response.text(),
          });
          return res.status(500).json({
            error: "server_error",
            error_description: "Token validation failed",
          });

        case 400:
          return res.status(400).json({
            error: "invalid_request",
            error_description:
              (await response.text()) || "Invalid token request",
          });

        case 401:
          const wwwAuthInvalid =
            `Bearer realm="${baseUrl}", ` +
            `error="invalid_token", ` +
            `error_description="The access token provided is expired, revoked, malformed, or invalid", ` +
            `resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"` +
            scopeAttributeSuffix;

          res.set("WWW-Authenticate", wwwAuthInvalid);
          return res.status(401).json({
            error: "invalid_token",
            error_description:
              "The access token provided is expired, revoked, malformed, or invalid",
          });

        case 403:
          const wwwAuthScope =
            `Bearer realm="${baseUrl}", ` +
            `error="insufficient_scope", ` +
            `error_description="The request requires higher privileges than provided", ` +
            `resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"` +
            scopeAttributeSuffix;

          res.set("WWW-Authenticate", wwwAuthScope);
          return res.status(403).json({
            error: "insufficient_scope",
            error_description: `The request requires higher privileges than provided. Required scopes: ${requiredScopes.join(
              ", "
            )}`,
          });

        case 200:
          // アクセストークンのリソース検証
          const mcpServerUrl = `${baseUrl}/mcp`;
          const introspectionResponse = (await response.json()) as {
            active: boolean;
            scope: string;
            client_id: string;
            token_type: string;
            exp: number;
            sub: string;
            aud: string[];
            iss: string;
            auth_time: number;
          };
          console.log("introspectionResponse :>> ", introspectionResponse);
          if (
            !introspectionResponse.aud ||
            !introspectionResponse.aud.includes(mcpServerUrl)
          ) {
            oauthLogger.warn(
              "Access token does not include MCP server resource",
              {
                requiredResource: mcpServerUrl,
                accessTokenResources: introspectionResponse.aud || [],
              }
            );

            const wwwAuthResource =
              `Bearer realm="${baseUrl}", ` +
              `error="invalid_token", ` +
              `error_description="Access token does not include required resource", ` +
              `resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"` +
              scopeAttributeSuffix;

            res.set("WWW-Authenticate", wwwAuthResource);
            return res.status(401).json({
              error: "invalid_token",
              error_description:
                "Access token does not include required resource",
            });
          }
          req.oauth = {
            token: token,
            subject: introspectionResponse.sub || "",
            clientId: introspectionResponse.client_id || "",
            scopes: introspectionResponse.scope.split(" ") || [],
            username: introspectionResponse.sub,
            exp: introspectionResponse.exp,
          };

          // トークンが有効 - リクエストにOAuth情報を追加
          // const authorizationDetails = introspectionResponse
          //   .authorizationDetails?.elements
          //   ? { elements: introspectionResponse.authorizationDetails.elements }
          //   : undefined;

          // req.oauth = {
          //   token: token,
          //   subject: introspectionResponse.subject || "",
          //   clientId: introspectionResponse.clientId?.toString() || "",
          //   scopes: introspectionResponse.scopes || [],
          //   username: introspectionResponse.subject, // subject をユーザー識別子として使用
          //   exp: introspectionResponse.expiresAt,
          //   authorizationDetails,
          // };

          // デバッグログ: authorization detailsがある場合はログ出力
          // if (introspectionResponse.authorizationDetails) {
          //   oauthLogger.debug("Authorization details found in token", {
          //     authorizationDetails: introspectionResponse.authorizationDetails,
          //     subject: introspectionResponse.subject,
          //   });
          // }

          next();
          break;

        default:
          oauthLogger.error("Unexpected introspection action", {
            // action: introspectionResponse.action,
          });
          return res.status(500).json({
            error: "server_error",
            error_description: "Unexpected token validation result",
          });
      }
    } catch (error) {
      oauthLogger.error("OAuth authentication error", JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: "server_error",
        error_description: "Token validation failed",
      });
    }
  };
};

/**
 * Bearer tokenの抽出 (RFC 6750, OAuth 2.1 compliant)
 * OAuth 2.1では Authorization header のみ許可
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  // Authorization headerから抽出 (OAuth 2.1 only method)
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * スコープ検証ミドルウェア（既に認証済みのリクエスト用）
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.oauth) {
      return res.status(401).json({
        error: "invalid_token",
        error_description: "No OAuth authentication found",
      });
    }

    const hasRequiredScopes = requiredScopes.every((scope) =>
      req.oauth!.scopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: "insufficient_scope",
        error_description: `Required scopes: ${requiredScopes.join(
          ", "
        )}. Provided scopes: ${req.oauth.scopes.join(", ")}`,
      });
    }

    next();
  };
};

export type { AuthenticatedRequest };
