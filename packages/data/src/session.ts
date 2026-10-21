/**
 * Who is making the request.
 *
 * The data layer does not know about the web framework, and it should not:
 * the same functions have to work in a request, in a job and in a test. So
 * the application says who the caller is, and the data layer asks.
 *
 * Without this the session is not a session. A query that returns the first
 * membership in the database is not a signed-in user, it is whoever happens
 * to be first, and everybody sees their workspace.
 *
 * The reader lives on `globalThis` because the application and the data
 * layer can end up as two copies of the same module — one per route — and
 * the two have to see the same reader.
 */

export interface SessionIdentity {
  /** The person making the request. */
  userId: string;
  /**
   * The workspace the session is pointed at.
   *
   * A person can belong to more than one workspace, and the session says
   * which one is in front of them.
   */
  organizationId?: string | null;
  /**
   * The group the person is working in, if they chose one.
   *
   * It is a request from the outside, so the data layer checks that the
   * group belongs to the workspace before it uses it. An unknown or
   * foreign group falls back to the workspace's default one.
   */
  groupId?: string | null;
}

type SessionReader = () => Promise<SessionIdentity | null>;

const globalForSession = globalThis as unknown as {
  golinkSessionReader?: SessionReader;
};

/** Tell the data layer who the caller is. */
export function setSessionReader(fn: SessionReader) {
  globalForSession.golinkSessionReader = fn;
}

/** The caller, or null when there is nobody. */
export function readSession(): Promise<SessionIdentity | null> {
  const reader = globalForSession.golinkSessionReader;
  return reader ? reader() : Promise.resolve(null);
}
