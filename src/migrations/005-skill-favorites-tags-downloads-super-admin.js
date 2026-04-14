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
  addColumnIfMissing(db, "ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "ALTER TABLE skills ADD COLUMN favorite_count INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "ALTER TABLE skills ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "ALTER TABLE skill_versions ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0");

  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_favorites (
      user_id INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, skill_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS skill_tags (
      skill_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      PRIMARY KEY (skill_id, tag_id),
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_skill_favorites_skill_id ON skill_favorites(skill_id);
    CREATE INDEX IF NOT EXISTS idx_skill_favorites_user_id ON skill_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_skill_tags_tag_id ON skill_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `);

  db.exec(`
    UPDATE skills
    SET favorite_count = (
      SELECT COUNT(*)
      FROM skill_favorites
      WHERE skill_favorites.skill_id = skills.id
    );

    UPDATE skills
    SET download_count = COALESCE(download_count, 0);

    UPDATE skill_versions
    SET download_count = COALESCE(download_count, 0);
  `);

  const existingSuperAdmin = db.prepare('SELECT id FROM users WHERE is_super_admin = 1 LIMIT 1').get();
  if (!existingSuperAdmin) {
    db.prepare(`
      UPDATE users
      SET is_super_admin = 1
      WHERE id = (
        SELECT id
        FROM users
        WHERE role = 'admin'
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      )
    `).run();
  }
}

module.exports = {
  version: '005-skill-favorites-tags-downloads-super-admin',
  up
};
