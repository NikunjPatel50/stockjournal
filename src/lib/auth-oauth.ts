type AuthUserLike = {
  emailVerified?: boolean;
};

export function oauthUserNeedsEmailVerification(user: AuthUserLike) {
  // OAuth providers (e.g. Google) already verify email — only gate unverified accounts.
  return user.emailVerified === false;
}
