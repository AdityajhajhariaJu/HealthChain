import { AmbientSyncEngine } from './AmbientSyncEngine';

export class PsychoacousticEngine {
  private static context: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static oscLeft: OscillatorNode | null = null;
  private static oscRight: OscillatorNode | null = null;
  private static initialized = false;
  private static biometricInterval: any = null;

  static async initialize() {
    if (this.initialized) return;
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0; // Start completely silent
      this.masterGain.connect(this.context.destination);

      // Left Ear - 432 Hz (Healing frequency)
      this.oscLeft = this.context.createOscillator();
      this.oscLeft.type = 'sine';
      this.oscLeft.frequency.value = 432;
      const panLeft = this.context.createStereoPanner();
      panLeft.pan.value = -1;
      this.oscLeft.connect(panLeft).connect(this.masterGain);

      // Right Ear - 436 Hz (4 Hz difference = Delta wave)
      this.oscRight = this.context.createOscillator();
      this.oscRight.type = 'sine';
      this.oscRight.frequency.value = 436;
      const panRight = this.context.createStereoPanner();
      panRight.pan.value = 1;
      this.oscRight.connect(panRight).connect(this.masterGain);

      this.oscLeft.start();
      this.oscRight.start();
      this.initialized = true;

      // Start the biometric listener loop
      this.startBiometricLoop();
    } catch (e) {
      console.error('PsychoacousticEngine failed to initialize:', e);
    }
  }

  static stopBiometricLoop() {
    if (this.biometricInterval) {
      clearInterval(this.biometricInterval);
      this.biometricInterval = null;
    }
  }

  static async startBiometricLoop() {
    this.stopBiometricLoop();
    this.biometricInterval = setInterval(async () => {
      if (!this.context || !this.masterGain) return;
      
      const biometrics = await AmbientSyncEngine.pullLiveBiometrics();
      // If HRV is low (stress high), we increase the binaural volume
      // Normal HRV is ~50+. Let's say if it drops below 40, we fade in.
      const targetVolume = (biometrics?.hrv && biometrics.hrv < 45) ? 0.15 : 0; // 15% volume max

      // Smoothly ramp the volume over 10 seconds so it's subconscious
      this.masterGain.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + 10);
    }, 15000); // Check every 15 seconds
  }

  static triggerManualCalm() {
    if (!this.initialized) this.initialize();
    if (this.context?.state === 'suspended') this.context.resume();
    
    // Ramp up to 25% volume for an acute calm-down session
    if (this.masterGain && this.context) {
      this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.25, this.context.currentTime + 5);
      
      // Auto fade out after 60 seconds
      setTimeout(() => {
        if (this.masterGain && this.context) {
          this.masterGain.gain.linearRampToValueAtTime(0, this.context.currentTime + 15);
        }
      }, 60000);
    }
  }
}