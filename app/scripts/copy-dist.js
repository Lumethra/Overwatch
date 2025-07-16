const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

const tauriConfig = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const productName = tauriConfig.productName;

const portableFilename = `${productName}_${version}_x64_portable.exe`;

console.log(`Copying build artifacts to dist folder...`);
console.log(`Portable executable will be named: ${portableFilename}`);

if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist');

const bundleDir = 'src-tauri/target/release/bundle';
if (fs.existsSync(bundleDir)) {
    const bundleItems = fs.readdirSync(bundleDir);
    bundleItems.forEach(item => {
        const srcPath = path.join(bundleDir, item);
        const destPath = path.join('dist', item);
        fs.cpSync(srcPath, destPath, { recursive: true });
    });
}

// Create portable folder and copy the executable there
const exePath = 'src-tauri/target/release/app.exe';
if (fs.existsSync(exePath)) {
    const portableDir = path.join('dist', 'portable');
    fs.mkdirSync(portableDir, { recursive: true });
    fs.copyFileSync(exePath, path.join(portableDir, portableFilename));
}

console.log('Build artifacts copied successfully!');
