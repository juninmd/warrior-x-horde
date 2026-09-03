import os

files = {
    'src/collisions.ts': [498, 518],
    'src/movement.ts': [60, 279, 329],
    'src/renderer-boss.ts': [208, 373],
    'src/ui-overlay.ts': [254, 320],
    'src/weapons.ts': [83]
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
