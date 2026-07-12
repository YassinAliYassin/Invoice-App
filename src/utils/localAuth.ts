/**
 * Local multi-user auth for offline / non-Firebase mode.
 * Passwords are stored as SHA-256 hashes (browser Web Crypto).
 */

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  photoURL?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthSessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  emailVerified: boolean;
}

const USERS_KEY = 'invoicestack_local_users';
const SESSION_KEY = 'invoicestack_local_session';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toSessionUser(user: LocalUser): AuthSessionUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    emailVerified: user.emailVerified,
  };
}

export function getLocalSession(): AuthSessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSessionUser) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(user: AuthSessionUser | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function findLocalUserByEmail(email: string): LocalUser | undefined {
  const normalized = normalizeEmail(email);
  return loadUsers().find((u) => u.email === normalized);
}

export async function localSignUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthSessionUser> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!displayName.trim()) {
    throw new Error('Please enter your name or business name.');
  }

  const users = loadUsers();
  if (users.some((u) => u.email === normalized)) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const passwordHash = await hashPassword(password);
  const user: LocalUser = {
    uid: 'local_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    email: normalized,
    displayName: displayName.trim(),
    passwordHash,
    photoURL: null,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  const session = toSessionUser(user);
  setLocalSession(session);
  return session;
}

export async function localSignIn(
  email: string,
  password: string
): Promise<AuthSessionUser> {
  const normalized = normalizeEmail(email);
  const user = findLocalUserByEmail(normalized);
  if (!user) {
    throw new Error('No account found with this email. Please sign up first.');
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  const session = toSessionUser(user);
  setLocalSession(session);
  return session;
}

export function localSignOut() {
  setLocalSession(null);
}

export async function localResetPasswordHint(email: string): Promise<string> {
  const user = findLocalUserByEmail(email);
  if (!user) {
    throw new Error('No account found with this email.');
  }
  return (
    'Local mode does not send emails. Sign up again with a new password after removing this account from browser storage, ' +
    'or contact support if you used cloud mode previously.'
  );
}
