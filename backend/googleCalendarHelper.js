const db = require('./db');

/**
 * Refreshes the Google Access Token using the stored refresh token.
 */
async function refreshGoogleAccessToken(userId, refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientSecret === 'YOUR_GOOGLE_CLIENT_SECRET_HERE') {
    throw new Error('Google Client credentials missing.');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google token refresh failed: ${errText}`);
    }

    const tokenData = await response.json();
    const newAccessToken = tokenData.access_token;

    // Update new token in database
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET googleAccessToken = ? WHERE id = ?',
        [newAccessToken, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return newAccessToken;
  } catch (err) {
    console.error(`[Google Calendar] Error refreshing token for user ${userId}:`, err.message);
    throw err;
  }
}

/**
 * Creates an event on the user's primary Google Calendar.
 */
async function createGoogleCalendarEvent(userId, task) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (dbErr, user) => {
      if (dbErr || !user || !user.googleConnected || !user.googleAccessToken) {
        return resolve({ success: false, reason: 'Google Calendar integration inactive or unlinked.' });
      }

      const startTime = new Date(task.createdAt).toISOString();
      const endTime = new Date(task.createdAt + task.durationSeconds * 1000).toISOString();

      const eventBody = {
        summary: `LMLS: ${task.title}`,
        description: `Alarm scheduled on LastMinuteSaver.\nPriority: ${task.priority}\nStreak Tracker: Enabled`,
        start: { dateTime: startTime },
        end: { dateTime: endTime }
      };

      const sendRequest = async (token) => {
        return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody)
        });
      };

      try {
        let response = await sendRequest(user.googleAccessToken);

        // If expired (401), try refreshing token once
        if (response.status === 401 && user.googleRefreshToken) {
          console.log(`[Google Calendar] Access token expired for user ${userId}. Attempting refresh...`);
          const newAccessToken = await refreshGoogleAccessToken(userId, user.googleRefreshToken);
          response = await sendRequest(newAccessToken);
        }

        if (response.ok) {
          const eventData = await response.json();
          console.log(`[Google Calendar] Successfully created event for task "${task.title}". Event ID: ${eventData.id}`);
          resolve({ success: true, eventId: eventData.id });
        } else {
          const errorText = await response.text();
          console.error(`[Google Calendar] API error response:`, errorText);
          resolve({ success: false, reason: errorText });
        }
      } catch (err) {
        console.error(`[Google Calendar] Request failed for task "${task.title}":`, err.message);
        resolve({ success: false, error: err.message });
      }
    });
  });
}

module.exports = {
  createGoogleCalendarEvent
};