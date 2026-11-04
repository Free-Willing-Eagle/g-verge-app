import getSystem from '@/utils/get-system'

export const isWindows = getSystem() === 'windows'

/** Word for the user's computer in interface text. */
export const device = isWindows ? 'компьютер' : 'Mac'
export const deviceOs = isWindows ? 'Windows' : 'macOS'

// Copies for family and friends leave out the owner's remote desktops and own-server exit.
export const sharedEdition = import.meta.env.VITE_G_VERGE_EDITION === 'shared'
