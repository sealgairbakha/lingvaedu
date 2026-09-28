export function trialCourseIdFromPath(pathname: string): string | null {
  const match = /^\/trial\/([^/]+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}
