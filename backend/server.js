const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const { createGoogleCalendarEvent } = require('./googleCalendarHelper');
const { createNotionTaskPage, getOrCreateNotionDatabase } = require('./notionHelper');
const { processAssistantMessage, processTaskChat } = require('./assistant');
const multer = require('multer');
const fs = require('fs');
const Groq = require('groq-sdk');

const upload = multer({ dest: 'uploads/' }); // Temporary storage for audio blobs

const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Telegram Config Setup
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
if (telegramBotToken && telegramBotToken !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.log("Telegram Bot client config loaded.");
} else {
  console.log("⚠️ Telegram Bot Token missing or placeholder. Telegram alerts will be simulated in server logs.");
}

// Email Config Setup (Nodemailer)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
let emailTransporter = null;

if (smtpHost && smtpUser && smtpPass && smtpHost !== 'YOUR_SMTP_HOST_HERE') {
  try {
    emailTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    console.log("Email SMTP transporter initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize SMTP email transporter:", err.message);
  }
} else {
  console.log("⚠️ SMTP credentials missing or placeholder. Email alerts will be simulated in server logs.");
}

// Telegram Bot Polling Listener (Auto-link Chat IDs via Deep Links)
let lastUpdateId = 0;
function startTelegramBotPolling() {
  if (!telegramBotToken || telegramBotToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') return;

  setInterval(async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`);
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.result && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          const message = update.message;
          if (message && message.text) {
            const text = message.text.trim();
            const chatId = message.chat.id;

            // Matches "/start user_id_here"
            if (text.startsWith('/start ')) {
              const userId = text.replace('/start ', '').trim();
              
              // Verify user exists and link their Telegram Chat ID
              db.run(
                "UPDATE users SET telegramChatId = ?, telegramEnabled = 1 WHERE id = ?",
                [chatId.toString(), userId],
                function(err) {
                  if (!err && this.changes > 0) {
                    console.log(`[Telegram Bot] Automatically linked Chat ID ${chatId} to User ID ${userId}`);
                    
                    // Send confirmation message to the user on Telegram
                    fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: chatId,
                        text: `🎉 LastMinuteSaver Linked Successfully!\n\nYou will now receive instant task alarm alerts in this chat. Make sure to stay on your streak! ⏰`
                      })
                    }).catch(console.error);
                  }
                }
              );
            }
          }
        }
      }
    } catch (err) {
      // Quiet fail to avoid polluting terminal logs
    }
  }, 3000);
}

// Start polling
startTelegramBotPolling();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// In production the frontend is served from the same origin, so CORS is not needed.
// In dev, allow the Vite dev server.
if (!isProduction) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
}

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'lastminute_saver_super_secret_cookie_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Use HTTPS in production (Cloud Run always uses HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const PORT = process.env.PORT || 5000;

// Setup Passport Google Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret && googleClientSecret !== 'YOUR_GOOGLE_CLIENT_SECRET_HERE') {
  passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: 'http://localhost:5000/api/auth/google/callback',
    proxy: true
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
    const name = profile.displayName || 'Google User';
    
    // Find or create user
    db.get('SELECT * FROM users WHERE googleId = ? OR email = ?', [profile.id, email], (err, user) => {
      if (err) return done(err);
      
      if (user) {
        // Link Google ID if missing, and always store the fresh tokens
        db.run(`UPDATE users SET 
                googleId = COALESCE(googleId, ?), 
                googleConnected = 1, 
                googleAccessToken = ?, 
                googleRefreshToken = COALESCE(?, googleRefreshToken) 
                WHERE id = ?`, 
                [profile.id, accessToken, refreshToken, user.id], (updateErr) => {
          if (updateErr) return done(updateErr);
          db.get('SELECT * FROM users WHERE id = ?', [user.id], (fetchErr, updatedUser) => {
            return done(fetchErr || null, updatedUser);
          });
        });
      } else {
        // Create new user
        const newUserId = 'u-' + Date.now();
        const createdAt = Date.now();
        db.run(`INSERT INTO users (id, email, googleId, name, gender, googleConnected, googleAccessToken, googleRefreshToken, createdAt) 
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`, 
                [newUserId, email, profile.id, name, 'Male', accessToken, refreshToken, createdAt], (insertErr) => {
          if (insertErr) return done(insertErr);
          db.get('SELECT * FROM users WHERE id = ?', [newUserId], (fetchErr, newUser) => {
            return done(fetchErr || null, newUser);
          });
        });
      }
    });
  }));
} else {
  console.log("⚠️ Google Client ID/Secret not set in .env. Google Login will be simulated.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Middleware to verify session auth
function checkAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please sign in.' });
}

// Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize VAPID details for Web Push — wait for DB tables to be ready first
let vapidKeys = null;
db.once('ready', () => {
  db.get("SELECT value FROM settings WHERE key = 'vapid_keys'", (err, row) => {
    if (!err && row && row.value) {
      vapidKeys = JSON.parse(row.value);
      webpush.setVapidDetails(
        'mailto:admin@lastminutesaver.io',
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
      console.log("VAPID Keys loaded successfully.");
    } else {
      const keys = webpush.generateVAPIDKeys();
      vapidKeys = keys;
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('vapid_keys', ?)", [JSON.stringify(keys)], (saveErr) => {
        if (saveErr) console.error("Could not save VAPID keys:", saveErr.message);
      });
      webpush.setVapidDetails(
        'mailto:admin@lastminutesaver.io',
        keys.publicKey,
        keys.privateKey
      );
      console.log("VAPID Keys generated and saved.");
    }
    initTaskTimers();
  });
});

// Cache for server side setTimeouts
const activeTimers = {};

function initTaskTimers() {
  db.all("SELECT * FROM tasks WHERE completed = 0", (err, tasks) => {
    if (err) return console.error("Error loading tasks for timers:", err);
    tasks.forEach(task => {
      scheduleTaskTimer(task);
    });
  });
}

function scheduleTaskTimer(task) {
  if (activeTimers[task.id]) {
    clearTimeout(activeTimers[task.id]);
  }
  const now = Date.now();
  const timeElapsed = Math.floor((now - task.createdAt) / 1000);
  const remainingSeconds = task.durationSeconds - timeElapsed;
  
  if (remainingSeconds <= 0) {
    triggerExpiry(task.id);
  } else {
    activeTimers[task.id] = setTimeout(() => {
      triggerExpiry(task.id);
    }, remainingSeconds * 1000);
  }
}

function triggerExpiry(taskId) {
  db.get("SELECT * FROM tasks WHERE id = ?", [taskId], (err, task) => {
    if (err || !task || task.completed) return;
    
    // Mark as complete/expired in DB
    db.run("UPDATE tasks SET completed = 1, completedAt = ? WHERE id = ?", [Date.now(), taskId], (updateErr) => {
      if (updateErr) return console.error(updateErr);
      
      // Auto-trigger next recurring occurrence if necessary
      if (task.isRecurring && task.recurInterval && task.recurUnit) {
        let additionSeconds = 0;
        if (task.recurUnit === 'hour') additionSeconds = task.recurInterval * 3600;
        else if (task.recurUnit === 'day') additionSeconds = task.recurInterval * 86400;
        else if (task.recurUnit === 'week') additionSeconds = task.recurInterval * 86400 * 7;
        else if (task.recurUnit === 'month') additionSeconds = task.recurInterval * 86400 * 30;

        const newCreatedAt = Date.now();
        const nextTaskId = Date.now().toString() + '-recur';
        
        db.run(`INSERT INTO tasks 
          (id, userId, title, durationSeconds, priority, category, createdAt, completed, isRecurring, recurInterval, recurUnit) 
          VALUES (?, ?, ?, ?, ?, ?, createdAt, 0, ?, ?, ?)`,
          [nextTaskId, task.userId, task.title, additionSeconds, task.priority, task.category, newCreatedAt, 1, task.recurInterval, task.recurUnit],
          function(insertErr) {
            if (!insertErr) {
              db.get("SELECT * FROM tasks WHERE id = ?", [nextTaskId], (err, nextTask) => {
                if (!err && nextTask) scheduleTaskTimer(nextTask);
              });
            }
          }
        );
      }

      // Send Web Push notification to user subscriptions
      const payload = {
        title: `🚨 LastMinuteSaver: ${task.title}`,
        body: `Your reminder priority was ${task.priority}. Time is up!`
      };
      
      sendPushNotification(task.userId, payload);
      sendTelegramAndEmailAlerts(task.userId, task);
    });
  });
}

function logSystemNotification(userId, text, type) {
  const notifId = Date.now().toString() + '-' + Math.floor(Math.random() * 100);
  db.run(`INSERT INTO notifications (id, userId, text, type, time) VALUES (?, ?, ?, ?, ?)`, 
    [notifId, userId, text, type || 'system', Date.now()], (err) => {
      if (err) console.error("Error creating system notification log:", err);
    });
}

function sendTelegramAndEmailAlerts(userId, task) {
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return;

    const messageText = `🚨 LastMinuteSaver: Hi ${user.name}, your task "${task.title}" (Priority: ${task.priority}) is due now! Save your schedule!`;

    // 1. Telegram Bot Alert
    if (user.telegramEnabled && user.telegramChatId && task.syncTelegram !== 0 && task.syncTelegram !== false) {
      if (telegramBotToken && telegramBotToken !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegramChatId,
            text: messageText
          })
        })
        .then(res => {
          if (res.ok) console.log(`[Telegram] Sent alert to Chat ID: ${user.telegramChatId}`);
          else console.error(`[Telegram] Failed to send alert. Status: ${res.status}`);
        })
        .catch(err => console.error(`[Telegram] API error:`, err.message));
      } else {
        console.log(`[SIMULATED TELEGRAM] To Chat ID ${user.telegramChatId}: "${messageText}"`);
        logSystemNotification(userId, `💬 [SIMULATED TELEGRAM] Sent to Chat ID ${user.telegramChatId}: "${task.title}"`, 'system');
      }
    }

    // 2. Email Alert
    if (user.emailEnabled && task.syncEmail !== 0 && task.syncEmail !== false) {
      const recipientEmail = user.emailAlert || user.email;
      if (recipientEmail) {
        if (emailTransporter) {
          emailTransporter.sendMail({
            from: `"LastMinuteSaver" <${smtpUser}>`,
            to: recipientEmail,
            subject: `⏰ Task Alert: "${task.title}" is due now!`,
            text: messageText,
            html: `
              <div style="font-family: sans-serif; padding: 20px; background-color: #0f0f11; color: #ffffff; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #00CFCF; margin-top: 0;">⏰ LastMinuteSaver Alarm!</h2>
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>Your task alarm has triggered:</p>
                <div style="background-color: #1a1a1e; padding: 15px; border-left: 4px solid #FF6A00; border-radius: 4px; margin: 15px 0;">
                  <strong style="font-size: 16px;">${task.title}</strong><br/>
                  <span style="font-size: 12px; color: #a0a0a5;">Priority: ${task.priority}</span>
                </div>
                <p style="font-size: 12px; color: #88888b; margin-top: 20px;">This is an automated reminder. Please complete your tasks to stay on streak!</p>
              </div>
            `
          })
          .then(info => console.log(`[SMTP Email] Sent alert to ${recipientEmail}. Message ID: ${info.messageId}`))
          .catch(err => console.error(`[SMTP Email] Failed to send to ${recipientEmail}:`, err.message));
        } else {
          console.log(`[SIMULATED EMAIL] To ${recipientEmail}: "${messageText}"`);
          logSystemNotification(userId, `✉️ [SIMULATED EMAIL] Sent to ${recipientEmail}: "${task.title}"`, 'system');
        }
      }
    }
  });
}

function sendPushNotification(userId, payload) {
  db.all("SELECT * FROM subscriptions WHERE userId = ?", [userId], (err, rows) => {
    if (err) return console.error("Error reading subscriptions:", err);
    rows.forEach(row => {
      const sub = {
        endpoint: row.endpoint,
        keys: {
          auth: row.keys_auth,
          p256dh: row.keys_p256dh
        }
      };
      webpush.sendNotification(sub, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.run("DELETE FROM subscriptions WHERE id = ?", [row.id]);
          }
        });
    });
  });
}

// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/auth/signup', (req, res) => {
  const { email, password, username, gender } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const pHash = hashPassword(password);
  const userId = 'u-' + Date.now();
  const createdAt = Date.now();

  db.run(`INSERT INTO users (id, email, passwordHash, name, gender, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, email, pHash, username, gender || 'Male', createdAt], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email already registered. Try signing in.' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Auto login after sign up
      db.get('SELECT * FROM users WHERE id = ?', [userId], (fetchErr, user) => {
        if (fetchErr || !user) return res.status(500).json({ error: 'User registration failed' });
        req.login(user, (loginErr) => {
          if (loginErr) return res.status(500).json({ error: loginErr.message });
          res.status(201).json(user);
        });
      });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    // If registered via OAuth and doesn't have a password set, initialize it with the one they entered
    if (!user.passwordHash) {
      const newHash = hashPassword(password);
      db.run('UPDATE users SET passwordHash = ? WHERE id = ?', [newHash, user.id], (updateErr) => {
        if (updateErr) console.error("Failed to set password for OAuth user:", updateErr);
      });
      user.passwordHash = newHash;
    }

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) return res.status(500).json({ error: loginErr.message });
      res.json(user);
    });
  });
});

// Google OAuth start
app.get('/api/auth/google', (req, res, next) => {
  if (googleClientId && googleClientSecret && googleClientSecret !== 'YOUR_GOOGLE_CLIENT_SECRET_HERE') {
    passport.authenticate('google', { 
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events'],
      accessType: 'offline',
      prompt: 'consent'
    })(req, res, next);
  } else {
    // Simulated Google OAuth Flow for testing if keys are missing
    console.log("Simulating Google Login Redirect");
    const simulatedUserId = 'u-google-' + Date.now();
    db.run(`INSERT OR IGNORE INTO users (id, email, name, gender, googleConnected, createdAt) 
            VALUES (?, ?, ?, 'Male', 1, ?)`,
            [simulatedUserId, 'testuser@gmail.com', 'Karthik Google', Date.now()], (err) => {
      if (err) console.error("Database insert error during simulated OAuth:", err);
      
      db.get('SELECT * FROM users WHERE id = ? OR email = ?', [simulatedUserId, 'testuser@gmail.com'], (fetchErr, user) => {
        if (fetchErr) return res.status(500).json({ error: fetchErr.message });
        if (!user) return res.status(404).json({ error: 'User could not be created or retrieved' });
        
        req.login(user, (loginErr) => {
          if (loginErr) return res.status(500).json({ error: loginErr.message });
          res.redirect('http://localhost:5173/dashboard');
        });
      });
    });
  }
});

// Google OAuth callback
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/auth' }),
  (req, res) => {
    res.redirect('http://localhost:5173/dashboard');
  }
);

app.get('/api/auth/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    req.session.destroy();
    res.json({ success: true });
  });
});

app.post('/api/auth/profile', checkAuth, (req, res) => {
  const { name, gender, theme, googleConnected, notionConnected, telegramEnabled, telegramChatId, emailEnabled, emailAlert, phone, smsEnabled } = req.body;
  const sql = `UPDATE users SET 
    name = COALESCE(?, name), 
    gender = COALESCE(?, gender), 
    theme = COALESCE(?, theme),
    googleConnected = COALESCE(?, googleConnected),
    notionConnected = COALESCE(?, notionConnected),
    telegramEnabled = COALESCE(?, telegramEnabled),
    telegramChatId = COALESCE(?, telegramChatId),
    emailEnabled = COALESCE(?, emailEnabled),
    emailAlert = COALESCE(?, emailAlert),
    phone = COALESCE(?, phone),
    smsEnabled = COALESCE(?, smsEnabled)
    WHERE id = ?`;
  
  db.run(sql, [
    name, gender, theme, googleConnected, notionConnected, telegramEnabled, telegramChatId, emailEnabled, emailAlert, phone, smsEnabled, req.user.id
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Fetch updated user info to send back
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(user);
    });
  });
});

app.post('/api/auth/profile/send-otp', checkAuth, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  db.run('UPDATE users SET emailOtp = ?, isEmailVerified = 0 WHERE id = ?', [otp, req.user.id], async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    console.log(`[OTP Verification] Generated OTP ${otp} for email ${email}`);

    if (emailTransporter) {
      try {
        await emailTransporter.sendMail({
          from: `"LastMinuteSaver" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Verification Code',
          text: `Hello! Your verification code for LastMinuteSaver is: ${otp}\n\nPlease enter this code in your settings panel to verify your email address.`,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #121212; color: #ffffff;">
                   <h2 style="color: #00CFCF;">LastMinuteSaver Email Verification</h2>
                   <p>Hello!</p>
                   <p>Your verification code is:</p>
                   <div style="font-size: 24px; font-weight: bold; background: #00CFCF/10; color: #00CFCF; padding: 10px 20px; display: inline-block; border: 1px solid #00CFCF/30; border-radius: 8px; margin: 10px 0;">${otp}</div>
                   <p>Please enter this code in your settings panel to verify your email address.</p>
                 </div>`
        });
        res.json({ success: true, message: 'OTP sent to your email.' });
      } catch (sendErr) {
        console.error("Failed to send OTP email:", sendErr);
        res.json({ success: true, message: `OTP generated (Simulated: ${otp}) due to mail delivery failure.` });
      }
    } else {
      res.json({ success: true, message: `OTP generated (Simulated: ${otp}) since SMTP is not configured.` });
    }
  });
});

app.post('/api/auth/profile/verify-otp', checkAuth, (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP code is required.' });

  db.get('SELECT emailOtp FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.emailOtp === otp.trim()) {
      db.run('UPDATE users SET isEmailVerified = 1, emailOtp = NULL WHERE id = ?', [req.user.id], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true, message: 'Email verified successfully!' });
      });
    } else {
      res.json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }
  });
});

// --- GOOGLE CALENDAR & NOTION INTEGRATIONS CONNECT MOCK ---

app.post('/api/integrations/google-calendar/connect', checkAuth, (req, res) => {
  db.run('UPDATE users SET googleConnected = 1 WHERE id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Google Calendar sync active!' });
  });
});

app.get('/api/auth/notion', (req, res) => {
  // Enforce session check so we know who is connecting
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).send('Unauthorized. Please log in first.');
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId || clientId === 'YOUR_NOTION_CLIENT_ID_HERE') {
    return res.status(500).send('Notion Client credentials not configured.');
  }

  // Store user ID in session to retrieve on callback redirect
  req.session.notionUserId = req.user.id;

  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=http://localhost:5000/api/auth/notion/callback`;
  res.redirect(authUrl);
});

app.get('/api/auth/notion/callback', async (req, res) => {
  const { code } = req.query;
  const userId = req.session.notionUserId || (req.user && req.user.id);

  if (!code) {
    return res.redirect('http://localhost:5173/dashboard?notion_error=missing_code');
  }

  if (!userId) {
    return res.status(401).send('Session expired. Please log in to LastMinuteSaver and try again.');
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = 'http://localhost:5000/api/auth/notion/callback';

  try {
    // Exchange Auth Code for Access Token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Notion OAuth] Token exchange failed:', errText);
      return res.redirect('http://localhost:5173/dashboard?notion_error=token_failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Automatically retrieve or create the "LastMinuteSaver Alarms" database page
    let databaseId = null;
    try {
      databaseId = await getOrCreateNotionDatabase(accessToken);
    } catch (dbErr) {
      console.warn('[Notion OAuth] Automatic database creation/retrieval failed:', dbErr.message);
    }

    // Save tokens and connect Notion
    db.run(
      'UPDATE users SET notionConnected = 1, notionToken = ?, notionDatabaseId = ? WHERE id = ?',
      [accessToken, databaseId || '', userId],
      (err) => {
        if (err) {
          console.error('[Notion OAuth] Database update failed:', err.message);
          return res.redirect('http://localhost:5173/dashboard?notion_error=db_failed');
        }
        res.redirect('http://localhost:5173/dashboard?notion_success=true');
      }
    );

  } catch (err) {
    console.error('[Notion OAuth] Callback handler crashed:', err.message);
    res.redirect('http://localhost:5173/dashboard?notion_error=server_error');
  }
});

app.post('/api/integrations/notion/connect', checkAuth, (req, res) => {
  const { notionToken, notionDatabaseId } = req.body;
  if (!notionToken || !notionDatabaseId) {
    return res.status(400).json({ error: 'Notion token and Database ID are required.' });
  }

  const sql = `UPDATE users SET notionConnected = 1, notionToken = ?, notionDatabaseId = ? WHERE id = ?`;
  db.run(sql, [notionToken, notionDatabaseId, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (fetchErr, user) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      res.json(user);
    });
  });
});

// --- VAPID PUBLIC KEY ---
app.get('/api/vapidPublicKey', (req, res) => {
  if (vapidKeys) {
    res.json({ publicKey: vapidKeys.publicKey });
  } else {
    res.status(500).json({ error: 'VAPID keys not generated yet' });
  }
});

// --- PUSH SUBSCRIBE ---
app.post('/api/subscribe', checkAuth, (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }
  const id = Date.now().toString();
  const sql = `INSERT OR IGNORE INTO subscriptions (id, userId, endpoint, keys_auth, keys_p256dh) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [id, req.user.id, subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Subscription saved successfully' });
  });
});

// --- TASKS API ---

app.get('/api/tasks', checkAuth, (req, res) => {
  db.all('SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt ASC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const tasks = rows.map(r => ({
      ...r,
      completed: Boolean(r.completed),
      isRecurring: Boolean(r.isRecurring),
      aiEnabled: Boolean(r.aiEnabled)
    }));
    res.json(tasks);
  });
});

// GET all completed tasks for history filtering
app.get('/api/tasks/completed', checkAuth, (req, res) => {
  db.all('SELECT * FROM tasks WHERE userId = ? AND completed = 1 ORDER BY completedAt DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks', checkAuth, async (req, res) => {
  const { id, title, durationSeconds, priority, category, isRecurring, recurInterval, recurUnit, syncGoogle, syncNotion, syncTelegram, syncEmail, aiEnabled } = req.body;
  const createdAt = Date.now();
  const taskId = id || Date.now().toString(); 

  const sql = `INSERT INTO tasks 
    (id, userId, title, durationSeconds, priority, category, createdAt, completed, isRecurring, recurInterval, recurUnit, syncGoogle, syncNotion, syncTelegram, syncEmail, aiEnabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [
    taskId, req.user.id, title, durationSeconds, priority || 'Medium', category || 'Personal', createdAt, 
    isRecurring ? 1 : 0, recurInterval || null, recurUnit || null,
    syncGoogle === false ? 0 : 1, syncNotion === false ? 0 : 1, syncTelegram === false ? 0 : 1, syncEmail === false ? 0 : 1,
    aiEnabled ? 1 : 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Schedule background alert timer
    const taskObj = { 
      id: taskId, userId: req.user.id, title, durationSeconds, priority, category, createdAt, completed: 0, 
      isRecurring, recurInterval, recurUnit,
      syncGoogle: syncGoogle !== false,
      syncNotion: syncNotion !== false,
      syncTelegram: syncTelegram !== false,
      syncEmail: syncEmail !== false,
      aiEnabled: Boolean(aiEnabled)
    };
    scheduleTaskTimer(taskObj);

    // Sync with Google Calendar if connected
    db.get('SELECT googleConnected, googleAccessToken FROM users WHERE id = ?', [req.user.id], (userErr, user) => {
      if (!userErr && user && user.googleConnected && taskObj.syncGoogle) {
        if (user.googleAccessToken) {
          createGoogleCalendarEvent(req.user.id, taskObj);
        } else {
          console.log(`[SIMULATED CALENDAR EVENT] Added task "${title}" to Google Calendar`);
          logSystemNotification(req.user.id, `📅 [SIMULATED CALENDAR] Added task to Google Calendar: "${title}"`, 'system');
        }
      }
    });

    // Sync with Notion if connected
    db.get('SELECT notionConnected FROM users WHERE id = ?', [req.user.id], (notionErr, userObj) => {
      if (!notionErr && userObj && userObj.notionConnected && taskObj.syncNotion) {
        createNotionTaskPage(req.user.id, taskObj);
      }
    });

    res.status(201).json(taskObj);
  });
});

// ==========================================
// 8. VOICE ASSISTANT ENDPOINT
// ==========================================

// Phase 1: STT with Groq Whisper
app.post('/api/transcribe', checkAuth, upload.single('audio'), async (req, res) => {
  if (!groq) {
    return res.status(500).json({ error: 'Groq API Key not configured in .env' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const newPath = req.file.path + '.webm';
    fs.renameSync(req.file.path, newPath);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "whisper-large-v3",
      response_format: "json",
      language: "en",
    });

    // Clean up temp file safely
    try {
      fs.unlinkSync(newPath);
    } catch (unlinkErr) {
      console.warn("Failed to delete temp file:", unlinkErr.message);
    }

    res.json({ text: transcription.text });
  } catch (error) {
    console.error('Whisper Transcription Error:', error);
    try { 
      if (req.file) fs.unlinkSync(req.file.path); 
      if (req.file) fs.unlinkSync(req.file.path + '.webm'); 
    } catch (e) {}
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

app.post('/api/assistant', checkAuth, async (req, res) => {
  const { text, context } = req.body;
  console.log(`[API] /api/assistant hit with text: "${text}"`);
  if (!text) return res.status(400).json({ error: 'Text prompt is required.' });

  // Get active and completed tasks for prompt context
  db.all('SELECT * FROM tasks WHERE userId = ? AND completed = 0', [req.user.id], (err, tasks) => {
    const activeTasks = err ? [] : tasks;
    db.all('SELECT * FROM tasks WHERE userId = ? AND completed = 1 ORDER BY completedAt DESC LIMIT 50', [req.user.id], (err2, cTasks) => {
      const completedTasks = err2 ? [] : cTasks;
      processAssistantMessage(text, req.user, activeTasks, completedTasks, context)
        .then(result => res.json(result))
        .catch(error => res.status(500).json({ error: error.message }));
    });
  });
});

app.post('/api/chat', checkAuth, async (req, res) => {
  const { prompt, taskId, messages } = req.body;
  if (!prompt || !taskId) return res.status(400).json({ error: 'Prompt and taskId are required.' });

  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [taskId, req.user.id], async (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    try {
      const responseText = await processTaskChat(prompt, req.user, task, messages || []);
      res.json({ text: responseText });
    } catch (err2) {
      res.status(500).json({ error: err2.message });
    }
  });
});

app.put('/api/tasks/:id/modify', checkAuth, (req, res) => {
  const { title, durationSeconds, priority, category, aiEnabled, reason } = req.body;
  
  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const newTitle = title !== undefined ? title : task.title;
    const newDuration = durationSeconds !== undefined ? durationSeconds : task.durationSeconds;
    const newPriority = priority !== undefined ? priority : task.priority;
    const newCategory = category !== undefined ? category : task.category;
    const newAiEnabled = aiEnabled !== undefined ? (aiEnabled ? 1 : 0) : task.aiEnabled;
    const newReason = reason !== undefined ? reason : task.modificationReason;
    
    const sql = `UPDATE tasks SET title = ?, durationSeconds = ?, priority = ?, category = ?, aiEnabled = ?, modificationReason = ? WHERE id = ? AND userId = ?`;
    db.run(sql, [newTitle, newDuration, newPriority, newCategory, newAiEnabled, newReason, req.params.id, req.user.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      // Update timer
      if (activeTimers[req.params.id]) {
        clearTimeout(activeTimers[req.params.id]);
        delete activeTimers[req.params.id];
      }
      
      const updatedTask = { ...task, title: newTitle, durationSeconds: newDuration, priority: newPriority, category: newCategory, aiEnabled: Boolean(newAiEnabled), modificationReason: newReason };
      scheduleTaskTimer(updatedTask);
      
      res.json({ message: 'Task modified successfully', task: updatedTask });
    });
  });
});

app.put('/api/tasks/:id', checkAuth, (req, res) => {
  const { completed, completedAt } = req.body;
  
  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Cancel timer if completed manually
    if (completed && activeTimers[req.params.id]) {
      clearTimeout(activeTimers[req.params.id]);
      delete activeTimers[req.params.id];
    }

    const sql = `UPDATE tasks SET completed = ?, completedAt = ? WHERE id = ? AND userId = ?`;
    db.run(sql, [completed ? 1 : 0, completedAt || null, req.params.id, req.user.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      // If marking as completed and it is recurring, generate the next task
      if (completed && task.isRecurring && task.recurInterval && task.recurUnit) {
        let additionSeconds = 0;
        if (task.recurUnit === 'hour') additionSeconds = task.recurInterval * 3600;
        else if (task.recurUnit === 'day') additionSeconds = task.recurInterval * 86400;
        else if (task.recurUnit === 'week') additionSeconds = task.recurInterval * 86400 * 7;
        else if (task.recurUnit === 'month') additionSeconds = task.recurInterval * 86400 * 30;
        
        const newCreatedAt = Date.now();
        const nextTaskId = Date.now().toString() + '-recur';

        const insertSql = `INSERT INTO tasks 
          (id, userId, title, durationSeconds, priority, category, createdAt, completed, isRecurring, recurInterval, recurUnit) 
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`;
        
        db.run(insertSql, [
          nextTaskId, req.user.id, task.title, additionSeconds, task.priority, task.category, newCreatedAt, 
          1, task.recurInterval, task.recurUnit
        ], function(insertErr) {
          if (!insertErr) {
            db.get("SELECT * FROM tasks WHERE id = ?", [nextTaskId], (err, nextTask) => {
              if (!err && nextTask) scheduleTaskTimer(nextTask);
            });
          }
        });
      }
      
      res.json({ message: 'Task updated successfully' });
    });
  });
});

app.delete('/api/tasks/:id', checkAuth, (req, res) => {
  const reason = req.query.reason || req.body.reason || 'No reason specified';
  
  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err, task) => {
    if (!err && task) {
      logSystemNotification(req.user.id, `🗑️ Cancelled task: "${task.title}". Reason: ${reason}`, 'system');
    }
    
    // Cancel active timer
    if (activeTimers[req.params.id]) {
      clearTimeout(activeTimers[req.params.id]);
      delete activeTimers[req.params.id];
    }
    
    db.run(`DELETE FROM tasks WHERE id = ? AND userId = ?`, [req.params.id, req.user.id], function(deleteErr) {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });
      res.json({ message: 'Task deleted successfully' });
    });
  });
});

app.get('/api/tasks/export/ics', checkAuth, (req, res) => {
  db.all('SELECT * FROM tasks WHERE userId = ? AND completed = 0', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LMLS//Last Minute Life Saver//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:LMLS Tasks\r\n";
    
    rows.forEach(task => {
      const date = new Date(task.createdAt + task.durationSeconds * 1000);
      
      const formatICSDate = (d) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      const dtStamp = formatICSDate(new Date(task.createdAt));
      const dtStart = formatICSDate(date);
      const dtEnd = formatICSDate(new Date(date.getTime() + 1800000));
      
      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:task-${task.id}@lmls.io\r\n`;
      icsContent += `DTSTAMP:${dtStamp}\r\n`;
      icsContent += `DTSTART:${dtStart}\r\n`;
      icsContent += `DTEND:${dtEnd}\r\n`;
      icsContent += `SUMMARY:${task.title}\r\n`;
      icsContent += `DESCRIPTION:LMLS Priority: ${task.priority}. Category: ${task.category}\r\n`;
      icsContent += `STATUS:CONFIRMED\r\n`;
      icsContent += `SEQUENCE:0\r\n`;
      icsContent += "END:VEVENT\r\n";
    });
    
    icsContent += "END:VCALENDAR\r\n";
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=lmls-reminders.ics');
    res.send(icsContent);
  });
});

// --- SUBTASKS API ---

app.get('/api/tasks/:taskId/subtasks', checkAuth, (req, res) => {
  db.all(`SELECT subtasks.* FROM subtasks 
          JOIN tasks ON subtasks.taskId = tasks.id 
          WHERE tasks.id = ? AND tasks.userId = ?`, 
          [req.params.taskId, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks/:taskId/subtasks', checkAuth, (req, res) => {
  const { title } = req.body;
  const subtaskId = Date.now().toString();

  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.taskId, req.user.id], (err, task) => {
    if (err || !task) return res.status(404).json({ error: 'Task not found or unauthorized' });

    db.run(`INSERT INTO subtasks (id, taskId, title, completed) VALUES (?, ?, ?, 0)`,
      [subtaskId, req.params.taskId, title], function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.status(201).json({ id: subtaskId, taskId: req.params.taskId, title, completed: 0 });
      });
  });
});

app.post('/api/tasks/:taskId/subtasks/generate-ai', checkAuth, async (req, res) => {
  const { generateAISubtasks } = require('./assistant');
  
  db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [req.params.taskId, req.user.id], async (err, task) => {
    if (err || !task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    
    try {
      db.run('DELETE FROM subtasks WHERE taskId = ?', [req.params.taskId], async (delErr) => {
        if (delErr) return res.status(500).json({ error: delErr.message });
        
        const list = await generateAISubtasks(task.title);
        const saved = [];
        
        for (const stitle of list) {
          const subtaskId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
          await new Promise((resolve, reject) => {
            db.run(`INSERT INTO subtasks (id, taskId, title, completed) VALUES (?, ?, ?, 0)`,
              [subtaskId, req.params.taskId, stitle], function(insertErr) {
                if (insertErr) reject(insertErr);
                else {
                  saved.push({ id: subtaskId, taskId: req.params.taskId, title: stitle, completed: 0 });
                  resolve();
                }
              });
          });
        }
        res.json(saved);
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to generate AI subtasks' });
    }
  });
});

app.put('/api/subtasks/:id', checkAuth, (req, res) => {
  const { completed } = req.body;

  db.run(`UPDATE subtasks SET completed = ? WHERE id = ?`, 
    [completed ? 1 : 0, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Subtask status updated' });
    });
});

app.delete('/api/subtasks/:id', checkAuth, (req, res) => {
  db.run(`DELETE FROM subtasks WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subtask deleted' });
  });
});

// --- CATEGORIES API ---

app.get('/api/categories', checkAuth, (req, res) => {
  db.all('SELECT * FROM categories WHERE userId = ? OR userId = \'system\'', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', checkAuth, (req, res) => {
  const { name, color } = req.body;
  const id = 'cat-' + Date.now();

  db.run(`INSERT INTO categories (id, userId, name, color) VALUES (?, ?, ?, ?)`, 
    [id, req.user.id, name, color], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, name, color, userId: req.user.id });
    });
});

app.delete('/api/categories/:id', checkAuth, (req, res) => {
  db.run(`DELETE FROM categories WHERE id = ? AND userId = ?`, [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Category deleted successfully' });
  });
});

// --- NOTIFICATIONS API ---

app.get('/api/notifications', checkAuth, (req, res) => {
  db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY time DESC LIMIT 50', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/notifications', checkAuth, (req, res) => {
  const { id, text, type } = req.body;
  const time = Date.now();
  const notifId = id || time.toString();
  
  db.run(`INSERT INTO notifications (id, userId, text, type, time) VALUES (?, ?, ?, ?, ?)`, 
    [notifId, req.user.id, text, type || 'system', time], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: notifId, text, type: type || 'system', time });
  });
});

app.delete('/api/notifications', checkAuth, (req, res) => {
  db.run(`DELETE FROM notifications WHERE userId = ?`, [req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Notifications cleared' });
  });
});

// Serve React frontend in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(frontendPath));
  // React Router catch-all: serve index.html for any non-API route
  // Use app.use (no path) to serve React for ALL non-API routes.
  // This avoids path-to-regexp wildcard syntax issues entirely.
  app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API Server running on port ${PORT}`);
});
