import { GitHub, generateState } from 'arctic';
import type { Env } from '../../env.ts';
import { AppError } from '../../lib/errors.ts';

const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';

interface GitHubIdentity {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  website: string | null;
}

export interface GitHubClient {
  authorizationUrl(state: string): URL;
  /** Exchanges the code and fetches the primary verified e-mail of the GitHub user. */
  identityFromCode(code: string): Promise<GitHubIdentity>;
}

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  blog: string | null;
}
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export { generateState };

/**
 * GitHub OAuth client. arctic builds the authorization URL and state; the code exchange is a
 * plain POST done here so that `fetchImpl` can be injected in tests (arctic uses global fetch).
 */
export function createGitHubClient(
  env: Pick<Env, 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET' | 'APP_URL'>,
  fetchImpl: typeof fetch = fetch,
): GitHubClient | null {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  const redirectUri = `${env.APP_URL}/api/v1/auth/github/callback`;
  const github = new GitHub(clientId, clientSecret, redirectUri);

  async function exchangeCode(code: string): Promise<string> {
    let res: Response;
    try {
      res = await fetchImpl(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'devconnector',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });
    } catch (err) {
      throw new AppError(502, 'GitHub unavailable', {
        detail: 'Could not reach GitHub',
        cause: err,
      });
    }
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new AppError(400, 'GitHub sign-in failed', {
        detail: body.error_description ?? 'The authorization code was rejected',
      });
    }
    return body.access_token;
  }

  async function api<T>(path: string, accessToken: string): Promise<T> {
    const res = await fetchImpl(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'devconnector',
      },
    });
    if (!res.ok)
      throw new AppError(502, 'GitHub unavailable', {
        detail: `GitHub answered ${res.status} for ${path}`,
      });
    return (await res.json()) as T;
  }

  return {
    authorizationUrl: (state) => github.createAuthorizationURL(state, ['read:user', 'user:email']),
    async identityFromCode(code) {
      const accessToken = await exchangeCode(code);
      const user = await api<GitHubUser>('/user', accessToken);
      const emails = await api<GitHubEmail[]>('/user/emails', accessToken);
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      const email = (primary?.email ?? user.email)?.toLowerCase();
      if (!email) {
        throw new AppError(400, 'GitHub sign-in failed', {
          detail: 'Your GitHub account has no verified e-mail address we can use',
        });
      }
      return {
        providerUserId: String(user.id),
        email,
        emailVerified: primary !== undefined,
        username: user.login || null,
        website: user.blog && /^https?:\/\//.test(user.blog) ? user.blog : null,
      };
    },
  };
}
