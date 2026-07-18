const path = require('path');
const fs = require('fs');

// Load environment variables from parent directory's .env file
const rootEnvPath = path.join(__dirname, '../../.env');
const localEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath, override: true });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath, override: true });
} else {
  require('dotenv').config({ override: true });
}

const { execSync } = require('child_process');

try {
  console.log('🔄 Running Prisma DB Push...');
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true
  });
  console.log('✅ Database schema synchronized successfully.');
} catch (error) {
  console.error('❌ Failed to run prisma db push:', error.message);
  process.exit(1);
}
