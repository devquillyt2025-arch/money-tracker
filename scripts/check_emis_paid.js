const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(
  "SELECT name, total_amount, remaining_amount, emi, emis_paid, next_due_date FROM debts WHERE name IN ('KreditBee','Fibe','Slice','HDFC') ORDER BY name"
).then(r => {
  console.log('\n── Current emisPaid for all four debts ──');
  console.table(r.rows.map(row => ({
    name:             row.name,
    total_amount:     row.total_amount,
    remaining_amount: row.remaining_amount,
    emi:              row.emi,
    emis_paid:        row.emis_paid,
    next_due_date:    row.next_due_date,
    'calc: round((total-remaining)/emi)': row.emi > 0
      ? Math.round((row.total_amount - row.remaining_amount) / row.emi)
      : 'n/a'
  })));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
