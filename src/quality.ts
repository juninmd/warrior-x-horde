export interface QualitySettings {
  enableShadows: boolean;
  enablePostProcessing: boolean;
  enableTrails: boolean;
  particleMultiplier: number; // 0.0 to 1.0
  simplifiedRendering: boolean; // Use simple shapes/colors if true
  maxRenderedSoldiers: number;
  resolutionScale: number; // Dynamic resolution scaling (0.5 to 1.0)
  powerSavingMode: boolean; // Cap FPS to 30 and reduce effects
}

export class QualityManager {
  private static _instance: QualityManager;

  public settings: QualitySettings = {
    enableShadows: true,
    enablePostProcessing: true,
    enableTrails: true,
    particleMultiplier: 1.0,
    simplifiedRendering: false,
    maxRenderedSoldiers: 150,
    resolutionScale: 1.0,
    powerSavingMode: false
  };

  private frameTimes: number[] = [];
  private lastTime: number = 0;
  public lowQualityTriggered: boolean = false;
  private fpsDropFrames: number = 0;
  private recoveryFrames: number = 0;
  private manualMode: boolean = false;
  private isMobile: boolean = false;

  private constructor() {
    if (typeof navigator !== 'undefined') {
       this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    if (this.isMobile) {
        // Default slightly lower for mobile to ensure 60fps start, but keep particles visible enough
        this.settings.particleMultiplier = 0.6;
        this.settings.enableShadows = false;
        this.settings.enablePostProcessing = false;
        this.settings.resolutionScale = 0.65;
        this.settings.maxRenderedSoldiers = 100;
    }
  }

  public static getInstance(): QualityManager {
    if (!QualityManager._instance) {
      QualityManager._instance = new QualityManager();
    }
    return QualityManager._instance;
  }

  /* v8 ignore start */
  public static resetInstance(): void {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (QualityManager as any)._instance = undefined;
  }
  /* v8 ignore stop */

  public setQuality(level: 'low' | 'high' | 'auto'): void {
    if (level === 'auto') {
      this.manualMode = false;
      this.lowQualityTriggered = false;
      // Reset to defaults (High-ish)
      this.settings.enableShadows = !this.isMobile;
      this.settings.enablePostProcessing = !this.isMobile;
      this.settings.enableTrails = true;
      this.settings.particleMultiplier = this.isMobile ? 0.6 : 1.0;
      this.settings.simplifiedRendering = false;
      this.settings.maxRenderedSoldiers = this.isMobile ? 100 : 150;
      this.settings.resolutionScale = this.isMobile ? 0.65 : 1.0;
      this.fpsDropFrames = 0;
      console.log("Quality set to AUTO");
    } else if (level === 'high') {
      this.manualMode = true;
      this.lowQualityTriggered = false;
      this.settings.enableShadows = true;
      this.settings.enablePostProcessing = true;
      this.settings.enableTrails = true;
      this.settings.particleMultiplier = 1.0;
      this.settings.simplifiedRendering = false;
      this.settings.maxRenderedSoldiers = 250; // Extra high for manual high
      this.settings.resolutionScale = 1.0;
      console.log("Quality set to HIGH");
    } else if (level === 'low') {
      this.manualMode = true;
      this.triggerLowQuality();
      /* v8 ignore next */
      console.log("Quality set to LOW");
    }
  }

  public updateFPS(dt: number): void {
    if (this.manualMode) return; // Ignore FPS checks in manual mode
    if (this.lowQualityTriggered) return; // Already low quality

    // Estimate FPS from dt (dt is in ms)
    // Ignora apenas travadas reais (aba em segundo plano, GC longo). O limite
    // anterior de 100ms descartava todo quadro abaixo de 10fps — justamente o
    // cenário em que a queda automática de qualidade precisa disparar.
    if (dt > 1000) return;

    const fps = 1000 / Math.max(1, dt);

    if (fps < 45) {
      // Pondera pelo tempo decorrido: o gatilho passa a significar ~2s de queda
      // real, independentemente de quantos quadros couberam nesse intervalo.
      this.fpsDropFrames += Math.max(1, dt / 16.67);
    } else {
      this.fpsDropFrames = Math.max(0, this.fpsDropFrames - 1);
    }

    // If FPS is bad for ~2 seconds (120 frames)
    // On mobile, trigger faster (0.5s / 30 frames) to save battery/UX
    const threshold = this.isMobile ? 30 : 120;
    if (this.fpsDropFrames > threshold) {
      /* v8 ignore next */
      this.triggerLowQuality();
    }
  }

  public checkRecovery(dt: number): void {
      if (this.manualMode) return;
      if (!this.lowQualityTriggered) return;

      if (dt > 100) return; // Skip massive lags
      const fps = 1000 / Math.max(1, dt);

      if (fps > 55) {
          this.recoveryFrames++;
      } else if (fps < 50) {
          // Reset if it dips again
          this.recoveryFrames = 0;
      }

      // If stable for 5 seconds (approx 300 frames)
      if (this.recoveryFrames > 300) {
          this.restoreQuality();
      }
  }

  private restoreQuality(): void {
      console.log("✅ Performance stabilized. Restoring Quality.");
      this.lowQualityTriggered = false;
      this.recoveryFrames = 0;
      this.fpsDropFrames = 0;

      this.settings.enableShadows = !this.isMobile;
      this.settings.enablePostProcessing = !this.isMobile;
      this.settings.enableTrails = true;
      this.settings.particleMultiplier = this.isMobile ? 0.6 : 1.0;
      this.settings.simplifiedRendering = false;
      this.settings.maxRenderedSoldiers = this.isMobile ? 100 : 150;
      this.settings.resolutionScale = this.isMobile ? 0.65 : 1.0;

      /* v8 ignore start */
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
      }
      /* v8 ignore stop */
  }

  private triggerLowQuality(): void {
    console.warn("⚠️ Performance degraded. Switching to Low Quality Mode.");
    this.lowQualityTriggered = true;
    this.settings.enableShadows = false;
    this.settings.enablePostProcessing = false;
    this.settings.enableTrails = false;
    this.settings.particleMultiplier = 0.3;
    this.settings.simplifiedRendering = true;
    this.settings.maxRenderedSoldiers = 60;
    this.settings.resolutionScale = this.isMobile ? 0.65 : 0.85; // Lower resolution to save fill-rate

    // Trigger resize to apply resolution change if needed
    /* v8 ignore start */
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
    }
    /* v8 ignore stop */
  }
}
