process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ??= 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_x';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_x';
