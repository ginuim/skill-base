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
  addColumnIfMissing(db, "ALTER TABLE skills ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'");
  db.exec(`
    UPDATE skills
    SET visibility = 'public'
    WHERE visibility IS NULL OR TRIM(visibility) = '' OR visibility NOT IN ('public', 'private');
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(visibility)');
}

module.exports = {
  version: '006-skill-visibility',
  up
};
