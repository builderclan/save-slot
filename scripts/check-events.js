const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.dxwumvmscmictbnbfqyb',
    password: 'T5fz8KcpVYxRsuQm',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const res = await c.query("SELECT id, title, start_time, end_time, status, campus_id FROM events ORDER BY start_time;");
  console.log('Total events in DB:', res.rows.length);
  for (const r of res.rows) {
    console.log(`- ${r.title} | ${r.start_time.toISOString()} | status: ${r.status}`);
  }
  await c.end();
}

main().catch(console.error);
