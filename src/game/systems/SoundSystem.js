/**
 * SoundSystem — Procedural audio using Web Audio API.
 * All sounds are generated in real-time with oscillators and noise buffers.
 * No audio files needed. AudioContext is created on first user gesture.
 */
export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;
        this._ambientDrone = null;
        this._ambientGain = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ─── Helper: create a gain node connected to master output ───
    _createGain(volume = 1) {
        const g = this.ctx.createGain();
        g.gain.value = volume * this.sfxVolume * this.masterVolume;
        g.connect(this.ctx.destination);
        return g;
    }

    // ─── Helper: create a white noise buffer ───
    _createNoiseBuffer(duration) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // ─── Helper: play a noise source with optional filter ───
    _playNoise(duration, volume, filterFreq = null, filterType = 'lowpass') {
        const source = this.ctx.createBufferSource();
        source.buffer = this._createNoiseBuffer(duration);

        let node = source;
        if (filterFreq) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.value = filterFreq;
            source.connect(filter);
            node = filter;
        }

        const gain = this._createGain(volume);
        node.connect(gain);

        source.start();
        source.stop(this.ctx.currentTime + duration);
        return source;
    }

    // ══════════════════════════════════════════════
    //  SOUND EFFECTS
    // ══════════════════════════════════════════════

    playClick() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this._createGain(0.15);

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

        gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playThunder() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.5;

        // Noise burst for crack
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + duration);

        const noiseGain = this._createGain(0.3);
        noiseGain.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseSrc.start(t);
        noiseSrc.stop(t + duration);

        // Low rumble oscillator
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + duration);

        const oscGain = this._createGain(0.2);
        oscGain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(oscGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    playExplosion() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.8;

        // Noise burst
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);

        const noiseGain = this._createGain(0.35);
        noiseGain.gain.setValueAtTime(0.35 * this.sfxVolume * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseSrc.start(t);
        noiseSrc.stop(t + duration);

        // Low frequency sweep
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + duration);

        const oscGain = this._createGain(0.25);
        oscGain.gain.setValueAtTime(0.25 * this.sfxVolume * this.masterVolume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(oscGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    playFire() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.3;

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;

        const gain = this._createGain(0.15);

        // Crackling: rapid amplitude modulation
        const lfo = this.ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 30;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.1 * this.sfxVolume * this.masterVolume;
        lfo.connect(lfoGain);

        noiseSrc.connect(filter);
        filter.connect(gain);
        lfoGain.connect(gain.gain);

        gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.start(t);
        lfo.start(t);
        noiseSrc.stop(t + duration);
        lfo.stop(t + duration);
    }

    playEarthquake() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 1.0;

        // Very low rumble
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(30, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.5);
        osc.frequency.linearRampToValueAtTime(20, t + duration);

        const oscGain = this._createGain(0.3);
        oscGain.gain.setValueAtTime(0.001, t);
        oscGain.gain.linearRampToValueAtTime(0.3 * this.sfxVolume * this.masterVolume, t + 0.1);
        oscGain.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, t + 0.8);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(oscGain);
        osc.start(t);
        osc.stop(t + duration);

        // Sub-bass noise layer
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;

        const noiseGain = this._createGain(0.2);
        noiseGain.gain.setValueAtTime(0.001, t);
        noiseGain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume * this.masterVolume, t + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseSrc.start(t);
        noiseSrc.stop(t + duration);
    }

    playPlague() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.6;

        // Eerie high-pitched warble using frequency modulation
        const carrier = this.ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(800, t);

        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = 20;

        const modGain = this.ctx.createGain();
        modGain.gain.value = 200;
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        const gain = this._createGain(0.12);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12 * this.sfxVolume * this.masterVolume, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        carrier.connect(gain);
        carrier.start(t);
        modulator.start(t);
        carrier.stop(t + duration);
        modulator.stop(t + duration);
    }

    playHeal() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.4;

        // Ascending tone C5 (523Hz) to C6 (1047Hz)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.exponentialRampToValueAtTime(1047, t + duration);

        const gain = this._createGain(0.15);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume * this.masterVolume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        osc.start(t);
        osc.stop(t + duration);
    }

    playBless() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;

        // Major chord arpeggio: C5, E5, G5, C6
        const notes = [523, 659, 784, 1047];
        const noteDur = 0.12;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this._createGain(0.12);
            const start = t + i * noteDur;
            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(0.12 * this.sfxVolume * this.masterVolume, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

            osc.connect(gain);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    }

    playCurse() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.6;

        // Descending dissonant tones: tritone interval
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(400, t);
        osc1.frequency.exponentialRampToValueAtTime(100, t + duration);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(566, t); // tritone from 400
        osc2.frequency.exponentialRampToValueAtTime(142, t + duration);

        const gain = this._createGain(0.08);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.08 * this.sfxVolume * this.masterVolume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + duration);
        osc2.stop(t + duration);
    }

    playTornado() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.8;

        // Frequency-modulated whoosh
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, t);
        filter.Q.value = 2;

        // Modulate filter frequency for whoosh effect
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 6;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = this._createGain(0.2);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume * this.masterVolume, t + 0.1);
        gain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, t + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.connect(filter);
        filter.connect(gain);
        noiseSrc.start(t);
        lfo.start(t);
        noiseSrc.stop(t + duration);
        lfo.stop(t + duration);
    }

    playFlood() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const duration = 0.7;

        // White noise with rising then falling lowpass
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.linearRampToValueAtTime(2000, t + 0.3);
        filter.frequency.exponentialRampToValueAtTime(200, t + duration);

        const gain = this._createGain(0.2);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume * this.masterVolume, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noiseSrc.connect(filter);
        filter.connect(gain);
        noiseSrc.start(t);
        noiseSrc.stop(t + duration);
    }

    playNotification() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;

        // Pleasant ding: C5 + E5
        [523, 659].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this._createGain(0.12);
            const start = t + i * 0.05;
            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(0.12 * this.sfxVolume * this.masterVolume, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

            osc.connect(gain);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    playAgeChange() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;

        // Dramatic chord transition: minor → major resolution
        // Am (A3, C4, E4) → F major (F3, A3, C4) → final octave rise
        const chords = [
            { notes: [220, 262, 330], start: 0, dur: 0.35 },
            { notes: [175, 220, 262], start: 0.35, dur: 0.35 },
            { notes: [262, 330, 392, 523], start: 0.7, dur: 0.3 }
        ];

        chords.forEach(chord => {
            chord.notes.forEach(freq => {
                const osc = this.ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;

                const gain = this._createGain(0.1);
                const start = t + chord.start;
                gain.gain.setValueAtTime(0.001, start);
                gain.gain.linearRampToValueAtTime(0.1 * this.sfxVolume * this.masterVolume, start + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, start + chord.dur);

                osc.connect(gain);
                osc.start(start);
                osc.stop(start + chord.dur);
            });
        });
    }

    // ══════════════════════════════════════════════
    //  AMBIENT DRONE (for menu / background)
    // ══════════════════════════════════════════════

    startAmbientDrone() {
        if (!this.ctx || !this.enabled || this._ambientDrone) return;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 60;

        // Second layer a fifth above, very quiet
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 90;

        this._ambientGain = this.ctx.createGain();
        this._ambientGain.gain.value = 0.04 * this.musicVolume * this.masterVolume;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120;

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(this._ambientGain);
        this._ambientGain.connect(this.ctx.destination);

        osc.start();
        osc2.start();

        this._ambientDrone = { osc, osc2 };
    }

    stopAmbientDrone() {
        if (this._ambientDrone) {
            this._ambientDrone.osc.stop();
            this._ambientDrone.osc2.stop();
            this._ambientDrone = null;
            this._ambientGain = null;
        }
    }
}
