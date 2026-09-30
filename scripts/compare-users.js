const { Client } = require('pg');

async function compareUsers() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const alex = await client.query("SELECT * FROM auth.users WHERE email = 'alex.rivera.apex@gmail.com';");
  const student = await client.query("SELECT * FROM auth.users WHERE email = 'student.apex@gmail.com';");
  console.log('Alex auth.user:', alex.rows[0]);
  console.log('Student auth.user:', student.rows[0]);

  const alexId = await client.query("SELECT * FROM auth.identities WHERE user_id = $1;", [alex.rows[0].id]);
  const studentId = await client.query("SELECT * FROM auth.identities WHERE user_id = $1;", [student.rows[0].id]);
  console.log('Alex identity:', alexId.rows[0]);
  console.log('Student identity:', studentId.rows[0]);

  await client.end();
}

compareUsers();
