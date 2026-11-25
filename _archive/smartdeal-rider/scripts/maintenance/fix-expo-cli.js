const fs = require('fs');
const path = require('path');

const cliExternalsPath = path.resolve(__dirname, 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');

if (fs.existsSync(cliExternalsPath)) {
  let content = fs.readFileSync(cliExternalsPath, 'utf8');
  
  if (!content.includes('.filter(x => !x.includes(":"))')) {
    // We patch the filter function directly to also exclude any modules with ':'
    content = content.replace(
      /\.filter\(\(x\)=>/g,
      '.filter((x)=>!x.includes(":") && '
    );
    
    fs.writeFileSync(cliExternalsPath, content, 'utf8');
    console.log('Successfully patched Expo CLI to fix Windows ":" folder bug with Node 24!');
  } else {
    console.log('Expo CLI is already patched.');
  }
} else {
  console.log('Could not find Expo CLI externals.js file to patch.');
}
