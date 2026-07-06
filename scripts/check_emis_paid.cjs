const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_4zwjlA1BFsgi@ep-little-heart-atp7dqaj-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

pool.query(
  'SELECT name, total_amount, remaining_amount, emi, emis_paid, next_due_date FROM debts ORDER BY name'
).then(r => {
  if (r.rows.length === 0) {
    console.log('No debts found in DB.');
  } else {
    console.log('\n── ALL debts in DB ──');
    console.table(r.rows.map(row => ({
      name:             row.name,
      total_amount:     Number(row.total_amount),
      remaining_amount: Number(row.remaining_amount),
      emi:              row.emi !== null ? Number(row.emi) : null,
      emis_paid:        row.emis_paid,
      next_due_date:    row.next_due_date,
      calc_suggested:   row.emi > 0
        ? Math.round((Number(row.total_amount) - Number(row.remaining_amount)) / Number(row.emi))
        : 'n/a'
    })));
  }
  pool.end();
}).catch(e => { console.error('DB error:', e.message); pool.end(); });
