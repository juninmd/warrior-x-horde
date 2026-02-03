import { QualityManager } from './quality';

interface GameSettings {
  hapticsEnabled: boolean;
  masterVolume: number;
  quality: 'auto' | 'low' | 'high';
  soundEnabled: boolean;
}

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: GameSettings;

  private constructor() {
    this.settings = this.loadSettings();
    // Apply quality immediately on load
    QualityManager.getInstance().setQuality(this.settings.quality);
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private loadSettings(): GameSettings {
    try {
      const stored = localStorage.getItem('crowdRunnerSettings');
      if (stored) {
        return { ...this.defaultSettings(), ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    return this.defaultSettings();
  }

  private defaultSettings(): GameSettings {
    return {
      hapticsEnabled: true,
      masterVolume: 1.0,
      quality: 'auto',
      soundEnabled: true
    };
  }

  public saveSettings(): void {
    try {
      localStorage.setItem('crowdRunnerSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  get hapticsEnabled(): boolean { return this.settings.hapticsEnabled; }
  set hapticsEnabled(v: boolean) { this.settings.hapticsEnabled = v; this.saveSettings(); }

  get quality(): 'auto' | 'low' | 'high' { return this.settings.quality; }
  set quality(v: 'auto' | 'low' | 'high') {
    this.settings.quality = v;
    QualityManager.getInstance().setQuality(v);
    this.saveSettings();
  }

  get soundEnabled(): boolean { return this.settings.soundEnabled; }
  set soundEnabled(v: boolean) { this.settings.soundEnabled = v; this.saveSettings(); }
}
