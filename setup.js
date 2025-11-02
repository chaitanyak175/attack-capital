#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Attack Capital AMD System...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  .env file not found. Please copy .env.example to .env and configure your environment variables.');
  console.log('   cp .env.example .env\n');
  process.exit(1);
}

// Function to run command and handle errors
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion, '\n');

// Install Node.js dependencies
runCommand('pnpm install', 'Installing Node.js dependencies');

// Generate Prisma client
runCommand('npx prisma generate', 'Generating Prisma client');

// Check if database is accessible and run migrations
try {
  console.log('🗄️  Setting up database...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Database setup completed\n');
} catch (error) {
  console.log('⚠️  Database migration failed. Make sure your DATABASE_URL is correct in .env');
  console.log('   You can run migrations later with: npx prisma migrate dev\n');
}

// Check Python installation
try {
  console.log('🐍 Checking Python installation...');
  const pythonVersion = execSync('python --version', { encoding: 'utf8' });
  console.log('✅ Python found:', pythonVersion.trim());
  
  // Install Python dependencies
  console.log('📦 Installing Python dependencies...');
  execSync('cd python-service && pip install -r requirements.txt', { stdio: 'inherit' });
  console.log('✅ Python dependencies installed\n');
} catch (error) {
  console.log('⚠️  Python not found or pip install failed.');
  console.log('   Please install Python 3.9+ and run: cd python-service && pip install -r requirements.txt\n');
}

// Create necessary directories
const dirs = ['logs', 'uploads', 'python-service/models'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

console.log('\n🎉 Setup completed successfully!\n');

console.log('📋 Next steps:');
console.log('1. Configure your .env file with proper API keys and database URL');
console.log('2. Start the development servers:');
console.log('   • Next.js: pnpm dev');
console.log('   • Python ML service: cd python-service && python app.py');
console.log('3. Open http://localhost:3000 in your browser');
console.log('4. Test with the provided voicemail numbers:\n');
console.log('   • Costco: 1-800-774-2678');
console.log('   • Nike: 1-800-806-6453');
console.log('   • PayPal: 1-888-221-1161\n');

console.log('📚 For more information, see README.md');
console.log('🐛 For issues, check the troubleshooting section in the documentation\n');

console.log('Happy coding! 🚀');
