import { withBasePath } from '@/utils/basePath'

export const PRESET_AVATARS = [
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
  'taco.png',
] as const

export type PresetAvatar = (typeof PRESET_AVATARS)[number]

export function isPresetAvatar(value: string | null | undefined): value is PresetAvatar {
  return !!value && (PRESET_AVATARS as readonly string[]).includes(value)
}

export function avatarSrc(filename: string | null | undefined): string | null {
  if (!isPresetAvatar(filename)) return null
  return withBasePath(`/avatars/${filename}`)
}
