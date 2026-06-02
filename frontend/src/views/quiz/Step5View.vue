<script setup>
import { useQuiz } from '../../composables/useQuiz'

const {
  form,
  honoredDisplay,
  waveHeights,
  playedBars,
  audioPlaying,
  audioProgress,
  audioLocked,
  audioTimeDisplay,
  toggleAudio,
  guarantees,
  testimonials,
  canProceed,
  goToPayment,
  goBack,
} = useQuiz()
</script>

<template>
  <section class="step">
    <div class="banner-celebrate">✨ Sua prévia exclusiva está pronta! Ouça antes de finalizar.</div>

    <div class="audio-player">
      <div class="waveform">
        <span
          v-for="(h, i) in waveHeights"
          :key="i"
          class="wave-bar"
          :class="{ played: i < playedBars }"
          :style="{ height: h + 'px' }"
        />
      </div>
      <div class="audio-controls">
        <button type="button" class="play-btn" @click="toggleAudio">{{ audioPlaying ? '⏸' : '▶' }}</button>
        <div class="audio-info">
          <span class="audio-name">Prévia — {{ honoredDisplay }}</span>
          <span class="audio-time">{{ audioTimeDisplay }}</span>
        </div>
      </div>
      <div class="audio-progress-track" @click="audioProgress = Math.min(100, audioProgress + 20)">
        <div class="audio-progress-fill" :style="{ width: audioProgress + '%' }" />
      </div>
      <transition name="fade">
        <div v-if="audioLocked" class="audio-overlay">
          <span class="overlay-lock">🔒</span>
          <p class="overlay-title">Prévia Exclusiva</p>
          <p class="overlay-desc">Versão completa disponível após o pagamento</p>
        </div>
      </transition>
    </div>

    <div class="contact-section">
      <h2 class="section-title">📬 Para onde enviamos sua música?</h2>
      <div class="field-group">
        <label class="label">Seu nome completo *</label>
        <div class="input-icon-wrap">
          <span class="input-prefix">👤</span>
          <input v-model="form.fullName" type="text" class="input input-with-icon" placeholder="Seu nome completo" />
        </div>
      </div>
      <div class="field-group">
        <label class="label">Email *</label>
        <div class="input-icon-wrap">
          <span class="input-prefix">📧</span>
          <input v-model="form.email" type="email" class="input input-with-icon" placeholder="seu@email.com" />
        </div>
        <p class="hint">🔒 Sem spam. Jamais compartilhamos seus dados.</p>
      </div>
      <div class="field-group">
        <label class="label">
          WhatsApp
          <span class="badge-recommended">recomendado</span>
        </label>
        <div class="input-icon-wrap">
          <span class="input-prefix input-prefix-br">🇧🇷 +55</span>
          <input v-model="form.whatsapp" type="tel" class="input input-with-icon input-br" placeholder="(00) 00000-0000" />
        </div>
      </div>
      <label class="discrete-box" @click="form.discreteMode = !form.discreteMode">
        <span class="checkbox-custom" :class="{ checked: form.discreteMode }">
          <span v-if="form.discreteMode">✓</span>
        </span>
        <span>
          <span class="discrete-title">🎁 É um presente surpresa? (Modo Discreto)</span>
          <span class="discrete-desc">Não enviaremos notificações que possam entregar a surpresa</span>
        </span>
      </label>
    </div>

    <div class="guarantees-section">
      <h2 class="section-title center">Sua compra é 100% protegida</h2>
      <div class="guarantees-grid">
        <div v-for="g in guarantees" :key="g.title" class="guarantee-card">
          <span class="guarantee-icon">{{ g.icon }}</span>
          <span class="guarantee-title">{{ g.title }}</span>
          <span class="guarantee-desc">{{ g.desc }}</span>
        </div>
      </div>
    </div>

    <button type="button" class="btn-cta" :disabled="!canProceed(5)" @click="goToPayment">
      🎵 Continuar para o pagamento — R$ 47,90
    </button>
    <p class="cta-sub">Pronto para criar algo especial para {{ honoredDisplay }}? ✨</p>

    <div class="testimonials-section">
      <h2 class="section-title center">❤️ O que os nossos clientes dizem</h2>
      <p class="subtitle center">Histórias reais de quem já presenteou com a Fluisom</p>
      <div class="testimonials-grid">
        <article
          v-for="t in testimonials"
          :key="t.name"
          class="testimonial-card"
          :style="{ borderTopColor: t.color }"
        >
          <div class="stars">★★★★★</div>
          <p class="testimonial-text">"{{ t.text }}"</p>
          <div class="testimonial-author">
            <span class="avatar" :style="{ background: `linear-gradient(135deg, ${t.color}, #0066a8)` }">{{ t.initial }}</span>
            <span>
              <span class="author-name">{{ t.name }}</span>
              <span class="author-city">{{ t.city }}</span>
            </span>
          </div>
        </article>
      </div>
    </div>

    <nav class="nav">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
    </nav>
  </section>
</template>
