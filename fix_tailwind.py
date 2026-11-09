import re

with open('tailwind.config.js', 'r') as f:
    content = f.read()

# Remove duo object and accent line, keeping secondary
pattern = r"duo: \{[^}]+\},\n\s*accent: '#ffc800',\n"
replacement = ''
content = re.sub(pattern, replacement, content)

with open('tailwind.config.js', 'w') as f:
    f.write(content)

print('Done')
with open('tailwind.config.js', 'r') as f:
    for i, line in enumerate(f, 1):
        if 'secondary' in line or 'error' in line or 'outline' in line or 'duo' in line or 'accent' in line:
            print(f'{i}: {line.rstrip()}')
