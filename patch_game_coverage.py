with open('tests/game_coverage.test.ts', 'r') as f:
    c = f.read()

c = c.replace(
    """describe('Game Coverage', () => {""",
    """vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => 1);\n\ndescribe('Game Coverage', () => {"""
)
with open('tests/game_coverage.test.ts', 'w') as f:
    f.write(c)
