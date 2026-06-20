export function displayName(u: { nickname?: string | null; username: string }): string {
  return (u.nickname && u.nickname.trim()) || u.username;
}
