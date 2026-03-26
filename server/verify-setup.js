#!/usr/bin/env node

/**
 * SQUARE BACKEND - SETUP VERIFICATION SCRIPT
 * 
 * Run this before starting the backend to verify everything is configured correctly.
 * Usage: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SQUARE BACKEND SETUP VERIFICATION\n');

let allGood = true;

// Check 1: .env file exists
console.log('1. Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('   ❌ .env file not found!');
  console.log('   📝 Create .env file with your Square credentials');
  allGood = false;
} else {
  console.log('   ✅ .env file exists');
  
  // Check 2: Required Square credentials
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const requiredVars = [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_LOCATION_ID',
    'SQUARE_APPLICATION_ID',
    'SQUARE_ENVIRONMENT'
  ];
  
  console.log('\n2. Checking Square credentials...');
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=put_`)) {
      console.log(`   ✅ ${varName} configured`);
    } else {
      console.log(`   ❌ ${varName} not configured`);
      console.log(`      Add this to .env: ${varName}=your_value_here`);
      allGood = false;
    }
  });
}

// Check 3: TypeScript files exist
console.log('\n3. Checking TypeScript source files...');
const requiredFiles = [
  'src/server.ts',
  'src/config/squareClient.ts',
  'src/services/squareService.ts',
  'src/controllers/squareController.ts',
  'src/routes/squareRoutes.ts',
  'src/types/square.ts',
  'src/utils/logger.ts',
  'src/utils/inMemoryDB.ts'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} not found`);
    allGood = false;
  }
});

// Check 4: package.json has required scripts
console.log('\n4. Checking npm scripts...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const scripts = packageJson.scripts || {};
  
  if (scripts['square:dev']) {
    console.log('   ✅ npm run square:dev available');
  } else {
    console.log('   ⚠️  square:dev script not found in package.json');
  }
  
  if (scripts['square:build']) {
    console.log('   ✅ npm run square:build available');
  } else {
    console.log('   ⚠️  square:build script not found in package.json');
  }
} else {
  console.log('   ❌ package.json not found');
  allGood = false;
}

// Check 5: node_modules exists
console.log('\n5. Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ Dependencies installed (node_modules exists)');
} else {
  console.log('   ⚠️  Dependencies not installed');
  console.log('      Run: npm install');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ ALL CHECKS PASSED!\n');
  console.log('You can now run: npm run square:dev\n');
} else {
  console.log('⚠️  SOME ISSUES FOUND\n');
  console.log('Please fix the issues above, then run this script again.\n');
  console.log('Most common issues:');
  console.log('1. Missing .env file → Create one with Square credentials');
  console.log('2. Credentials not set → Fill in the values from Square Dashboard');
  console.log('3. Dependencies not installed → Run: npm install\n');
}
console.log('='.repeat(50) + '\n');

process.exit(allGood ? 0 : 1);
