function addColumnIfMissing(db, sql) {
  try {
    db.exec(sql);
  } catch (error) {
    if (!String(error && error.message ? error.message : error).includes('duplicate column name')) {
      throw error;
    }
  }
}

function up(db) {
  // screenshots: JSON array, e.g. [{"id":"...","filename":"...","created_at":"..."}]
  addColumnIfMissing(db, 'ALTER TABLE skills ADD COLUMN screenshots TEXT');
}

module.exports = {
  version: '010-skill-screenshots',
  up
};
