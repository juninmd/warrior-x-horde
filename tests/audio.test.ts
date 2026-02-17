import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAudio, playSound, toggleMute, isMusicMuted, audioManager, playMusic, stopAllMusic, resetAudio } from '../src/audio';

// Mock dependencies
vi.mock('../src/game', () => ({
    // Empty
}));

describe('Audio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset local storage mock
        localStorage.clear();
        // Reset module state
        resetAudio();
    });

    it('should initialize audio', () => {
        initAudio();
        expect(localStorage.getItem).toHaveBeenCalledWith('crowdRunnerMute');
    });

    it('should handle localStorage error in initAudio', () => {
        const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => {
            throw new Error('Access denied');
        });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        initAudio();

        expect(consoleSpy).toHaveBeenCalledWith('LocalStorage access denied', expect.any(Error));

        consoleSpy.mockRestore();
        getItemSpy.mockRestore();
    });

    it('should toggle mute', () => {
        expect(isMusicMuted()).toBe(false);

        const newState = toggleMute();
        expect(newState).toBe(true);
        expect(isMusicMuted()).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('crowdRunnerMute', 'true');

        // Test muting calls stopAllMusic
        const pauseSpy = vi.spyOn(audioManager.gameMusic, 'pause');
        toggleMute(); // Unmute
        toggleMute(); // Mute again
        expect(pauseSpy).toHaveBeenCalled();
    });

    it('should handle localStorage error in toggleMute', () => {
        const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
            throw new Error('Access denied');
        });

        // Ensure currently unmuted
        if (isMusicMuted()) toggleMute();

        // Should not throw
        expect(() => toggleMute()).not.toThrow();

        setItemSpy.mockRestore();
    });

    it('should play sound', () => {
        if (isMusicMuted()) toggleMute();
        playSound(audioManager.gameStart);
        expect(audioManager.gameStart.play).toHaveBeenCalled();
    });

    it('should handle playSound promise rejection (autoplay block)', async () => {
        if (isMusicMuted()) toggleMute();

        // Mock cloneNode to return a mock that rejects play
        const mockAudio = {
            volume: 1,
            cloneNode: vi.fn().mockReturnThis(),
            play: vi.fn().mockRejectedValue(new Error('Autoplay blocked'))
        } as unknown as HTMLAudioElement;

        // We can't easily replace audioManager properties as they are const in the object,
        // but the object itself is exported.
        // However, playSound calls cloneNode on the passed element.

        await expect(async () => {
            playSound(mockAudio);
            // Wait for promise to settle
            await Promise.resolve();
        }).not.toThrow();
    });

    it('should not play sound if muted', () => {
        toggleMute(); // Mute
        vi.clearAllMocks();
        playSound(audioManager.gameStart);
        expect(audioManager.gameStart.play).not.toHaveBeenCalled();
    });

    it('should play music (normal)', () => {
        if (isMusicMuted()) toggleMute();

        playMusic(false);

        expect(audioManager.gameMusic.play).toHaveBeenCalled();
        expect(audioManager.bossMusic.pause).toHaveBeenCalled();
        expect(audioManager.bossMusic.currentTime).toBe(0);
    });

    it('should play music (boss)', () => {
        if (isMusicMuted()) toggleMute();

        playMusic(true);

        expect(audioManager.bossMusic.play).toHaveBeenCalled();
        expect(audioManager.gameMusic.pause).toHaveBeenCalled();
        expect(audioManager.gameMusic.currentTime).toBe(0);
    });

    it('should handle playMusic rejection', async () => {
        if (isMusicMuted()) toggleMute();

        // Mock play to reject
        const playSpy = vi.spyOn(audioManager.gameMusic, 'play').mockRejectedValueOnce(new Error('Blocked'));

        await expect(async () => {
            playMusic(false);
            await Promise.resolve();
        }).not.toThrow();

        playSpy.mockRestore();
    });

    it('should not play music if muted', () => {
        toggleMute(); // Mute
        vi.clearAllMocks();

        playMusic(false);
        expect(audioManager.gameMusic.play).not.toHaveBeenCalled();
    });

    it('should stop all music', () => {
        stopAllMusic();

        expect(audioManager.gameMusic.pause).toHaveBeenCalled();
        expect(audioManager.bossMusic.pause).toHaveBeenCalled();
        expect(audioManager.gameMusic.currentTime).toBe(0);
        expect(audioManager.bossMusic.currentTime).toBe(0);
    });
});
