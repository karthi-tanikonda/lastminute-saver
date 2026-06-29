/**
 * Synthesizes a premium, futuristic reminder chime using the browser's Web Audio API.
 * Uses FM synthesis to create a clean, metallic digital bell tone that decays smoothly.
 */
export function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Carrier oscillator (primary tone)
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(880, now); // A5 (880Hz)
    // Slide down slightly for a softer landing
    carrier.frequency.exponentialRampToValueAtTime(440, now + 1.2); 

    // Modulator oscillator (adds metallic timbre)
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(1320, now); // Fifth harmonic of 880 (1.5x)

    // Modulator gain node (controls depth of frequency modulation)
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(600, now);
    modGain.gain.exponentialRampToValueAtTime(0.1, now + 0.8);

    // Main gain node (volume envelope)
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.4, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    // Connections
    modulator.connect(modGain);
    modGain.connect(carrier.frequency); // Frequency Modulation
    carrier.connect(mainGain);
    mainGain.connect(ctx.destination);

    // Start oscillators
    modulator.start(now);
    carrier.start(now);

    // Stop oscillators
    modulator.stop(now + 1.6);
    carrier.stop(now + 1.6);
  } catch (error) {
    console.error("Failed to play synthesized chime:", error);
  }
}

/**
 * Synthesizes a short, subtle click sound for buttons and interface actions.
 */
export function playClick() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (error) {
    // Ignore context errors
  }
}


