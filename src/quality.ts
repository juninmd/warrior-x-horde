export interface QualitySettings {
  enableShadows: boolean;
  particleMultiplier: number; // 0.0 to 1.0
  simplifiedRendering: boolean; // Use simple shapes/colors if true
  maxRenderedSoldiers: number;
}

export class QualityManager {
  private static _instance: QualityManager;

  public settings: QualitySettings = {
    enableShadows: true,
    particleMultiplier: 1.0,
    simplifiedRendering: false,
    maxRenderedSoldiers: 150
  };

  private frameTimes: number[] = [];
  private lastTime: number = 0;
  private lowQualityTriggered: boolean = false;
  private fpsDropFrames: number = 0;
  private manualMode: boolean = false;

  private constructor() {}

  public static getInstance(): QualityManager {
    if (!QualityManager._instance) {
      QualityManager._instance = new QualityManager();
    }
    return QualityManager._instance;
  }

  public setQuality(level: 'low' | 'high' | 'auto'): void {
    if (level === 'auto') {
      this.manualMode = false;
      this.lowQualityTriggered = false;
      // Reset to defaults (High-ish)
      this.settings.enableShadows = true;
      this.settings.particleMultiplier = 1.0;
      this.settings.simplifiedRendering = false;
      this.settings.maxRenderedSoldiers = 150;
      this.fpsDropFrames = 0;
      console.log("Quality set to AUTO");
    } else if (level === 'high') {
      this.manualMode = true;
      this.lowQualityTriggered = false;
      this.settings.enableShadows = true;
      this.settings.particleMultiplier = 1.0;
      this.settings.simplifiedRendering = false;
      this.settings.maxRenderedSoldiers = 250; // Extra high for manual high
      console.log("Quality set to HIGH");
    } else if (level === 'low') {
      this.manualMode = true;
      this.triggerLowQuality();
      console.log("Quality set to LOW");
    }
  }

  public updateFPS(dt: number): void {
    if (this.manualMode) return; // Ignore FPS checks in manual mode
    if (this.lowQualityTriggered) return; // Already low quality

    // Estimate FPS from dt (dt is in ms)
    // Avoid tracking very long pauses
    if (dt > 100) return;

    const fps = 1000 / Math.max(1, dt);

    if (fps < 45) {
      this.fpsDropFrames++;
    } else {
      this.fpsDropFrames = Math.max(0, this.fpsDropFrames - 1);
    }

    // If FPS is bad for ~2 seconds (120 frames)
    if (this.fpsDropFrames > 120) {
      this.triggerLowQuality();
    }
  }

  private triggerLowQuality(): void {
    console.warn("⚠️ Performance degraded. Switching to Low Quality Mode.");
    this.lowQualityTriggered = true;
    this.settings.enableShadows = false;
    this.settings.particleMultiplier = 0.3;
    this.settings.simplifiedRendering = true;
    this.settings.maxRenderedSoldiers = 60;
  }
}
