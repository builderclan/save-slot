const { Client } = require('pg');

async function test() {
  const hosts = [
    'db.dxwumvmscmictbnbfqyb.supabase.co',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com',
  ];

  for (const host of hosts) {
    console.log('Testing host:', host);
    const client = new Client({
      host,
      port: host.includes('pooler') ? 6543 : 5432,
      database: 'postgres',
      user: host.includes('pooler') ? 'postgres.dxwumvmscmictbnbfqyb' : 'postgres',
      password: 'T5fz8KcpVYxRsuQm',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log('CONNECTED SUCCESSFULLY to', host);
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      console.log('Existing tables in public schema:', res.rows.map(r => r.table_name));
      await client.end();
      return host;
    } catch (err) {
      console.log('Failed for', host, ':', err.message);
    }
  }
}

test();
