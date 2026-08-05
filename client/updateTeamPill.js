import fs from 'fs';
import path from 'path';

const pagesDir = './src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Team_a
  content = content.replace(/<TeamPill code=\{([^\}]+_a_code)\} name=\{([^\}]+_a_name)\} \/>/g, '<TeamPill code={$1} name={$2} logoUrl={$1.replace("_code", "_logo")} />');
  
  // Replace Team_b
  content = content.replace(/<TeamPill code=\{([^\}]+_b_code)\} name=\{([^\}]+_b_name)\} \/>/g, '<TeamPill code={$1} name={$2} logoUrl={$1.replace("_code", "_logo")} />');

  // Replace generic (Standings/LogStandings)
  content = content.replace(/<TeamPill code=\{([^.]+)\.code\} name=\{([^.]+)\.name\} \/>/g, '<TeamPill code={$1.code} name={$1.name} logoUrl={$1.logo_url} />');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
