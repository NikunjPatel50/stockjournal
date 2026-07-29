const NEW_OAUTH_USER_WINDOW_MS = 5 * 60 * 1000;

type AuthUserLike = {
  emailVerified?: boolean;
  createdAt?: string;
  created_at?: string;
};

export function isNewOAuthUser(
  user: AuthUserLike,
  exchangePayload?: Record<string, unknown>
) {
  if (exchangePayload) {
    if (typeof exchangePayload.isNewUser === "boolean") {
      return exchangePayload.isNewUser;
    }
    if (typeof exchangePayload.is_new_user === "boolean") {
      return exchangePayload.is_new_user;
    }
  }

  const createdRaw = user.createdAt ?? user.created_at;
  if (!createdRaw) {
    return false;
  }

  const created = new Date(createdRaw).getTime();
  if (Number.isNaN(created)) {
    return false;
  }

  return Date.now() - created < NEW_OAUTH_USER_WINDOW_MS;
}

export function oauthUserNeedsEmailVerification(
  user: AuthUserLike,
  exchangePayload?: Record<string, unknown>
) {
  if (user.emailVerified === false) {
    return true;
  }
  return isNewOAuthUser(user, exchangePayload);
}
