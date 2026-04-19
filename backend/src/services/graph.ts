import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { encryptText } from "./crypto.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface GraphMailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  receivedDateTime: string;
  from?: { emailAddress: { name: string; address: string } };
  isRead: boolean;
}

interface GraphMailListResponse {
  value: GraphMailMessage[];
  "@odata.nextLink"?: string;
}

// ── Token helpers ──────────────────────────────────────────────────────────

const TOKEN_URL = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: env.MICROSOFT_REDIRECT_URI,
    grant_type: "authorization_code",
    scope: "openid profile email offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorBody}`);
  }

  return (await res.json()) as MicrosoftTokenResponse;
}

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "openid profile email offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errorBody}`);
  }

  return (await res.json()) as MicrosoftTokenResponse;
}

/**
 * Persist tokens on the User row and return the (possibly refreshed) access token.
 */
export async function saveTokensToUser(
  userId: string,
  tokens: MicrosoftTokenResponse
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      msGraphAccessToken: encryptText(tokens.access_token),
      ...(tokens.refresh_token
        ? { msGraphRefreshToken: encryptText(tokens.refresh_token) }
        : {}),
      msGraphTokenExpiry: expiry,
    },
  });
}

/**
 * Retrieve a valid access token for a user, refreshing if expired.
 * Throws if the user has no stored tokens.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const { decryptText } = await import("./crypto.js");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      msGraphAccessToken: true,
      msGraphRefreshToken: true,
      msGraphTokenExpiry: true,
    },
  });

  if (!user?.msGraphAccessToken || !user.msGraphRefreshToken) {
    throw new Error("User has not connected a Microsoft account. Please log in via /auth/login.");
  }

  const accessToken = decryptText(user.msGraphAccessToken);
  const refreshToken = decryptText(user.msGraphRefreshToken);

  // Return cached token if it's still valid for at least 5 more minutes
  const bufferMs = 5 * 60 * 1000;
  if (user.msGraphTokenExpiry && user.msGraphTokenExpiry.getTime() > Date.now() + bufferMs) {
    return accessToken;
  }

  // Token is expired or about to expire — refresh it
  const newTokens = await refreshAccessToken(refreshToken);
  await saveTokensToUser(userId, newTokens);
  return newTokens.access_token;
}

// ── Graph API calls ────────────────────────────────────────────────────────

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Fetch the user profile from Microsoft Graph.
 */
export async function getGraphUserProfile(
  accessToken: string
): Promise<{ displayName: string; mail: string; userPrincipalName: string }> {
  const res = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Graph /me failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as { displayName: string; mail: string; userPrincipalName: string };
}

/**
 * Fetch recent emails from Outlook via Microsoft Graph.
 */
export async function fetchOutlookEmails(
  accessToken: string,
  top = 25
): Promise<GraphMailMessage[]> {
  const url = `${GRAPH_BASE}/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,receivedDateTime,from,isRead`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Graph /me/messages failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as GraphMailListResponse;
  return data.value;
}

/**
 * Send an email via Microsoft Graph.
 */
export async function sendOutlookEmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyContent: string,
  contentType: "Text" | "HTML" = "Text"
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType, content: bodyContent },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Graph sendMail failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Reply to a specific message via Microsoft Graph.
 */
export async function replyToOutlookMessage(
  accessToken: string,
  graphMessageId: string,
  comment: string
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/me/messages/${graphMessageId}/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    throw new Error(`Graph reply failed (${res.status}): ${await res.text()}`);
  }
}
