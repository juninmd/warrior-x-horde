import subprocess
import glob

def run_tests():
    files = glob.glob('tests/*.ts')
    for f in files:
        if "setup.ts" in f: continue
        print(f"Running {f}...")
        try:
            result = subprocess.run(['npx', 'vitest', 'run', f], capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                print(f"Failed {f}")
        except subprocess.TimeoutExpired:
            print(f"TIMEOUT: {f}")

if __name__ == "__main__":
    run_tests()
