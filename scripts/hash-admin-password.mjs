import { randomBytes, scryptSync } from 'node:crypto';

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
  process.stderr.write('Run this command in an interactive terminal so the password is not echoed.\n');
  process.exit(1);
}

const input = process.stdin;
input.setRawMode(true);
input.resume();
process.stdout.write('Administrator password (input hidden): ');
let password = '';

input.on('data', (chunk) => {
  for (const byte of chunk) {
    if (byte === 3) {
      process.stdout.write('\nCancelled.\n');
      input.setRawMode(false);
      process.exit(130);
    }
    if (byte === 13 || byte === 10) {
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (password.length < 16 || password.length > 1024) {
        password = '';
        process.stderr.write('Use an administrator password between 16 and 1024 characters.\n');
        process.exitCode = 1;
        return;
      }
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
      password = '';
      process.stdout.write(`BRASS_ADMIN_PASSWORD_HASH=scrypt$16384$8$1$${salt}$${hash}\n`);
      process.exit();
    }
    if (byte === 127 || byte === 8) password = password.slice(0, -1);
    else if (byte >= 32) password += String.fromCharCode(byte);
  }
});
