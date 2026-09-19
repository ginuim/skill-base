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
  addColumnIfMissing(db, 'ALTER TABLE users ADD COLUMN avatar TEXT');
}

module.exports = {
  version: '011-user-avatar',
  up
};
