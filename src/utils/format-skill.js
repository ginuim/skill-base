const db = require('../database');
const FavoriteModel = require('../models/favorite');
const TagModel = require('../models/tag');
const CollectionModel = require('../models/collection');
const { canViewSkillWebhook } = require('./skill-webhook');
const { formatScreenshots } = require('./screenshots');

// Format skill, convert owner to object
function formatSkill(skill, currentUser) {
  if (!skill) return null;
  const result = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    latest_version: skill.latest_version,
    favorite_count: skill.favorite_count || 0,
    download_count: skill.download_count || 0,
    tags: TagModel.listSkillTags(skill.id),
    collections: CollectionModel.listSkillCollections(skill.id),
    screenshots: formatScreenshots(skill),
    owner: {
      id: skill.owner_id,
      username: skill.owner_username,
      name: skill.owner_name,
      avatar: skill.owner_avatar || null
    },
    created_at: skill.created_at,
    updated_at: skill.updated_at
  };
  result.visibility = skill.visibility || 'public';

  if (currentUser) {
    if (currentUser.role === 'admin' || currentUser.id === skill.owner_id) {
      result.permission = 'owner';
    } else {
      const collab = db.prepare('SELECT role FROM skill_collaborators WHERE skill_id = ? AND user_id = ?').get(skill.id, currentUser.id);
      if (collab) {
        result.permission = collab.role;
      } else {
        result.permission = 'user';
      }
    }
  } else {
    result.permission = 'user';
  }

  result.is_favorited = currentUser ? FavoriteModel.isFavorited(currentUser.id, skill.id) : false;

  if (canViewSkillWebhook(currentUser, result.permission)) {
    result.webhook_url = skill.webhook_url || null;
  }

  return result;
}

module.exports = { formatSkill };
