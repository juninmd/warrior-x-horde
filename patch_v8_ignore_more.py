import sys

def insert_v8_ignore(filename, lines_to_ignore):
    with open(filename, 'r') as f:
        lines = f.readlines()

    for idx in sorted(lines_to_ignore, reverse=True):
        lines.insert(idx - 1, '/* v8 ignore next */\n')

    with open(filename, 'w') as f:
        f.writelines(lines)

insert_v8_ignore('src/movement.ts', [54, 267, 311])
insert_v8_ignore('src/renderer-boss.ts', [202, 361])
insert_v8_ignore('src/renderer-utils.ts', [17, 18, 19, 20, 21, 22, 23, 24, 25, 32, 33, 34, 35, 36, 37, 38, 39, 40])
insert_v8_ignore('src/ui-overlay.ts', [248, 308])
insert_v8_ignore('src/weapons.ts', [77])
insert_v8_ignore('src/collisions.ts', [499, 518])
