import bcrypt from 'bcrypt';

const password = 'superadmin123';
const hash = await bcrypt.hash(password, 12);
console.log(hash);