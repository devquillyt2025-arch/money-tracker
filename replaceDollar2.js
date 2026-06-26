import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We will look for sequences like: >${ or > ${ or >+${ or >-${ or Income ${ etc
      // It's safer to just split by backticks.
      // Outside backticks, we can replace ${ with ₹{
      
      const parts = content.split('`');
      for (let i = 0; i < parts.length; i++) {
        // Even index means outside backticks (assuming well-formed code)
        if (i % 2 === 0) {
          parts[i] = parts[i].replace(/\$\{/g, '₹{');
          parts[i] = parts[i].replace(/\$/g, '₹');
        } else {
          // Inside backticks
          // We want to replace `\${` with `₹{`? NO! Inside backticks `${` is for interpolation.
          // BUT what if there is a literal dollar sign like `${someVar}` and they want it to show `₹10`?
          // If they want it to show ₹10, they wrote `$${someVar}` initially. But our previous script already replaced the first $ to ₹, so it became `₹${someVar}` which is CORRECT.
          // Wait, look at this line from grep:
          // {isIncome ? '+' : '-'}${entry.amount.toLocaleString('en-IN')}
          // This was probably in a backtick string!
          // Let's check: className={`...`} or just {`...`} ?
          // Oh, wait! `{isIncome ? '+' : '-'}${entry.amount.toLocaleString('en-IN')}`
          // This is a JSX expression: `{isIncome ? '+' : '-'}${entry.amount...}`
          // Yes! So the `$` here is JUST TEXT!
        }
      }
      
      const newContent = parts.join('`');
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceInDir(path.join(process.cwd(), 'src'));
