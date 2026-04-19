import { describe, expect, it, vi, beforeEach } from "vitest";

// Stub the crypto module before importing the module under test
vi.mock("../src/services/crypto.js", () => ({
  encryptText: (v: string) => `enc:${v}`,
  decryptText: (v: string) => v.replace("enc:", ""),
}));

// Stub the prisma client
vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Stub the env config
vi.mock("../src/config/env.js", () => ({
  env: {
    MICROSOFT_CLIENT_ID: "test-client-id",
    MICROSOFT_CLIENT_SECRET: "test-client-secret",
    MICROSOFT_TENANT_ID: "test-tenant-id",
    MICROSOFT_REDIRECT_URI: "http://localhost:4000/auth/callback",
    ENCRYPTION_KEY: "test-encryption-key-that-is-long-enough",
  },
}));

import {
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchOutlookEmails,
  sendOutlookEmail,
  replyToOutlookMessage,
  getValidAccessToken,
  saveTokensToUser,
} from "../src/services/graph.js";
import { prisma } from "../src/lib/prisma.js";

// Global fetch mock
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exchangeCodeForTokens", () => {
  it("sends correct POST to token endpoint and returns tokens", async () => {
    const tokenResponse = {
      access_token: "at-123",
      refresh_token: "rt-456",
      expires_in: 3600,
      token_type: "Bearer",
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tokenResponse),
    });

    const result = await exchangeCodeForTokens("auth-code-xyz");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("login.microsoftonline.com");
    expect(url).toContain("test-tenant-id");
    expect(options.method).toBe("POST");
    expect(result.access_token).toBe("at-123");
    expect(result.refresh_token).toBe("rt-456");
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve("bad_request"),
    });

    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow("Token exchange failed");
  });
});

describe("refreshAccessToken", () => {
  it("sends refresh_token grant and returns new tokens", async () => {
    const tokenResponse = {
      access_token: "new-at",
      refresh_token: "new-rt",
      expires_in: 3600,
      token_type: "Bearer",
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tokenResponse),
    });

    const result = await refreshAccessToken("old-rt");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = options.body as string;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old-rt");
    expect(result.access_token).toBe("new-at");
  });
});

describe("fetchOutlookEmails", () => {
  it("returns email messages from Graph API", async () => {
    const messages = [
      { id: "msg-1", subject: "Hello", bodyPreview: "Hi there", body: { contentType: "Text", content: "Hi there" }, receivedDateTime: "2024-01-01T00:00:00Z", isRead: false },
    ];

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ value: messages }),
    });

    const result = await fetchOutlookEmails("valid-token", 10);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Hello");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/me/messages");
    expect(url).toContain("$top=10");
  });
});

describe("sendOutlookEmail", () => {
  it("sends a POST to /me/sendMail", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await sendOutlookEmail("valid-token", "to@example.com", "Subject", "Body text");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/me/sendMail");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string);
    expect(body.message.subject).toBe("Subject");
    expect(body.message.toRecipients[0].emailAddress.address).toBe("to@example.com");
  });

  it("throws on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });

    await expect(
      sendOutlookEmail("bad-token", "to@example.com", "Sub", "Body")
    ).rejects.toThrow("Graph sendMail failed");
  });
});

describe("replyToOutlookMessage", () => {
  it("sends a POST to /me/messages/{id}/reply", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await replyToOutlookMessage("valid-token", "msg-abc", "Thanks!");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/me/messages/msg-abc/reply");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string);
    expect(body.comment).toBe("Thanks!");
  });
});

describe("saveTokensToUser", () => {
  it("updates the user with encrypted tokens", async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await saveTokensToUser("user-1", {
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3600,
      token_type: "Bearer",
    });

    expect(prisma.user.update).toHaveBeenCalledOnce();
    const call = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(call.where).toEqual({ id: "user-1" });
    expect(call.data.msGraphAccessToken).toBe("enc:at");
    expect(call.data.msGraphRefreshToken).toBe("enc:rt");
    expect(call.data.msGraphTokenExpiry).toBeInstanceOf(Date);
  });
});

describe("getValidAccessToken", () => {
  it("returns cached token if not expired", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      msGraphAccessToken: "enc:cached-at",
      msGraphRefreshToken: "enc:cached-rt",
      msGraphTokenExpiry: futureDate,
    } as never);

    const token = await getValidAccessToken("user-1");
    expect(token).toBe("cached-at");
    expect(fetchMock).not.toHaveBeenCalled(); // no refresh needed
  });

  it("refreshes token if expired", async () => {
    const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      msGraphAccessToken: "enc:old-at",
      msGraphRefreshToken: "enc:old-rt",
      msGraphTokenExpiry: pastDate,
    } as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "new-at",
          refresh_token: "new-rt",
          expires_in: 3600,
          token_type: "Bearer",
        }),
    });

    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    const token = await getValidAccessToken("user-1");
    expect(token).toBe("new-at");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws if user has no tokens", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      msGraphAccessToken: null,
      msGraphRefreshToken: null,
      msGraphTokenExpiry: null,
    } as never);

    await expect(getValidAccessToken("user-1")).rejects.toThrow(
      "User has not connected a Microsoft account"
    );
  });
});
