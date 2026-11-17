// SPDX-License-Identifier: Apache-2.0
/**
 * The action preview is intentionally read-only, but must still bind its
 * analysis to an actually verified login session.
 *
 * The application's general requireUserId() helper may return a shared
 * "dev-user" when auth is disabled and no DB is configured. A server-generated
 * synthetic identity is not an authenticated principal.
 */
export class PreviewSessionRequired extends Error {
  readonly status = 401;
  constructor() {
    super("Verified session required");
    this.name = "PreviewSessionRequired";
  }
}

export type PreviewVerifiedUser = { id: string };

/**
 * Only an id from the real session resolver can pass this gate. The fallback
 * policy callback is consulted ONLY to preserve its 401/503 diagnostics;
 * its returned id, if any, is never accepted for this endpoint.
 */
export async function requireVerifiedPreviewIdentity(
  resolveSession: () => Promise<PreviewVerifiedUser | null>,
  checkAuthConfiguration: () => Promise<unknown>,
): Promise<string> {
  const session = await resolveSession();
  if (session && typeof session.id === "string" &&
      session.id.length > 0 && session.id === session.id.trim()) {
    return session.id;
  }
  await checkAuthConfiguration();
  throw new PreviewSessionRequired();
}
