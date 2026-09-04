const fs = require('fs');
const path = require('path');

function getAllFiles(dir, ext = '.ts') {
  let res = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      res = res.concat(getAllFiles(p, ext));
    } else if (file.endsWith(ext)) {
      res.push(p);
    }
  });
  return res;
}

const files = getAllFiles('apps/api/src');
console.log(`Found ${files.length} TypeScript files.`);

const issues = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), file);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check 1: Potential unsafe split without optional chaining or null check
    // e.g., customer.name.split(' ') or r.full_name.split(' ') when full_name can be undefined
    const splitMatch = line.match(/([a-zA-Z0-9_]+)\.split\(/);
    if (splitMatch && !line.includes('?.split') && !line.includes('typeof') && !line.includes('||')) {
      const varName = splitMatch[1];
      if (!['month', 'months', 'origin', 'today', 'disburseDate', 'openingDateStr', 'date', 'process'].includes(varName)) {
        issues.push({ file: relPath, line: lineNum, type: 'Potential unsafe split', code: line.trim() });
      }
    }

    // Check 2: Potential NaN from parseInt or Number without fallback
    // e.g. parseInt(...) without checking isNaN or default
    if (line.includes('parseInt(') && !line.includes('||') && !line.includes('isNaN')) {
      issues.push({ file: relPath, line: lineNum, type: 'Unsafe parseInt', code: line.trim() });
    }

    // Check 3: Check for empty catch blocks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      issues.push({ file: relPath, line: lineNum, type: 'Empty catch block', code: line.trim() });
    }

    // Check 4: Check for missing return in controller handlers
    if (line.includes('@Get(') || line.includes('@Post(') || line.includes('@Patch(') || line.includes('@Put(') || line.includes('@Delete(')) {
      // Find method body
      let methodBody = '';
      let braceCount = 0;
      let started = false;
      for (let i = idx + 1; i < Math.min(lines.length, idx + 100); i++) {
        const l = lines[i];
        if (l.includes('{')) {
          braceCount += (l.match(/\{/g) || []).length;
          started = true;
        }
        if (l.includes('}')) {
          braceCount -= (l.match(/\}/g) || []).length;
        }
        methodBody += l + '\n';
        if (started && braceCount <= 0) break;
      }
      if (started && !methodBody.includes('return ') && !methodBody.includes('throw ') && !methodBody.includes('res.send(') && !methodBody.includes('res.json(')) {
        issues.push({ file: relPath, line: lineNum, type: 'Controller endpoint with no return or throw', code: line.trim() });
      }
    }

    // Check 5: Look for unhandled promise rejection in pool.query or async operations
    if (line.includes('this.pool.query') && !line.includes('await') && !line.includes('.catch(') && !line.includes('return this.pool.query')) {
      issues.push({ file: relPath, line: lineNum, type: 'Floating pool.query without await or catch', code: line.trim() });
    }

    // Check 6: Check for any duplicate route definitions in controller
  });
});

console.log(`Scan completed. Found ${issues.length} potential issues:`);
issues.forEach(i => console.log(`[${i.type}] ${i.file}:${i.line} -> ${i.code}`));
