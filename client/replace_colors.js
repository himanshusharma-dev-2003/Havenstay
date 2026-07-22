const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (filePath.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsFiles = findJsFiles(srcDir);

for (const filePath of jsFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (filePath.endsWith('UI.js')) continue;

  // About.js specific
  content = content.replace(/background: "#fff"/g, 'background: "var(--color-bg-secondary)"');
  content = content.replace(/background = "#fff"/g, 'background = "var(--color-bg-secondary)"');
  content = content.replace(/background: "#f9f7f3"/g, 'background: "var(--color-bg-primary)"');
  content = content.replace(/background = "#faf8f5"/g, 'background = "var(--color-bg-primary)"');
  content = content.replace(/#1a1a1a/gi, 'var(--color-text-primary)');
  content = content.replace(/#6b6b6b/gi, 'var(--color-text-muted)');
  content = content.replace(/#e0d5c8/gi, 'var(--color-border)');
  
  // Home.js specific tonal shift: make FeaturedHotels primary background so it contrasts with Stats
  if (filePath.endsWith('Home.js')) {
    content = content.replace(/background:"#111009" \}\}>/g, 'background:"var(--color-bg-primary)" }}>');
  }

  // other colors
  content = content.replace(/#0a0806/gi, 'var(--color-bg-primary)');
  content = content.replace(/#111009/gi, 'var(--color-bg-secondary)');
  content = content.replace(/#1a1610/gi, 'var(--color-bg-secondary)');
  content = content.replace(/#fff/gi, 'var(--color-text-primary)');
  content = content.replace(/#FFFFFF/gi, 'var(--color-text-primary)');
  content = content.replace(/#f5efe6/gi, 'var(--color-text-primary)'); 
  content = content.replace(/#9a8e7e/gi, 'var(--color-text-muted)'); 
  
  // borders
  content = content.replace(/rgba\(184,148,63,0\.2\)/g, 'var(--color-border)');

  // hex in rgba backgrounds
  content = content.replace(/rgba\(5,4,3,/g, 'rgba(13,13,18,'); 
  content = content.replace(/rgba\(10,8,6,/g, 'rgba(13,13,18,'); 

  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Colors replaced in all files except UI.js');
