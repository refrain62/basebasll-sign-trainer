import { exchangeGoogleCode, googleAuthorizationUrl, googleConfigured, verifyGoogleIdToken } from "./google-provider.ts";
import { deauthorizeLineApp, exchangeLineCode, lineAuthorizationUrl, lineConfigured, verifyLineIdToken } from "./line-provider.ts";

export const OAUTH_PROVIDERS = new Set(["google", "line"]);

export function providerStatus(env) {
  return {
    google: googleConfigured(env),
    line: lineConfigured(env)
  };
}

export function providerConfigured(provider, env) {
  return provider === "google" ? googleConfigured(env) : provider === "line" ? lineConfigured(env) : false;
}

export function providerAuthorizationUrl(provider, params) {
  if (provider === "google") return googleAuthorizationUrl(params);
  if (provider === "line") return lineAuthorizationUrl(params);
  throw new Error("unsupported_oauth_provider");
}

export async function exchangeAndVerifyProvider(provider, params) {
  if (provider === "google") {
    const tokens = await exchangeGoogleCode(params);
    if (!tokens.id_token) throw new Error("google_id_token_missing");
    const profile = await verifyGoogleIdToken({ env: params.env, idToken: tokens.id_token, nonce: params.nonce, fetchFn: params.fetchFn });
    return { ...profile, providerAccessToken: String(tokens.access_token || "") };
  }
  if (provider === "line") {
    const tokens = await exchangeLineCode(params);
    if (!tokens.id_token) throw new Error("line_id_token_missing");
    const profile = await verifyLineIdToken({ env: params.env, idToken: tokens.id_token, nonce: params.nonce, fetchFn: params.fetchFn });
    return { ...profile, providerAccessToken: String(tokens.access_token || "") };
  }
  throw new Error("unsupported_oauth_provider");
}

export { deauthorizeLineApp };
