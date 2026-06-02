const PLAYER_SCRIPT_ID = 'vturb-player-script'
const PERF_SCRIPT_ID = 'vturb-perf-script'

const PLAYER_SCRIPT_URL =
  'https://scripts.converteai.net/679c4b8c-be5b-4ec5-a78e-2fa83243146b/players/6a1f5eb1302e1bc3400efe9e/v4/player.js'

const PRELOADS = [
  { as: 'script', href: PLAYER_SCRIPT_URL },
  { as: 'script', href: 'https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js' },
  {
    as: 'fetch',
    href: 'https://cdn.converteai.net/679c4b8c-be5b-4ec5-a78e-2fa83243146b/69d28164c996282c91690a42/main.m3u8',
    crossOrigin: true,
  },
]

const DNS_PREFETCH = [
  'https://cdn.converteai.net',
  'https://scripts.converteai.net',
  'https://images.converteai.net',
  'https://license.vturb.com',
]

function appendLink(rel, href, extra = {}) {
  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  Object.assign(link, extra)
  document.head.appendChild(link)
}

export function loadVturbPlayerAssets() {
  if (!document.getElementById(PERF_SCRIPT_ID)) {
    const perf = document.createElement('script')
    perf.id = PERF_SCRIPT_ID
    perf.textContent =
      '!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);'
    document.head.appendChild(perf)
  }

  PRELOADS.forEach(({ as, href, crossOrigin }) => {
    const extra = { as }
    if (crossOrigin) extra.crossOrigin = 'anonymous'
    appendLink('preload', href, extra)
  })

  DNS_PREFETCH.forEach((href) => appendLink('dns-prefetch', href))

  if (!document.getElementById(PLAYER_SCRIPT_ID)) {
    const script = document.createElement('script')
    script.id = PLAYER_SCRIPT_ID
    script.src = PLAYER_SCRIPT_URL
    script.async = true
    document.head.appendChild(script)
  }
}
