import pg from 'pg'

const ref = 'wzajwzuagtereqdgkyxn'
const regions = [
  'sa-east-1', 'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1',
  'ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'ca-central-1',
]

async function probe() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`
    const client = new pg.Client({
      host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${ref}`,
      password: 'probe-test',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    try {
      await client.connect()
      console.log('CONNECTED', region)
      await client.end()
    } catch (err) {
      const msg = err.message
      if (msg.includes('password authentication failed')) {
        console.log('FOUND REGION (needs password):', region)
      } else if (msg.includes('tenant') || msg.includes('ENOTFOUND')) {
        console.log('skip', region, msg.slice(0, 60))
      } else {
        console.log('other', region, msg.slice(0, 100))
      }
    }
  }
}

probe()
