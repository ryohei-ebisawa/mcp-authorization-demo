export interface OAuthConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  revocationEndpoint: string;
  discoveryEndpoint: string;
  sessionSecret: string;
}

export const getOAuthConfig = (): OAuthConfig => {
  const baseUrl = "https://vc-issuer.g-trustedweb.workers.dev";

  return {
    issuer: baseUrl,
    authorizationEndpoint: `${baseUrl}/oauth/authorize`,
    tokenEndpoint: `${baseUrl}/oauth/token`,
    userinfoEndpoint: `${baseUrl}/oauth/userinfo`,
    revocationEndpoint: `${baseUrl}/oauth/revoke`,
    discoveryEndpoint: `${baseUrl}/.well-known/oauth-authorization-server`,
    sessionSecret: process.env.SESSION_SECRET || 'default-oauth-secret'
  };
};