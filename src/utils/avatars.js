const PRESET_AVATARS = Object.freeze([
  'airplane.png',
  'blob.png',
  'blue-bear.png',
  'chick.png',
  'cloud.png',
  'fox.png',
  'frog.png',
  'hamster.png',
  'hedgehog.png',
  'lightbulb.png',
  'mushroom.png',
  'octopus.png',
  'owl.png',
  'penguin.png',
  'raccoon.png',
  'red-panda.png',
  'robot.png',
  'snail.png',
  'sprout.png',
  'star.png',
  'taco.png'
]);

const PRESET_SET = new Set(PRESET_AVATARS);

function isAllowedAvatar(value) {
  return typeof value === 'string' && PRESET_SET.has(value);
}

function normalizeAvatarInput(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (!isAllowedAvatar(value)) return false;
  return value;
}

module.exports = {
  PRESET_AVATARS,
  isAllowedAvatar,
  normalizeAvatarInput
};
