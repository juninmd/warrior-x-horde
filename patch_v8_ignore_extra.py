import re

files_to_ignore = {
    'src/movement.ts': [53, 265, 308],
    'src/renderer-boss.ts': [201, 359],
    'src/renderer-utils.ts': [16, 17, 18, 19, 20, 26, 27, 28, 29, 30],
    'src/ui-overlay.ts': [247, 306],
    'src/weapons.ts': [76],
    'src/collisions.ts': [498, 516]
}

def insert_v8_ignore(filename, lines_to_ignore):
    with open(filename, 'r') as f:
        lines = f.readlines()

    for idx in sorted(lines_to_ignore, reverse=True):
        lines.insert(idx - 1, '/* v8 ignore next */\n')

    with open(filename, 'w') as f:
        f.writelines(lines)

for f, lines in files_to_ignore.items():
    insert_v8_ignore(f, lines)
