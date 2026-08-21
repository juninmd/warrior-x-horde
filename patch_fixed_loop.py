import re

with open('tests/fixed_loop.test.ts', 'r') as f:
    c = f.read()

# Replace the specific window.requestAnimationFrame mock
pattern = r"requestAnimationFrameMock = vi\.fn\(\);"
replacement = "requestAnimationFrameMock = vi.fn((cb) => 1);"

new_c = re.sub(pattern, replacement, c)

with open('tests/fixed_loop.test.ts', 'w') as f:
    f.write(new_c)
