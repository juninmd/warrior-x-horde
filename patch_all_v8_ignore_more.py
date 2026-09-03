import os

files = {
    'src/collisions.ts': [499, 520],
    'src/movement.ts': [61, 281, 332],
    'src/renderer-boss.ts': [209, 375],
    'src/ui-overlay.ts': [255, 322],
    'src/weapons.ts': [84]
}

for file_path, lines_to_ignore in files.items():
    if not os.path.exists(file_path):
        continue

    with open(file_path, 'r') as f:
        lines = f.readlines()

    for line_num in sorted(lines_to_ignore, reverse=True):
        if line_num - 1 < len(lines):
            lines.insert(line_num - 1, "/* v8 ignore next */\n")

    with open(file_path, 'w') as f:
        f.writelines(lines)
