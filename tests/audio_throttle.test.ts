// tests/audio_throttle.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playSound, resetAudio, audioManager } from '../src/audio';

describe('Audio Throttling', () => {
  beforeEach(() => {
    resetAudio();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should prevent playing the same sound multiple times within 80ms', () => {
    // Setup
    const sound = audioManager.powerUp;
    sound.src = 'test_sound.mp3'; // Ensure src key exists
    const playSpy = vi.spyOn(window.HTMLAudioElement.prototype, 'play');

    // First play
    playSound(sound);
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Second play immediately (should be throttled)
    playSound(sound);
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Advance time by 50ms (still within 80ms window)
    vi.advanceTimersByTime(50);
    playSound(sound);
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Advance time by another 40ms (total 90ms, window passed)
    vi.advanceTimersByTime(40);
    playSound(sound);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('should allow playing different sounds immediately', () => {
    const sound1 = audioManager.powerUp;
    sound1.src = 'sound1.mp3';

    const sound2 = audioManager.nerf;
    sound2.src = 'sound2.mp3';

    const playSpy = vi.spyOn(window.HTMLAudioElement.prototype, 'play');

    playSound(sound1);
    expect(playSpy).toHaveBeenCalledTimes(1);

    playSound(sound2);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });
});
