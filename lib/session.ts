export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function saveSessionToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("amigo-secreto-session", token);
  }
}

export function getSessionToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("amigo-secreto-session");
  }
  return null;
}
