import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAudio, playSound, toggleMute, isMusicMuted, audioManager } from '../src/audio';

// Mock dependencies
vi.mock('../src/game', () => ({
    // Empty
}));

describe('Audio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset local storage mock
        localStorage.clear();
        // Reset module state if possible, but it's hard.
        // We can use toggleMute to set it to known state.
        if (isMusicMuted()) {
            toggleMute();
        }
    });

    it('should initialize audio', () => {
        initAudio();
        // Just checking it doesn't crash and maybe touches localStorage
        expect(localStorage.getItem).toHaveBeenCalledWith('crowdRunnerMute');
    });

    it('should toggle mute', () => {
        // Ensure starting unmuted (handled in beforeEach)
        expect(isMusicMuted()).toBe(false);

        const newState = toggleMute();
        expect(newState).toBe(true);
        expect(isMusicMuted()).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('crowdRunnerMute', 'true');

        toggleMute();
        expect(isMusicMuted()).toBe(false);
    });

    it('should play sound', () => {
        initAudio();
        // Ensure not muted
        if (isMusicMuted()) toggleMute();

        playSound(audioManager.gameStart);

        // playSound clones the node and calls play()
        // Our setup.ts mocks HTMLAudioElement.cloneNode to return 'this' or a clone
        // And mocks play().

        // Since cloneNode returns 'this' in my setup.ts mock:
        // window.HTMLAudioElement.prototype.cloneNode = vi.fn(function() { return this; });
        // The play method on audioManager.gameStart should be called.
        expect(audioManager.gameStart.play).toHaveBeenCalled();
    });

    it('should not play sound if muted', () => {
        initAudio();
        toggleMute(); // Mute

        vi.clearAllMocks(); // Clear previous calls

        playSound(audioManager.gameStart);

        expect(audioManager.gameStart.play).not.toHaveBeenCalled();
    });
});
