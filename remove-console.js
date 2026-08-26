const fs = require('fs');
const path = require('path');

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts with console.
    if (trimmed.startsWith('console.log(') ||
        trimmed.startsWith('console.error(') ||
        trimmed.startsWith('console.warn(') ||
        trimmed.startsWith('console.info(') ||
        trimmed.startsWith('console.debug(')) {

      // If the console statement is complete on this line (ends with );)
      if (trimmed.endsWith(');') || trimmed.endsWith(')')) {
        // Skip this line entirely
        i++;
        continue;
      } else {
        // Multi-line console statement - skip until we find the closing );
        while (i < lines.length) {
          const currentLine = lines[i].trim();
          i++;
          if (currentLine.endsWith(');') || currentLine.endsWith(')')) {
            break;
          }
        }
        continue;
      }
    }

    // Keep this line
    result.push(lines[i]);
    i++;
  }

  // Write back
  fs.writeFileSync(filePath, result.join('\n'), 'utf8');
  console.log(`✅ Cleaned: ${filePath}`);
}

const files = [
  './components/mintButton.tsx',
  './pages/index.tsx',
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    removeConsoleLogs(fullPath);
  } else {
    console.log(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\n✅ All console logs removed!');
