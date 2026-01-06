type ReleaseInfo = {
  releaseSha: string;
  environment: string;
};

export function getReleaseInfo(): ReleaseInfo {
  const releaseSha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GITHUB_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    "unknown";

  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";

  return { releaseSha, environment };
}
