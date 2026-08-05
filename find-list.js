const fs = require('fs');

try {
  const data = fs.readFileSync('C:\\Users\\Brian Mubvumbi\\.gemini\\antigravity-ide\\brain\\e69db9a1-e13a-4b0f-8ef3-0f820c7649ad\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = data.split('\n').filter(l => l.trim() !== '');
  
  let listOutputs = [];
  lines.forEach(line => {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'PLANNER_RESPONSE' && obj.content) {
        if (obj.content.toLowerCase().includes('analytics') || obj.content.includes('1.') || obj.content.includes('- ')) {
          listOutputs.push(obj.content);
        }
      }
    } catch (e) {}
  });
  
  console.log(listOutputs.slice(0, 5).map(c => c.substring(0, 500)).join('\n\n---\n\n'));
} catch (err) {
  console.error(err);
}
