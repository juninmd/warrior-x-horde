import re

with open('vite.config.ts', 'r') as f:
    c = f.read()

c = re.sub(r'lines: 99,', 'lines: 99,', c)
c = re.sub(r'functions: 99,', 'functions: 99,', c)
c = re.sub(r'branches: 98,', 'branches: 98,', c)
c = re.sub(r'statements: 99,', 'statements: 99,', c)

with open('vite.config.ts', 'w') as f:
    f.write(c)
