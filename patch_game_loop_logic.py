import re

with open('tests/game_loop_logic.test.ts', 'r') as f:
    c = f.read()

pattern = r"const rafMock = vi\.fn\(\);"
replacement = "const rafMock = vi.fn((cb) => 1);"
new_c = re.sub(pattern, replacement, c)

with open('tests/game_loop_logic.test.ts', 'w') as f:
    f.write(new_c)
