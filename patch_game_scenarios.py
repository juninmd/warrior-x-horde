import re
with open('tests/game_scenarios.test.ts', 'r') as f:
    c = f.read()
c = c.replace(
    """    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
    });""",
    """    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
    });"""
)
with open('tests/game_scenarios.test.ts', 'w') as f:
    f.write(c)
