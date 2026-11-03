const THEME_KEY = 'sm_theme'
const LANG_KEY = 'sm_lang'

/** Fixed standard theme — dark/light switcher removed */
export function getTheme() {
  return 'standard'
}

export function setTheme(_theme) {
  applyTheme('standard')
}

export function applyTheme(_theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', 'standard')
  root.classList.remove('theme-light', 'theme-dark', 'theme-dim')
  root.classList.add('theme-standard')
}

export function getLang() {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'sw' || v === 'en') return v
  } catch (_) {}
  return 'en'
}

export function setLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch (_) {}
}
