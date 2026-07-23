const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the Vault password you want to hash: ', async (password) => {
  if (!password) {
    console.error('Password cannot be empty.');
    rl.close();
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('\nSuccess! Copy the hash below into your .env file as VAULT_PASSWORD_HASH:\n');
    console.log(hash);
    console.log('\nNote: This is a bcrypt hash. It is safe to store in your .env file.');
  } catch (err) {
    console.error('Error generating hash:', err);
  } finally {
    rl.close();
  }
});
