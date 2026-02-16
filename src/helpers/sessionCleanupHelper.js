// ../src/helpers/sessionCleanupHelper.js

export function filterActiveSessions(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const now = new Date();

  return sessions.filter((session) => {
    if (!session.end_time) return false;

    const end = new Date(session.end_time);

   
    return end > now;
  });
}
