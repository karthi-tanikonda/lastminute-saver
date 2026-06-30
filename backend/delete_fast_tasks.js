const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.run("DELETE FROM tasks WHERE title LIKE '%water%' OR title LIKE '%Mosque%'", function(err) {
  if (err) console.error(err);
  else console.log('Deleted rows:', this.changes);
});
