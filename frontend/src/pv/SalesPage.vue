<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { LOGO_URL, REACT_VIDEO_URL } from '../constants'

const router = useRouter()

const phrases = [
  'sua filha princesa…',
  'seu filho campeão…',
  'quem te acolheu…',
  'um grande amigo…',
  'sua vó querida…',
  'seu vô exemplar…',
  'seu pet da família…',
  'dias de luta…',
  'dias de glória…',
  'sua irmã parceira…',
  'o amor da sua vida…',
  'pedir perdão…',
  'reacender o amor…',
  'sua namorada…',
  'celebrar a união!…',
  'eternizar momentos…',
  'curar a saudade…',
  'sua mãe guerreira…',
  'seu pai herói…',
  'seu namorado…',
  'sua esposa amada…',
  'seu marido dedicado…',
  'um novo começo…',
  'um amor eterno…',
  'um presente de Deus…',
]

const currentPhraseIndex = ref(0)
const displayText = ref('')
const isDeleting = ref(false)
let typewriterTimer = null

const DEMO_AUDIO_FILE = 'Especial para Gabriele - Versão 1.mp3'

const audioPlayerVisible = ref(false)
const globalAudioPlaying = ref(false)
const globalAudioProgress = ref(0)
const globalAudioDuration = ref(0)
const globalAudioCurrent = ref(0)
const stickyAudioRef = ref(null)

const vinylPlaying = ref(false)
const vinylProgress = ref(0)
const vinylDuration = ref(0)
const vinylCurrent = ref(0)
const vinylAudioRef = ref(null)
const needleAngle = computed(() => (vinylPlaying.value ? -32 : -12))

const openFaqIndex = ref(null)
const mobileMenuOpen = ref(false)

const waveHeightsGlobal = Array.from({ length: 30 }, () => Math.floor(Math.random() * 20 + 4))
const waveHeightsCards = Array.from({ length: 4 }, () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16 + 4)),
)

const musicCount = ref(0)
const counterStarted = ref(false)

const audioRefs = ref({})
const audioDurations = ref({})
const audioCurrent = ref({})
const playingIndex = ref(null)

function publicAudioUrl(filename) {
  return `/${filename.split('/').map(encodeURIComponent).join('/')}`
}

function formatAudioTime(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const remainder = total % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function setAudioRef(index, el) {
  if (el) audioRefs.value[index] = el
  else delete audioRefs.value[index]
}

function onAudioMeta(index) {
  const el = audioRefs.value[index]
  if (!el?.duration) return
  audioDurations.value[index] = el.duration
}

function onAudioTime(index) {
  const el = audioRefs.value[index]
  if (!el) return
  audioCurrent.value[index] = el.currentTime
}

function onAudioEnded(index) {
  if (playingIndex.value === index) playingIndex.value = null
}

function cardTimeDisplay(index) {
  return `${formatAudioTime(audioCurrent.value[index] || 0)} / ${formatAudioTime(audioDurations.value[index] || 0)}`
}

const audioExamples = [
  {
    name: 'Maristela Sandaniel',
    initial: 'M',
    color: '#ff6b6b',
    title: 'Para meu esposo (Gospel)',
    text: '"Amei 🤩🤩. Fiquei emocionada aqui, e olha que foi pra ele hein kkkk. Vou mostrar à ele no seu aniversário que é mês que vem, ansiosaaaa pra ver a reação!"',
    audio: 'Especial para Ademilson - Versão 2 Gospel.mp3',
  },
  {
    name: 'Lorena Marques',
    initial: 'L',
    color: '#f472b6',
    title: 'Para meu filho (Infantil)',
    text: '"Marcelo amou, ficou todo feliz 🥹. Muito obrigada 🥰"',
    audio: 'Especial para Marcelo - Versão 2 Infantil.mp3',
  },
  {
    name: 'Angel Lima',
    initial: 'A',
    color: '#a855f7',
    title: 'Para meu esposo (Funk)',
    text: '"Eu escutei agora até o fim, gente do céu se um sistema desse vai ao ar eu mesma conheço um monte de gente que vai querer usar, meu pai por exemplo é um deles, amei 🥰. Mostrei pro Igor e ele gostou, achou muito legal, mandei até pra minha sogra também e ela falou que ficou muito bom."',
    audio: 'Especial para Igor - Versão 2 Funk.mp3',
  },
  {
    name: 'Alison Oliveira',
    initial: 'A',
    color: '#0099b8',
    title: 'Para minha mãe (Gospel)',
    text: '"Minha mãe amou, ficou até sem palavras ao ouvir de tão emocionada que ficou. Muito obrigado ☺️"',
    audio: 'Especial para Ilza - Versão 1 Gospel.mp3',
  },
]

const globalPlayedBars = computed(() => Math.floor((globalAudioProgress.value / 100) * 30))
const vinylPlayedBars = computed(() => Math.floor((vinylProgress.value / 100) * 32))

const socialAvatars = [
  { initial: 'A', bg: 'linear-gradient(135deg, #ff6b6b, #ffb347)' },
  { initial: 'M', bg: 'linear-gradient(135deg, #00c9d4, #0066a8)' },
  { initial: 'S', bg: 'linear-gradient(135deg, #a855f7, #f472b6)' },
  { initial: 'G', bg: 'linear-gradient(135deg, #22c55e, #00c9d4)' },
  { initial: 'B', bg: 'linear-gradient(135deg, #f59e0b, #ff6b6b)' },
]

const reactVideoRef = ref(null)

const testimonials = [
  { name: 'Sofia Mendes', role: 'Filha', initial: 'S', color: '#ff6b6b', pillBg: '#fff0f0', pillColor: '#ff6b6b', pillBorder: '#ffc8c8', text: 'Fiz uma homenagem para minha mãe no seu aniversário de 58 anos. Ela chorou de tão emocionada que ficou e agora não para de ouvir. Valeu cada centavo pago' },
  { name: 'Bianca Pereira', role: 'Empresária', initial: 'B', color: '#0099b8', pillBg: '#f0f8ff', pillColor: '#0099b8', pillBorder: '#b0d4e8', text: 'Criei uma música para minha empresa e fiquei impressionada com a qualidade e profissionalismo do Fluisom, recomendo muito' },
  { name: 'Amanda Neves', role: 'Noiva', initial: 'A', color: '#f472b6', pillBg: '#fff0f9', pillColor: '#f472b6', pillBorder: '#fbc8e8', text: 'Pedi uma música para meu casamento e ficou perfeita! Todos os convidados da festa choraram. Fiquei impressionada com a qualidade da música, parece até aquelas músicas de rádio!' },
]

const faqs = [
  { q: 'Como é criada a minha música e o que a torna única?', a: 'Nossa equipe de compositores transforma suas memórias, apelidos carinhosos e momentos especiais em uma letra original. Em seguida, criamos a melodia, arranjamos com instrumentos reais e gravamos vocais profissionais — tudo personalizado para a sua história. Não é uma música genérica: é a SUA história em forma de arte musical.' },
  { q: 'Quanto tempo demora para eu receber a música?', a: 'Sua música é entregue entre 2 a 5 minutos após preencher as perguntas.' },
  { q: 'Como funciona o processo?', a: 'São apenas 3 etapas simples: você conta sua história respondendo perguntas rápidas, nossa equipe compõe e grava sua música exclusiva, e você recebe por email e WhatsApp em alta qualidade, pronta para emocionar quem você ama.' },
  { q: 'Como acesso minha música e acompanho o meu pedido?', a: 'Após a criação, você recebe um email com link exclusivo para ouvir, baixar e compartilhar sua música. Também pode acompanhar seu pedido na área "Ver Meus Pedidos" usando o email cadastrado.' },
  { q: 'Posso tocar a música em eventos?', a: 'Sim! Você pode tocá-la onde você quiser, seja em casamentos, festas, cerimônias ou qualquer momento especial.' },
  { q: 'Preciso escrever a letra ou saber rimar?', a: 'Não! Você só precisa contar sua história com suas palavras. Nossa equipe cuida de toda a composição, rima e melodia. Quanto mais detalhes você compartilhar, mais personalizada ficará a música.' },
  { q: 'Posso colocar minha música no Spotify ou outras plataformas?', a: 'Sim! Oferecemos o serviço VIP de publicação nas plataformas digitais (Spotify, Deezer, Apple Music e outras) por R$ 167,00. Assim sua música pode ser ouvida em qualquer lugar do mundo.' },
  { q: 'Posso colocar nomes, datas e lugares na letra?', a: 'Com certeza! Incentivamos você a incluir nomes, datas especiais, apelidos carinhosos e lugares marcantes. Esses detalhes tornam a música ainda mais única e emocionante.' },
  { q: 'Minha história e dados ficam protegidos?', a: 'Sim. Seus dados e história são tratados com total confidencialidade. Nunca compartilhamos suas informações com terceiros e utilizamos criptografia em todo o processo de pagamento.' },
  { q: 'Qual é a duração média da música?', a: 'Nossas músicas personalizadas têm em média entre 3 e 4 minutos de duração — tempo ideal para contar sua história de forma completa e emocionante, sem perder o impacto.' },
]

const features = [
  { icon: '🎵', title: 'Música de alta qualidade', desc: 'Gravação profissional com instrumentos reais e vocais de alta qualidade.', color: '#0099b8' },
  { icon: '📝', title: 'Letra sob medida', desc: 'Letra 100% personalizada com base na sua história, nomes e momentos especiais.', color: '#a855f7' },
  { icon: '⚡', title: 'Entrega Rápida', desc: 'Receba sua música em poucos minutos, pronta para emocionar.', color: '#22c55e' },
  { icon: '🎙️', title: 'Publique no Spotify', desc: 'Serviço VIP para publicar sua música nas principais plataformas.', color: '#f59e0b', vip: true },
]

let sectionObserver = null
let counterObserver = null

function navigateToQuiz() {
  router.push({ path: '/passo/1', query: { novo: '1' } })
}

function navigateToOrders() {
  mobileMenuOpen.value = false
  router.push('/meus-pedidos')
}

function scrollTo(id) {
  mobileMenuOpen.value = false
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggleFaq(index) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

function showStickyPlayer() {
  audioPlayerVisible.value = true
  if (!globalAudioPlaying.value) toggleGlobalAudio()
}

function toggleGlobalAudio() {
  const el = stickyAudioRef.value
  if (!el) return

  if (globalAudioPlaying.value) {
    el.pause()
    globalAudioPlaying.value = false
    return
  }

  if (vinylPlaying.value && vinylAudioRef.value) {
    vinylAudioRef.value.pause()
    vinylPlaying.value = false
  }

  globalAudioPlaying.value = true
  el.play().catch(() => {
    globalAudioPlaying.value = false
  })
}

function onStickyMeta() {
  const el = stickyAudioRef.value
  if (el?.duration) globalAudioDuration.value = el.duration
}

function onStickyTime() {
  const el = stickyAudioRef.value
  if (!el) return
  globalAudioCurrent.value = el.currentTime
  globalAudioProgress.value = el.duration ? (el.currentTime / el.duration) * 100 : 0
}

function onStickyEnded() {
  globalAudioPlaying.value = false
}

function seekSticky() {
  const el = stickyAudioRef.value
  if (!el?.duration) return
  el.currentTime = Math.min(el.duration, el.currentTime + el.duration * 0.15)
}

function closeStickyPlayer() {
  const el = stickyAudioRef.value
  if (el) el.pause()
  globalAudioPlaying.value = false
  audioPlayerVisible.value = false
}

function toggleVinyl() {
  const el = vinylAudioRef.value
  if (!el) return

  if (vinylPlaying.value) {
    el.pause()
    vinylPlaying.value = false
    return
  }

  if (globalAudioPlaying.value && stickyAudioRef.value) {
    stickyAudioRef.value.pause()
    globalAudioPlaying.value = false
  }

  vinylPlaying.value = true
  el.play().catch(() => {
    vinylPlaying.value = false
  })
}

function onVinylMeta() {
  const el = vinylAudioRef.value
  if (el?.duration) vinylDuration.value = el.duration
}

function onVinylTime() {
  const el = vinylAudioRef.value
  if (!el) return
  vinylCurrent.value = el.currentTime
  vinylProgress.value = el.duration ? (el.currentTime / el.duration) * 100 : 0
}

function onVinylEnded() {
  vinylPlaying.value = false
}

function toggleCardPlayer(index) {
  const el = audioRefs.value[index]
  if (!el) return

  if (playingIndex.value === index) {
    el.pause()
    playingIndex.value = null
    return
  }

  Object.entries(audioRefs.value).forEach(([i, audio]) => {
    if (Number(i) !== index && audio) {
      audio.pause()
      audio.currentTime = 0
      audioCurrent.value[i] = 0
    }
  })

  playingIndex.value = index
  el.play().catch(() => {
    playingIndex.value = null
  })
}

function cardPlayedBars(index) {
  const duration = audioDurations.value[index]
  if (!duration) return 0
  const current = audioCurrent.value[index] || 0
  return Math.floor((current / duration) * 24)
}

function runTypewriter() {
  const current = phrases[currentPhraseIndex.value]
  if (!isDeleting.value) {
    displayText.value = current.slice(0, displayText.value.length + 1)
    if (displayText.value === current) {
      typewriterTimer = setTimeout(() => { isDeleting.value = true; runTypewriter() }, 2000)
      return
    }
    typewriterTimer = setTimeout(runTypewriter, 80)
  } else {
    displayText.value = current.slice(0, displayText.value.length - 1)
    if (displayText.value === '') {
      isDeleting.value = false
      currentPhraseIndex.value = (currentPhraseIndex.value + 1) % phrases.length
      typewriterTimer = setTimeout(runTypewriter, 80)
      return
    }
    typewriterTimer = setTimeout(runTypewriter, 40)
  }
}

function animateCounter() {
  if (counterStarted.value) return
  counterStarted.value = true
  const target = 15000
  const duration = 2000
  const start = performance.now()
  function tick(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    musicCount.value = Math.floor(eased * target)
    if (progress < 1) requestAnimationFrame(tick)
    else musicCount.value = target
  }
  requestAnimationFrame(tick)
}

onMounted(() => {
  runTypewriter()
  const video = reactVideoRef.value
  if (video) {
    video.muted = true
    video.loop = true
    video.play().catch(() => {})
  }
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('visible')
      })
    },
    { threshold: 0.15 },
  )
  document.querySelectorAll('.animate-section').forEach((el) => sectionObserver.observe(el))

  const counterEl = document.getElementById('counter-section')
  if (counterEl) {
    counterObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animateCounter()
          counterObserver.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    counterObserver.observe(counterEl)
  }
})

onUnmounted(() => {
  clearTimeout(typewriterTimer)
  Object.values(audioRefs.value).forEach((el) => el?.pause())
  stickyAudioRef.value?.pause()
  vinylAudioRef.value?.pause()
  sectionObserver?.disconnect()
  counterObserver?.disconnect()
})
</script>

<template>
  <div class="sales-page">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-badge-row">
        <span class="topbar-badge">✅ 100% satisfação garantida ou seu dinheiro de volta</span>
      </div>
      <div class="topbar-main">
        <a href="/pv" class="topbar-logo" @click.prevent>
          <img :src="LOGO_URL" alt="Fluisom" class="logo-img" />
        </a>
        <nav class="topbar-nav hide-mobile">
          <button type="button" @click="scrollTo('como-funciona')">Como funciona</button>
          <button type="button" @click="scrollTo('avaliacoes')">Avaliações</button>
          <button type="button" @click="scrollTo('exemplos')">Exemplos</button>
          <button type="button" class="nav-link-ext" @click="navigateToOrders">Ver Meus Pedidos</button>
        </nav>
        <div class="topbar-actions">
          <button type="button" class="btn-cta-sm hide-mobile" @click="navigateToQuiz">🎵 Criar Sua Música</button>
          <button type="button" class="hamburger show-mobile" aria-label="Menu" @click="mobileMenuOpen = true">☰</button>
        </div>
      </div>
    </header>

    <!-- Mobile drawer -->
    <transition name="drawer">
      <div v-if="mobileMenuOpen" class="drawer-overlay" @click="mobileMenuOpen = false">
        <nav class="drawer" @click.stop>
          <button type="button" class="drawer-close" @click="mobileMenuOpen = false">✕</button>
          <button type="button" @click="scrollTo('como-funciona')">Como funciona</button>
          <button type="button" @click="scrollTo('avaliacoes')">Avaliações</button>
          <button type="button" @click="scrollTo('exemplos')">Exemplos</button>
          <button type="button" @click="navigateToOrders">Ver Meus Pedidos</button>
          <button type="button" class="btn-cta-sm drawer-cta" @click="navigateToQuiz">🎵 Criar Sua Música</button>
        </nav>
      </div>
    </transition>

    <!-- HERO -->
    <section class="hero animate-section">
      <div class="orb orb-cyan" />
      <div class="orb orb-violet" />
      <div class="orb orb-coral" />
      <div class="hero-inner">
        <div class="hero-text">
          <div class="pill-hero">🎵 A plataforma n° 1 de músicas personalizadas</div>
          <h1 class="hero-title">
            Torne mais especiais os momentos de quem você ama com
            <span class="gradient-text">músicas inesquecíveis</span>
          </h1>
          <p class="typewriter-line">
            <span>para </span>
            <span class="typewriter-text">{{ displayText }}</span>
            <span class="cursor">|</span>
          </p>
        </div>

        <div class="hero-react-wrap">
          <div class="hero-react-video">
            <video
              ref="reactVideoRef"
              class="hero-react-media"
              :src="REACT_VIDEO_URL"
              autoplay
              muted
              loop
              playsinline
              preload="auto"
              aria-label="Reacts reais de clientes Fluisom"
            />
          </div>
        </div>

        <div class="hero-bottom">
          <div class="hero-ctas">
            <button type="button" class="btn-cta pulse-cta" @click="navigateToQuiz">🎵 Homenagear alguém agora</button>
            <button type="button" class="btn-secondary" @click="showStickyPlayer">▶ Ouvir um exemplo</button>
          </div>
          <div class="social-proof">
            <div class="avatars-stack">
              <span v-for="(a, i) in socialAvatars" :key="i" class="avatar-circle" :style="{ background: a.bg, zIndex: 5 - i }">{{ a.initial }}</span>
            </div>
            <span class="stars">★★★★★</span>
            <span class="proof-text">4,98/5 · Amado por 15.000+ famílias</span>
            <span class="pill-delivery">📦 Entregue com carinho em até 5 dias</span>
          </div>
        </div>
      </div>
    </section>

    <!-- QUOTE -->
    <section class="quote-section animate-section">
      <div class="orb orb-quote" />
      <span class="quote-mark">"</span>
      <blockquote class="quote-text">
        Presentes podem ser esquecidos… A música
        <span class="quote-highlight">flui eternamente no coração</span>
      </blockquote>
      <p class="quote-sub">
        Transformamos suas histórias e sentimentos em uma verdadeira arte musical para você homenagear quem você ama. Letra, melodia, voz e toda composição feita sob medida para surpreender quem você ama, e que jamais será esquecida.
      </p>
      <button type="button" class="btn-cta" @click="navigateToQuiz">🎵 Homenagear alguém agora</button>
    </section>

    <!-- EXEMPLOS -->
    <section id="exemplos" class="section section-light animate-section">
      <h2 class="section-title">🎧 Ouça exemplos reais</h2>
      <p class="section-sub">Cada música é feita com vocais profissionais e instrumentos reais</p>
      <div class="audio-grid">
        <article v-for="(ex, i) in audioExamples" :key="ex.name" class="audio-card" :style="{ borderTopColor: ex.color }">
          <div class="audio-card-header">
            <span class="audio-avatar" :style="{ background: `linear-gradient(135deg, ${ex.color}, #0066a8)` }">{{ ex.initial }}</span>
            <div>
              <strong>{{ ex.name }}</strong>
              <span class="audio-card-title" :style="{ color: ex.color }">{{ ex.title }}</span>
            </div>
          </div>

          <audio
            :ref="(el) => setAudioRef(i, el)"
            :src="publicAudioUrl(ex.audio)"
            preload="metadata"
            class="sr-only-audio"
            @loadedmetadata="onAudioMeta(i)"
            @timeupdate="onAudioTime(i)"
            @ended="onAudioEnded(i)"
          />

          <div class="mini-player">
            <button type="button" class="mini-play" @click="toggleCardPlayer(i)">{{ playingIndex === i ? '⏸' : '▶' }}</button>
            <div class="mini-waves">
              <span
                v-for="(h, bi) in waveHeightsCards[i]"
                :key="bi"
                class="mini-bar"
                :class="{ played: bi < cardPlayedBars(i) }"
                :style="{ height: h + 'px', ...(bi < cardPlayedBars(i) ? { background: `linear-gradient(to top, ${ex.color}, #ffb347)` } : {}) }"
              />
            </div>
            <span class="mini-time">{{ cardTimeDisplay(i) }}</span>
          </div>

          <p class="audio-quote">{{ ex.text }}</p>
        </article>
      </div>
    </section>

    <!-- STICKY PLAYER -->
    <audio
      ref="stickyAudioRef"
      :src="publicAudioUrl(DEMO_AUDIO_FILE)"
      preload="metadata"
      class="sr-only-audio"
      @loadedmetadata="onStickyMeta"
      @timeupdate="onStickyTime"
      @ended="onStickyEnded"
    />
    <transition name="sticky-player">
      <div v-if="audioPlayerVisible" class="sticky-player">
        <button type="button" class="sticky-play" @click="toggleGlobalAudio">{{ globalAudioPlaying ? '⏸' : '▶' }}</button>
        <div class="sticky-info">
          <span>🎵 Exemplo — Música para Gabriele</span>
          <span class="sticky-time">{{ formatAudioTime(globalAudioCurrent) }} / {{ formatAudioTime(globalAudioDuration) }}</span>
        </div>
        <div class="sticky-waves">
          <span v-for="(h, i) in waveHeightsGlobal" :key="i" class="sticky-bar" :class="{ played: i < globalPlayedBars }" :style="{ height: h + 'px' }" />
        </div>
        <div class="sticky-progress" @click="seekSticky">
          <div class="sticky-progress-fill" :style="{ width: globalAudioProgress + '%' }" />
        </div>
        <button type="button" class="sticky-close" @click="closeStickyPlayer">✕</button>
      </div>
    </transition>

    <!-- PROCESSO -->
    <section id="como-funciona" class="section section-alt animate-section">
      <h2 class="section-title">✨ Processo Simples</h2>
      <p class="section-sub">Veja como a mágica acontece</p>
      <div class="steps-row">
        <div class="step-item">
          <div class="step-icon step-icon-1">📝</div>
          <span class="badge-coral">3 minutos</span>
          <span class="badge-green">Fácil e Rápido</span>
          <h3>Etapa 1: Conte a Sua História</h3>
          <p>Conte para nós suas memórias marcantes, os apelidos carinhosos, as emoções que tiveram juntos, e momentos que fizeram rir ou chorarem juntos.</p>
        </div>
        <div class="step-item">
          <div class="step-icon step-icon-2">🎵</div>
          <span class="badge-cyan">2-5 min</span>
          <h3>Etapa 2: Nossa Equipe Cria</h3>
          <p>Criamos uma música única e especial, feita com dedicação para transformar sua história em uma melodia inesquecível</p>
        </div>
        <div class="step-item">
          <div class="step-icon step-icon-3">🎁</div>
          <span class="badge-amber">Alta Qualidade</span>
          <h3>Etapa 3: Entrega da sua Obra-Prima</h3>
          <p>Receba a sua música personalizada em máxima qualidade, pronta para ser compartilhada com o mundo.</p>
          <div class="step-badges">
            <span>📱 Via WhatsApp</span>
            <span>📧 Via Email</span>
          </div>
        </div>
      </div>
      <div id="counter-section" class="counter-bar">
        <div class="counter-item">
          <span class="counter-num">{{ musicCount >= 15000 ? '15K+' : musicCount.toLocaleString('pt-BR') + '+' }}</span>
          <span>músicas criadas</span>
        </div>
        <div class="counter-item">
          <span class="stars big">★★★★★</span>
          <span class="counter-rating">4,98/5</span>
        </div>
      </div>
      <p class="cta-lead">Preparado para criar sua música?</p>
      <button type="button" class="btn-cta center-cta" @click="navigateToQuiz">🎵 Criar minha música agora</button>
    </section>

    <!-- COMPARAÇÃO -->
    <section class="section section-light animate-section">
      <h2 class="section-title">Por que uma música vale mais do que vários presentes?</h2>
      <p class="section-sub narrow">Presentes materiais perdem valor conforme o tempo, já uma música personalizada, após criada, se torna especial para sempre.</p>
      <div class="compare-grid">
        <div class="compare-card compare-bad">
          <h3>😔 Presentes Normais</h3>
          <ul>
            <li><span class="icon-x">✗</span> Roupas se perdem no tamanho</li>
            <li><span class="icon-x">✗</span> Perfumes acabam e vão para o lixo</li>
            <li><span class="icon-x">✗</span> Chocolates só duram uns instantes</li>
            <li><span class="icon-x">✗</span> Jantares caros são esquecidos no próximo dia</li>
          </ul>
        </div>
        <div class="compare-card compare-good">
          <span class="compare-badge">⭐ O melhor presente de todos</span>
          <h3>🎵 Música Personalizada</h3>
          <ul>
            <li><span class="icon-ok">✓</span> Eterno: A música fica para sempre</li>
            <li><span class="icon-ok">✓</span> Emocionante: Toca direto no coração e faz chorar</li>
            <li><span class="icon-ok">✓</span> Único: Mais ninguém no mundo tem igual</li>
            <li><span class="icon-ok">✓</span> Compartilhável: Mostre para toda sua família e amigos</li>
          </ul>
        </div>
      </div>
      <button type="button" class="btn-cta center-cta" @click="navigateToQuiz">🎵 Começar a criar minha música</button>
    </section>

    <!-- O QUE VOCÊ RECEBE -->
    <section class="section section-alt animate-section">
      <h2 class="section-title">🎁 O Que Você Recebe</h2>
      <p class="section-sub narrow">É muito mais do que uma simples música. É uma experiência completa. Tudo para que o momento da entrega seja tão especial como a canção.</p>
      <p class="delivery-note">Após criarmos sua música, você irá receber um e-mail como o seu acesso para ouvir igual ao exemplo abaixo.</p>
      <div class="email-mock">
        <div class="email-header">
          <img :src="LOGO_URL" alt="Fluisom" class="email-logo" />
          <strong>Sua música está pronta! 🎉</strong>
        </div>
        <div class="vinyl-wrap">
          <div class="vinyl" :class="{ playing: vinylPlaying }">
            <div class="vinyl-ring" /><div class="vinyl-ring r2" /><div class="vinyl-ring r3" /><div class="vinyl-ring r4" />
            <div class="vinyl-label">FS</div>
          </div>
          <div class="needle" :style="{ transform: `rotate(${needleAngle}deg)` }" />
        </div>
        <audio
          ref="vinylAudioRef"
          :src="publicAudioUrl(DEMO_AUDIO_FILE)"
          preload="metadata"
          class="sr-only-audio"
          @loadedmetadata="onVinylMeta"
          @timeupdate="onVinylTime"
          @ended="onVinylEnded"
        />
        <div class="vinyl-controls">
          <button type="button" class="vinyl-play" @click="toggleVinyl">{{ vinylPlaying ? '⏸' : '▶' }}</button>
          <div class="vinyl-waves">
            <span v-for="(h, i) in 32" :key="i" class="vinyl-bar" :class="{ played: i < vinylPlayedBars }" :style="{ height: (8 + (i % 5) * 4) + 'px' }" />
          </div>
          <div>
            <strong>Sua música personalizada</strong>
            <span class="vinyl-time">{{ formatAudioTime(vinylCurrent) }} / {{ formatAudioTime(vinylDuration) }}</span>
          </div>
        </div>
      </div>
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card" :style="{ borderTopColor: f.color }">
          <span class="feature-icon">{{ f.icon }}</span>
          <h4>{{ f.title }} <span v-if="f.vip" class="vip-badge">Serviço VIP</span></h4>
          <p>{{ f.desc }}</p>
        </div>
      </div>
      <button type="button" class="btn-cta center-cta" @click="navigateToQuiz">🎵 Criar minha música agora</button>
    </section>

    <!-- GARANTIA -->
    <section class="guarantee-section animate-section">
      <div class="orb orb-green" />
      <div class="guarantee-inner">
        <div class="shield-icon">🛡️</div>
        <div>
          <h2>🛡️ Garantia Total em 30 dias</h2>
          <p>Se sua música não Fluir até seu coração ou não mostrar sua história perfeitamente, é só nos avisar. Refazemos ou reembolsamos todo o seu dinheiro. Sem risco algum para você.</p>
          <div class="guarantee-pills">
            <span>✅ Reembolso total</span>
            <span>🔄 Refazemos se precisar</span>
            <span>⏱️ 30 dias de prazo</span>
          </div>
        </div>
      </div>
    </section>

    <!-- DEPOIMENTOS -->
    <section id="avaliacoes" class="section section-light animate-section">
      <h2 class="section-title">❤️ Veja o que Dizem sobre o Fluisom</h2>
      <p class="section-sub">Histórias reais de quem transformou seus momentos.</p>
      <div class="testimonials-grid">
        <article v-for="t in testimonials" :key="t.name" class="testimonial-card" :style="{ borderTopColor: t.color }">
          <div class="stars">★★★★★</div>
          <p>"{{ t.text }}"</p>
          <footer>
            <span class="t-avatar" :style="{ background: `linear-gradient(135deg, ${t.color}, #0066a8)` }">{{ t.initial }}</span>
            <div>
              <strong>{{ t.name }}</strong>
              <span class="role-pill" :style="{ background: t.pillBg, color: t.pillColor, borderColor: t.pillBorder }">{{ t.role }}</span>
            </div>
          </footer>
        </article>
      </div>
    </section>

    <!-- FAQ -->
    <section id="duvidas" class="section section-alt animate-section">
      <h2 class="section-title">💬 Com dúvidas?</h2>
      <p class="section-sub">Perguntas Frequentes</p>
      <div class="faq-list">
        <div
          v-for="(faq, i) in faqs"
          :key="i"
          class="faq-item"
          :class="{ open: openFaqIndex === i }"
        >
          <button type="button" class="faq-header" @click="toggleFaq(i)">
            <span>{{ faq.q }}</span>
            <svg class="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <div v-show="openFaqIndex === i" class="faq-body">{{ faq.a }}</div>
        </div>
      </div>
    </section>

    <!-- ÁREA CLIENTE -->
    <section class="client-section animate-section">
      <div class="orb orb-client" />
      <h2>Já criou a sua música?</h2>
      <p>Acesse a sua área exclusiva para acompanhar de perto a criação da sua música, ouvir prévias ou baixar as suas músicas prontas.</p>
      <a href="#" class="btn-client">📦 Ver meus pedidos</a>
    </section>

    <!-- CTA FINAL -->
    <section class="cta-final animate-section">
      <div class="orb orb-cyan-sm" />
      <div class="orb orb-coral-sm" />
      <span class="pill-final">🎵 A plataforma n°1 de músicas personalizadas</span>
      <h2 class="final-title">Uma música única para vocês</h2>
      <p class="final-sub">Feita do zero, a partir da sua história</p>
      <p class="final-desc">Você responde apenas 8 perguntas simples e rápidas. E nossos artistas compõem a sua música exclusiva com todos os detalhes que apenas vocês conhecem — os apelidos carinhosos, datas especiais, e momentos marcantes.</p>
      <button type="button" class="btn-cta btn-cta-lg pulse-cta" @click="navigateToQuiz">🎵 Criar minha música agora</button>
      <div class="final-badges">
        <span>✅ Garantia de 100% de satisfação</span>
        <span>⚡ Entregue em até 5 minutos</span>
        <span>🔒 Pagamento 100% seguro</span>
      </div>
      <div class="contact-block">
        <p>Ainda com alguma dúvida?</p>
        <p>Entre em contato conosco. Estamos prontos para te ajudar a criar a melhor música para seus momentos especiais!</p>
        <a href="mailto:contato@fluisom.com">contato@fluisom.com</a>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <img :src="LOGO_URL" alt="Fluisom" class="footer-logo" />
          <p>Transformando momentos com sons que fluem no coração através das músicas personalizadas.</p>
          <p class="footer-love">Feito com todo amor para emocionar quem você ama. ❤️</p>
        </div>
        <div>
          <h4>Links Rápidos</h4>
          <button type="button" @click="scrollTo('como-funciona')">Como funciona</button>
          <button type="button" @click="scrollTo('exemplos')">Exemplos</button>
          <button type="button" @click="scrollTo('duvidas')">Dúvidas Frequentes</button>
          <button type="button" @click="navigateToOrders">Ver meus pedidos</button>
        </div>
        <div>
          <h4>Contato</h4>
          <p>Ainda com dúvida? Fale com a gente!</p>
          <a href="mailto:contato@fluisom.com">contato@fluisom.com</a>
          <span class="footer-secure">🔒 Pagamento 100% seguro</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Fluisom. Todos os direitos reservados.</span>
        <div class="payment-pills">
          <span>PIX</span><span>Visa</span><span>Mastercard</span><span>Mercado Pago</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');

:root {
  --primary: #0099b8;
  --secondary: #0066a8;
  --bg: #f7f9ff;
  --bg-alt: #eef5fb;
  --surface: #ffffff;
  --border: #daeaf5;
  --coral: #ff6b6b;
  --amber: #ffb347;
  --violet: #a855f7;
  --green: #22c55e;
  --pink: #f472b6;
  --gold: #f59e0b;
  --text: #0d2137;
  --text-2: #4a6a80;
  --text-3: #8aaabb;
}

.sales-page {
  font-family: 'Inter', sans-serif;
  color: var(--text);
  background: var(--bg);
  overflow-x: hidden;
}

:global(html) { scroll-behavior: smooth; }

.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 16px rgba(0,153,184,0.07);
}
.topbar-badge-row {
  display: flex; justify-content: center; align-items: center;
  padding: 8px 24px; border-bottom: 1px solid rgba(218,234,245,0.8);
  background: linear-gradient(180deg, rgba(240,255,248,0.6), transparent);
}
.topbar-badge {
  font-size: 0.75rem; font-weight: 700; color: var(--green);
  background: linear-gradient(135deg, #22c55e15, #00c9d415);
  border: 1px solid #bbf7d0; border-radius: 20px; padding: 6px 14px;
  text-align: center; line-height: 1.3;
}
.topbar-main {
  max-width: 1100px; margin: 0 auto; width: 100%;
  min-height: 80px; padding: 0 24px;
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
}
.topbar-logo {
  margin-right: auto; flex-shrink: 0; display: flex; align-items: center;
}
.topbar-logo .logo-img { height: 64px; width: auto; object-fit: contain; display: block; }
.topbar-nav { display: flex; gap: 20px; align-items: center; }
.topbar-nav button, .nav-link-ext {
  background: none; border: none; font: inherit; font-size: 0.9rem; font-weight: 600;
  color: var(--text-2); cursor: pointer; text-decoration: none; transition: color 0.2s;
}
.topbar-nav button:hover, .nav-link-ext:hover { color: var(--primary); }
.btn-cta-sm {
  background: linear-gradient(135deg, var(--coral), var(--amber)); color: white;
  border: none; border-radius: 10px; padding: 10px 20px; font-weight: 700; font-size: 0.875rem;
  cursor: pointer; transition: all 0.22s ease; white-space: nowrap;
}
.btn-cta-sm:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,107,0.35); }
.hamburger { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text); }
.show-mobile { display: none; }
.hide-mobile { display: inline-flex; }
.drawer-overlay { position: fixed; inset: 0; z-index: 150; background: rgba(13,33,55,0.5); }
.drawer {
  position: absolute; right: 0; top: 0; bottom: 0; width: min(300px, 85vw);
  background: white; padding: 24px; display: flex; flex-direction: column; gap: 16px;
}
.drawer button, .drawer a { background: none; border: none; font: inherit; text-align: left; cursor: pointer; color: var(--text); font-weight: 600; text-decoration: none; }
.drawer .drawer-cta {
  background: linear-gradient(135deg, var(--coral), var(--amber)) !important;
  color: white !important;
  border-radius: 10px;
  padding: 14px 20px !important;
  text-align: center !important;
  font-weight: 700 !important;
  margin-top: 8px;
  box-shadow: 0 6px 20px rgba(255,107,107,0.35);
}
.drawer-close { align-self: flex-end; font-size: 1.25rem; }
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.3s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }

.hero {
  position: relative; padding: 168px 24px 80px; background: var(--bg);
  scroll-margin-top: 110px;
}
.hero-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 32px; text-align: center;
}
.hero-text {
  width: 100%; max-width: 820px; display: flex; flex-direction: column; align-items: center;
}
.hero-bottom {
  width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.pill-hero {
  display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 20px;
  background: linear-gradient(135deg, #fff0f9, #f0f8ff); border: 1px solid #fbc8e8;
  color: var(--violet); font-weight: 700; font-size: 0.8rem;
}
.hero-title {
  font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 800;
  line-height: 1.15; color: var(--text); margin: 0 0 20px;
}
@media (min-width: 768px) { .hero-title { font-size: 3rem; } }
.gradient-text {
  background: linear-gradient(135deg, var(--coral), var(--amber));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.typewriter-line { font-size: 1.2rem; color: var(--text-2); margin-bottom: 28px; min-height: 1.6em; }
.typewriter-text { color: var(--primary); font-weight: 700; }
.cursor { color: var(--coral); animation: blink 0.8s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
.hero-ctas { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
.btn-cta {
  background: linear-gradient(135deg, var(--coral), var(--amber)); color: white; border: none;
  height: 56px; border-radius: 14px; padding: 0 32px; font-size: 1.05rem; font-weight: 800;
  letter-spacing: 0.02em; cursor: pointer; box-shadow: 0 6px 24px rgba(255,107,107,0.30);
  transition: all 0.22s ease;
}
.btn-cta:hover { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,107,107,0.45); }
.btn-cta-lg { height: 64px; font-size: 1.15rem; padding: 0 48px; border-radius: 16px; }
.pulse-cta { animation: pulseCta 2s ease infinite; }
@keyframes pulseCta {
  0%, 100% { box-shadow: 0 6px 24px rgba(255,107,107,0.30); }
  50% { box-shadow: 0 6px 40px rgba(255,107,107,0.55); }
}
.btn-secondary {
  height: 56px; border-radius: 14px; padding: 0 28px; font-weight: 700; cursor: pointer;
  background: white; border: 2px solid var(--primary); color: var(--primary); transition: all 0.22s;
}
.btn-secondary:hover { background: rgba(0,153,184,0.06); transform: translateY(-1px); }
.social-proof { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; }
.hero-react-wrap {
  display: flex; flex-direction: column; align-items: center; width: 100%;
}
.hero-react-video {
  width: min(680px, 94vw);
  max-height: min(68vh, 1040px);
  border-radius: 24px; overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 20px 56px rgba(0, 153, 184, 0.2), 0 12px 32px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #fde8f0, #f0e8fd);
}
.hero-react-media {
  display: block; width: 100%; height: auto;
  max-height: min(68vh, 1040px);
  object-fit: cover;
}
.avatars-stack { display: flex; }
.avatar-circle {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid white;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 0.8rem; margin-left: -12px;
}
.avatar-circle:first-child { margin-left: 0; }
.stars { color: var(--gold); }
.proof-text { font-size: 0.875rem; color: var(--text-2); }
.pill-delivery {
  background: #f0fff8; color: var(--green); border: 1px solid #bbf7d0;
  border-radius: 20px; padding: 4px 12px; font-size: 0.8rem; font-weight: 600;
}
@media (min-width: 768px) {
  .hero-react-video {
    width: min(900px, 82vw);
    max-height: min(72vh, 1100px);
  }
  .hero-react-media { max-height: min(72vh, 1100px); }
}

.quote-section {
  position: relative; text-align: center; padding: 64px 24px;
  background: linear-gradient(135deg, #0d2137, #0066a8); scroll-margin-top: 110px;
}
.quote-mark { font-size: 6rem; color: rgba(0,201,212,0.15); line-height: 0.5; display: block; margin-bottom: -20px; }
.quote-text {
  font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.3rem;
  color: white; line-height: 1.4; max-width: 720px; margin: 0 auto 20px;
}
@media (min-width: 768px) { .quote-text { font-size: 1.8rem; } }
.quote-highlight {
  background: linear-gradient(135deg, #00c9d4, #f472b6);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.quote-sub { color: rgba(255,255,255,0.75); max-width: 640px; margin: 0 auto 32px; line-height: 1.7; font-size: 1rem; }

.section { padding: 80px 24px; scroll-margin-top: 110px; max-width: 1100px; margin: 0 auto; }
.section-light { background: var(--bg); max-width: none; }
.section-alt { background: linear-gradient(160deg, var(--bg-alt), var(--bg)); max-width: none; }
.section > .section-title, .section > .section-sub, .section > .audio-grid,
.section > .steps-row, .section > .compare-grid, .section > .faq-list,
.section > .testimonials-grid, .section > .features-grid, .section > .email-mock,
.section > .delivery-note, .section > .counter-bar, .section > .cta-lead,
.section > .center-cta, .section > .narrow { max-width: 1100px; margin-left: auto; margin-right: auto; }
.section-title { font-size: 2rem; font-weight: 800; text-align: center; margin: 0 0 12px; }
.section-sub { text-align: center; color: var(--text-2); line-height: 1.7; margin: 0 0 40px; }
.section-sub.narrow { max-width: 640px; margin-left: auto; margin-right: auto; }

.audio-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .audio-grid { grid-template-columns: repeat(2, 1fr); } }
.audio-card {
  background: var(--surface); border: 1px solid var(--border); border-top-width: 3px;
  border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,153,184,0.07);
}
.audio-card-header { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.audio-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; }
.audio-card-title { display: block; font-size: 0.85rem; font-weight: 600; }
.audio-quote { font-style: italic; color: var(--text-2); font-size: 0.9rem; line-height: 1.6; margin: 16px 0 0; }
.sr-only-audio {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.mini-player { display: flex; align-items: center; gap: 12px; }
.mini-play {
  width: 36px; height: 36px; border-radius: 50%; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, #00c9d4, #0066a8); color: white; cursor: pointer;
}
.mini-waves { display: flex; align-items: flex-end; gap: 2px; flex: 1; height: 24px; }
.mini-bar { width: 3px; background: #e8f4fb; border-radius: 2px; transition: background 0.3s; }
.mini-time { font-family: monospace; font-size: 0.8rem; color: var(--text-3); }

.sticky-player {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200;
  width: min(560px, calc(100vw - 48px)); display: flex; align-items: center; gap: 12px;
  background: rgba(13,33,55,0.96); backdrop-filter: blur(20px);
  border: 1px solid rgba(0,201,212,0.3); border-radius: 20px; padding: 16px 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.25);
}
.sticky-play {
  width: 44px; height: 44px; border-radius: 50%; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, var(--coral), var(--amber)); color: white; cursor: pointer;
}
.sticky-info { display: flex; flex-direction: column; min-width: 120px; }
.sticky-info span:first-child { color: white; font-weight: 600; font-size: 0.9rem; }
.sticky-time { color: rgba(255,255,255,0.5); font-family: monospace; font-size: 0.75rem; }
.sticky-waves { display: flex; align-items: flex-end; gap: 2px; flex: 1; height: 28px; }
.sticky-bar { width: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; }
.sticky-bar.played { background: linear-gradient(to top, #00c9d4, #0066a8); }
.sticky-progress { width: 60px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 3px; cursor: pointer; flex-shrink: 0; }
.sticky-progress-fill { height: 100%; background: linear-gradient(90deg, #00c9d4, #0066a8); border-radius: 3px; }
.sticky-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 1.1rem; cursor: pointer; width: 28px; }
.sticky-close:hover { color: white; }
.sticky-player-enter-active, .sticky-player-leave-active { transition: all 0.4s ease; }
.sticky-player-enter-from, .sticky-player-leave-to { opacity: 0; transform: translateX(-50%) translateY(100px); }

.steps-row {
  display: grid; grid-template-columns: 1fr; gap: 32px; position: relative;
}
@media (min-width: 768px) { .steps-row { grid-template-columns: repeat(3, 1fr); } }
.step-item { text-align: center; padding: 0 12px; }
.step-icon {
  width: 72px; height: 72px; margin: 0 auto 16px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center; font-size: 2rem;
}
.step-icon-1 { background: linear-gradient(135deg, #fff0f9, #f0f8ff); border: 2px solid #fbc8e8; }
.step-icon-2 { background: linear-gradient(135deg, #f0f8ff, #e8f4fb); border: 2px solid #b0d4e8; }
.step-icon-3 { background: linear-gradient(135deg, #fff8e8, #fff5f0); border: 2px solid #fde68a; }
.badge-coral, .badge-green, .badge-cyan, .badge-amber {
  display: inline-block; font-size: 0.72rem; font-weight: 700; border-radius: 20px; padding: 3px 10px; margin: 4px;
}
.badge-coral { background: #fff0f9; color: var(--coral); border: 1px solid #ffc8c8; }
.badge-green { background: #f0fff8; color: var(--green); border: 1px solid #bbf7d0; }
.badge-cyan { background: #f0f8ff; color: var(--primary); border: 1px solid #b0d4e8; }
.badge-amber { background: #fff8e8; color: var(--gold); border: 1px solid #fde68a; }
.step-item h3 { font-weight: 800; margin: 12px 0 8px; }
.step-item p { color: var(--text-2); line-height: 1.65; font-size: 0.95rem; }
.step-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.step-badges span { font-size: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 4px 10px; }
.counter-bar { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; margin: 48px 0 32px; }
.counter-num {
  display: block; font-size: 2.5rem; font-weight: 900;
  background: linear-gradient(135deg, var(--coral), var(--amber));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.counter-item { text-align: center; color: var(--text-2); }
.stars.big { font-size: 1.5rem; }
.cta-lead { text-align: center; color: var(--text-2); margin-bottom: 16px; }
.center-cta { display: block; margin: 0 auto; }

.compare-grid { display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 800px; }
@media (min-width: 768px) { .compare-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 767px) { .compare-good { order: -1; } }
.compare-card { border-radius: 20px; padding: 32px; }
.compare-bad { background: linear-gradient(135deg, #fff5f5, #fff8f5); border: 1px solid #fecaca; }
.compare-good {
  background: linear-gradient(135deg, #f0fff8, #f0f8ff); border: 2px solid #00c9d4;
  box-shadow: 0 8px 32px rgba(0,153,184,0.15); transition: all 0.22s;
}
.compare-good:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,153,184,0.20); }
.compare-card h3 { font-weight: 800; font-size: 1.1rem; margin-bottom: 16px; }
.compare-bad h3 { color: #ef4444; }
.compare-good h3 { color: var(--primary); }
.compare-badge {
  display: inline-block; background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: white; border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700; margin-bottom: 12px;
}
.compare-card ul { list-style: none; padding: 0; margin: 0; }
.compare-card li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); color: var(--text-2); }
.icon-x, .icon-ok {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
}
.icon-x { background: #fef2f2; color: #ef4444; }
.icon-ok { background: linear-gradient(135deg, #22c55e, #00c9d4); color: white; }

.delivery-note { text-align: center; color: var(--text-2); margin-bottom: 24px; }
.email-mock {
  background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
  padding: 28px; max-width: 480px; margin: 0 auto 40px;
  box-shadow: 0 12px 40px rgba(0,153,184,0.12);
}
.email-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.email-logo { height: 32px; width: auto; }
.vinyl-wrap { position: relative; width: 160px; height: 160px; margin: 0 auto 24px; }
.vinyl {
  width: 160px; height: 160px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #1a1a2e, #0d0d1a, #000);
  position: relative; display: flex; align-items: center; justify-content: center;
}
.vinyl.playing { animation: spin 4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.vinyl-ring {
  position: absolute; inset: 8px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
}
.vinyl-ring.r2 { inset: 20px; opacity: 0.6; }
.vinyl-ring.r3 { inset: 32px; opacity: 0.4; }
.vinyl-ring.r4 { inset: 44px; opacity: 0.2; }
.vinyl-label {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 0.85rem; z-index: 1;
}
.needle {
  position: absolute; top: 20px; right: -10px; width: 4px; height: 70px;
  background: var(--gold); border-radius: 2px; transform-origin: bottom center;
  transition: transform 0.8s ease;
}
.vinyl-controls { display: flex; align-items: center; gap: 16px; }
.vinyl-play {
  width: 52px; height: 52px; border-radius: 50%; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, #00c9d4, #0066a8); color: white; cursor: pointer; font-size: 1.1rem;
}
.vinyl-waves { display: flex; align-items: flex-end; gap: 2px; flex: 1; height: 32px; }
.vinyl-bar { width: 3px; background: #e8f4fb; border-radius: 2px; }
.vinyl-bar.played { background: linear-gradient(to top, var(--coral), var(--amber)); }
.vinyl-time { display: block; font-family: monospace; font-size: 0.8rem; color: var(--text-3); }

.features-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 40px; }
@media (min-width: 768px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
.feature-card {
  background: var(--surface); border: 1px solid var(--border); border-top-width: 3px;
  border-radius: 16px; padding: 24px; transition: all 0.22s;
}
.feature-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,153,184,0.10); }
.feature-icon { font-size: 2rem; display: block; margin-bottom: 12px; }
.feature-card h4 { font-weight: 700; margin: 0 0 8px; font-size: 1rem; }
.feature-card p { color: var(--text-2); font-size: 0.875rem; line-height: 1.6; margin: 0; }
.vip-badge { font-size: 0.65rem; background: #fff8e8; color: var(--gold); border: 1px solid #fde68a; border-radius: 12px; padding: 2px 8px; margin-left: 6px; }

.guarantee-section {
  position: relative; padding: 64px 24px;
  background: linear-gradient(135deg, #0d2137, #0066a8); scroll-margin-top: 110px;
}
.guarantee-inner {
  max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column;
  align-items: center; gap: 32px;
}
@media (min-width: 768px) { .guarantee-inner { flex-direction: row; gap: 48px; } }
.shield-icon {
  width: 100px; height: 100px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #22c55e, #00c9d4);
  display: flex; align-items: center; justify-content: center; font-size: 2.5rem;
  animation: shieldPulse 2s ease infinite;
}
@keyframes shieldPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.guarantee-inner h2 { color: white; font-weight: 800; font-size: 1.8rem; margin: 0 0 16px; }
.guarantee-inner > div > p { color: rgba(255,255,255,0.80); line-height: 1.7; margin: 0 0 20px; }
.guarantee-pills { display: flex; flex-wrap: wrap; gap: 12px; }
.guarantee-pills span {
  background: rgba(34,197,94,0.15); color: #4ade80;
  border: 1px solid rgba(34,197,94,0.3); border-radius: 20px; padding: 6px 14px; font-size: 0.85rem; font-weight: 600;
}

.testimonials-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .testimonials-grid { grid-template-columns: repeat(3, 1fr); } }
.testimonial-card {
  background: var(--surface); border: 1px solid var(--border); border-top-width: 3px;
  border-radius: 20px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  transition: all 0.22s;
}
.testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.10); }
.testimonial-card p { font-style: italic; color: var(--text-2); line-height: 1.65; font-size: 0.95rem; margin: 12px 0 20px; }
.testimonial-card footer { display: flex; align-items: center; gap: 12px; }
.t-avatar {
  width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;
}
.role-pill { display: inline-block; font-size: 0.75rem; font-weight: 600; border-radius: 20px; padding: 3px 10px; border: 1px solid; margin-top: 4px; }

.faq-list { max-width: 760px; }
.faq-item {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  margin-bottom: 8px; overflow: hidden; transition: all 0.3s;
}
.faq-item.open { border-color: var(--primary); box-shadow: 0 4px 16px rgba(0,153,184,0.10); }
.faq-header {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; background: none; border: none; cursor: pointer; text-align: left;
  font-weight: 600; color: var(--text); font-size: 0.95rem; font-family: inherit;
}
.faq-header:hover { background: rgba(0,153,184,0.04); }
.faq-chevron { color: var(--primary); transition: transform 0.3s; flex-shrink: 0; }
.faq-item.open .faq-chevron { transform: rotate(180deg); }
.faq-body { padding: 0 24px 20px; color: var(--text-2); line-height: 1.7; font-size: 0.95rem; }

.client-section {
  position: relative; text-align: center; padding: 64px 24px;
  background: linear-gradient(135deg, #0d2137, #0066a8); scroll-margin-top: 110px;
}
.client-section h2 { color: white; font-weight: 800; font-size: 1.8rem; margin: 0 0 16px; }
.client-section > p { color: rgba(255,255,255,0.75); max-width: 560px; margin: 0 auto 28px; line-height: 1.7; }
.btn-client {
  display: inline-block; background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.3);
  color: white; border-radius: 14px; padding: 14px 36px; font-weight: 700; text-decoration: none; transition: all 0.22s;
}
.btn-client:hover { background: rgba(255,255,255,0.20); border-color: rgba(255,255,255,0.6); }

.cta-final {
  position: relative; text-align: center; padding: 80px 24px; background: var(--bg); scroll-margin-top: 110px;
}
.pill-final {
  display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 20px;
  background: linear-gradient(135deg, #f0f8ff, #eef5fb); color: var(--primary); font-weight: 700; font-size: 0.85rem;
}
.final-title {
  font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 800; margin: 0 0 8px;
}
.final-sub { color: var(--text-2); margin-bottom: 20px; }
.final-desc { color: var(--text-2); max-width: 560px; margin: 0 auto 32px; line-height: 1.7; }
.final-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 24px; margin: 24px 0 40px; font-weight: 600; font-size: 0.9rem; }
.final-badges span:nth-child(1) { color: var(--green); }
.final-badges span:nth-child(2) { color: var(--primary); }
.final-badges span:nth-child(3) { color: #fff; }
.contact-block p { color: var(--text-2); margin: 8px 0; }
.contact-block a { color: var(--primary); font-weight: 600; text-decoration: none; }
.contact-block a:hover { text-decoration: underline; }

.footer {
  background: #0d2137; padding: 48px 24px 32px; border-top: 1px solid rgba(255,255,255,0.08);
}
.footer-grid {
  max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 32px;
}
@media (min-width: 768px) { .footer-grid { grid-template-columns: repeat(3, 1fr); } }
.footer-logo { height: 40px; width: auto; margin-bottom: 16px; filter: brightness(1.1); }
.footer p { color: rgba(255,255,255,0.55); font-size: 0.875rem; line-height: 1.6; margin: 0 0 12px; }
.footer-love { color: rgba(255,255,255,0.40) !important; font-size: 0.8rem !important; }
.footer h4 {
  color: rgba(255,255,255,0.40); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 16px;
}
.footer-grid button, .footer-grid a {
  display: block; background: none; border: none; padding: 6px 0; cursor: pointer;
  color: rgba(255,255,255,0.65); font-size: 0.875rem; text-decoration: none; text-align: left; font-family: inherit;
}
.footer-grid button:hover, .footer-grid a:hover { color: #00c9d4; }
.footer-secure {
  display: inline-block; margin-top: 12px; padding: 6px 12px;
  border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; font-size: 0.8rem !important;
  color: #fff;
}
.footer-bottom {
  max-width: 1100px; margin: 32px auto 0; padding-top: 32px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;
}
.footer-bottom > span { color: rgba(255,255,255,0.35); font-size: 0.8rem; }
.payment-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.payment-pills span {
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.50);
  border: 1px solid rgba(255,255,255,0.10); border-radius: 6px; padding: 4px 10px; font-size: 0.75rem;
}

.orb {
  position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;
  animation: float 16s ease-in-out infinite;
}
.orb-cyan { width: 400px; height: 400px; top: -100px; left: -100px; background: #00c9d4; opacity: 0.10; }
.orb-violet { width: 350px; height: 350px; top: -80px; right: -80px; background: #a855f7; opacity: 0.07; animation-duration: 20s; animation-direction: reverse; }
.orb-coral { width: 280px; height: 280px; bottom: 0; left: 20%; background: #ff6b6b; opacity: 0.06; animation-duration: 18s; }
.orb-quote { width: 300px; height: 300px; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #00c9d4; opacity: 0.15; }
.orb-green { width: 250px; height: 250px; top: 0; right: 10%; background: #22c55e; opacity: 0.10; }
.orb-client { width: 300px; height: 300px; top: 0; left: 50%; transform: translateX(-50%); background: #00c9d4; opacity: 0.12; }
.orb-cyan-sm { width: 200px; height: 200px; top: 20%; left: -50px; background: #00c9d4; opacity: 0.08; }
.orb-coral-sm { width: 180px; height: 180px; bottom: 10%; right: -40px; background: #ff6b6b; opacity: 0.07; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-24px); }
}

.animate-section {
  opacity: 0; transform: translateY(32px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.animate-section.visible { opacity: 1; transform: translateY(0); }

.hero-inner > * { position: relative; z-index: 1; }
.quote-section > *:not(.orb) { position: relative; z-index: 1; }

@media (max-width: 767px) {
  .topbar-badge-row { padding: 6px 16px; }
  .topbar-badge { font-size: 0.7rem; padding: 5px 10px; }
  .topbar-main { min-height: 56px; padding: 0 16px; }
  .topbar-logo .logo-img { height: 52px; }
  .hide-mobile { display: none !important; }
  .show-mobile { display: block !important; }
  .hero { padding-top: 148px; }
  .section-title { font-size: 1.6rem; }
  .final-title { font-size: 1.8rem; }
  .btn-cta, .btn-secondary { width: 100%; justify-content: center; }
  .footer-grid { text-align: center; }
  .footer-grid button, .footer-grid a { text-align: center; width: 100%; }
  .footer-bottom { justify-content: center; text-align: center; }
  .sticky-player { flex-wrap: wrap; padding: 12px 16px; }
  .sticky-waves { display: none; }
}
@media (min-width: 768px) {
  .section { padding-left: 32px; padding-right: 32px; }
}
@media (min-width: 1024px) {
  .topbar-main, .section, .hero-inner, .guarantee-inner, .footer-grid, .footer-bottom { padding-left: 0; padding-right: 0; }
}
</style>
