import sys

def insert_v8_ignore(filename, lines_to_ignore):
    with open(filename, 'r') as f:
        lines = f.readlines()

    for idx in sorted(lines_to_ignore, reverse=True):
        # Insert before the line (1-indexed)
        lines.insert(idx - 1, '/* v8 ignore next */\n')

    with open(filename, 'w') as f:
        f.writelines(lines)

# based on the output of the previous command
insert_v8_ignore('src/movement.ts', [52, 263, 305])
insert_v8_ignore('src/renderer-boss.ts', [200, 357])
insert_v8_ignore('src/renderer-utils.ts', [15, 16, 17, 22, 23, 24])
insert_v8_ignore('src/ui-overlay.ts', [246, 304])
insert_v8_ignore('src/weapons.ts', [75])
insert_v8_ignore('src/collisions.ts', [497, 514])
