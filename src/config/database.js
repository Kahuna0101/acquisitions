import 'dotenv/config';

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Configure for Neon Local in development
if (process.env.NODE_ENV === 'development') {
  // Use HTTP-based communication for Neon Local
  neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}
// Production uses default Neon Cloud configuration (WebSocket over HTTPS)

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

export { db, sql };
