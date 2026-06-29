// Force voices to load early in the browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  // Trigger initial load
  window.speechSynthesis.getVoices();
}

let _activeUtterance = null;

function registerUtterance(utt, onEndCb) {
  _activeUtterance = utt;
  utt.onend = () => {
    _activeUtterance = null;
    if (onEndCb) onEndCb();
  };
  utt.onerror = () => {
    _activeUtterance = null;
    if (onEndCb) onEndCb();
  };
}

/**
 * Uses the Web Speech API (SpeechSynthesis) to select the sweetest, most pleasant female voice available.
 */
function getSweetFemaleVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  
  // Prioritized list of premium, pleasant female voices
  const preferredNames = [
    'Microsoft Jenny Online',
    'Microsoft Aria Online',
    'Google US English',
    'Samantha',
    'Microsoft Zira',
    'Hazel',
    'Google UK English Female'
  ];

  for (const name of preferredNames) {
    const found = voices.find(v => v.name.includes(name));
    if (found) return found;
  }

  // Fallback to any english female voice
  return voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google'))
  ) || voices[0];
}

/**
 * Gets the polite honorific based on the user's gender (Sir or Madam)
 */
function getHonorific(userProfile) {
  const gender = (userProfile?.gender || 'Male').toLowerCase();
  return gender === 'female' ? 'Madam' : 'Sir';
}

/**
 * Speaks an alarm notification when a task expires.
 */
export function speakReminder(taskText, userProfile = { gender: 'Male' }) {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }

  try { window.speechSynthesis.cancel(); } catch (e) {}
  const honorific = getHonorific(userProfile);

  const phrases = [
    `Excuse me ${honorific}! This is your Last Minute Life Saver. It's time to ${taskText}!`,
    `Attention please, ${honorific}. It is time to ${taskText}!`,
    `Reminder check, ${honorific}: Time to ${taskText}.`,
    `Hey there ${honorific}! Don't forget, you need to ${taskText} now!`
  ];

  const textToSpeak = phrases[Math.floor(Math.random() * phrases.length)];
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  
  const voice = getSweetFemaleVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.95; 
  utterance.pitch = 1.05;
  registerUtterance(utterance);
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks a personal assistant task capture confirmation.
 */
export function speakTaskCaptured(taskTitle, userProfile = { gender: 'Male' }, askWorkspaces = false) {
  if (!('speechSynthesis' in window)) return;

  try { window.speechSynthesis.cancel(); } catch (e) {}
  const honorific = getHonorific(userProfile);

  let textToSpeak = `Task captured, ${honorific}. `;
  if (askWorkspaces) {
    textToSpeak += `Would you like to sync this to your connected workspaces? Please select them manually below, or just say which ones.`;
  } else {
    const confirmations = [
      `Understood, ${honorific}. I have successfully added your task: ${taskTitle}.`,
      `Got it, ${honorific}. I have scheduled the reminder: ${taskTitle}.`,
      `Task captured, ${honorific}. I will notify you when it's time for: ${taskTitle}.`,
      `Your personal assistant alarm has been set, ${honorific}, for: ${taskTitle}.`
    ];
    textToSpeak = confirmations[Math.floor(Math.random() * confirmations.length)];
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  
  const voice = getSweetFemaleVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.98;
  utterance.pitch = 1.05;
  registerUtterance(utterance);

  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks an arbitrary text response from Laila.
 */
export function speakText(text, userProfile = { gender: 'Male' }, onEndCallback = null) {
  if (!('speechSynthesis' in window)) {
    if (onEndCallback) onEndCallback();
    return;
  }

  try { window.speechSynthesis.cancel(); } catch (e) {}
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSweetFemaleVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.98;
  utterance.pitch = 1.05;

  registerUtterance(utterance, onEndCallback);
  window.speechSynthesis.speak(utterance);
}
