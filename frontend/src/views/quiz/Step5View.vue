<script setup>
import { useQuiz } from '../../composables/useQuiz'

const {
  form,
  honoredDisplay,
  waveHeights,
  playedBars,
  audioPlaying,
  audioProgress,
  audioTimeDisplay,
  toggleAudio,
  guarantees,
  testimonials,
  canProceed,
  goToPayment,
  goBack,
  onWhatsappInput,
  previewData,
  previewAudioEl,
  previewLoading,
  generationError,
} = useQuiz()

function onPreviewEnded() {
  audioPlaying.value = false
}
</script>

<template>
  <section class="step">
    <div class="banner-celebrate">✨ Sua prévia exclusiva está pronta! Ouça antes de finalizar.</div>

    <div v-if="previewLoading" class="preview-loading">
      <div class="spinner" />
      <p>Preparando sua prévia para reprodução…</p>
    </div>

    <div v-else-if="generationError && !previewData" class="preview-error">
      <p>{{ generationError }}</p>
    </div>

    <template v-else-if="previewData">
      <div class="preview-hero">
        <div v-if="previewData.coverImageUrl" class="preview-cover-wrap">
          <img :src="previewData.coverImageUrl" :alt="previewData.musicTitle || 'Capa da música'" class="preview-cover" />
        </div>
        <div v-else class="preview-cover-placeholder">🎵</div>

        <p v-if="previewData.musicTitle" class="preview-title">{{ previewData.musicTitle }}</p>
        <p class="preview-subtitle">Prévia para {{ previewData.honoredName || honoredDisplay }}</p>

        <audio
          v-if="previewData.previewAudioUrl"
          ref="previewAudioEl"
          :src="previewData.previewAudioUrl"
          preload="metadata"
          @ended="onPreviewEnded"
        />

        <div class="audio-player preview-player">
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
            <button type="button" class="play-btn play-btn-lg" @click="toggleAudio">
              {{ audioPlaying ? '⏸' : '▶' }}
            </button>
            <div class="audio-info">
              <span class="audio-name">Ouça sua prévia exclusiva</span>
              <span class="audio-time">{{ audioTimeDisplay }}</span>
            </div>
          </div>
          <div class="audio-progress-track">
            <div class="audio-progress-fill" :style="{ width: audioProgress + '%' }" />
          </div>
          <p class="preview-hint">🔊 Toque em play para ouvir como ficou a sua música</p>
        </div>

        <div v-if="previewData.lyricsPreview" class="lyrics-preview">
          <p class="lyrics-label">Trecho da letra</p>
          <p v-for="(line, i) in previewData.lyricsPreview.split('\n')" :key="i">{{ line }}</p>
        </div>
      </div>
    </template>

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
        <p class="hint">🔒 Use este email para acessar seus pedidos em "Meus Pedidos".</p>
      </div>
      <div class="field-group">
        <label class="label">
          WhatsApp
          <span class="badge-recommended">recomendado</span>
        </label>
        <div class="input-icon-wrap">
          <span class="input-prefix input-prefix-br">🇧🇷 +55</span>
          <input
            :value="form.whatsapp"
            type="tel"
            class="input input-with-icon input-br"
            placeholder="(00) 00000-0000"
            inputmode="numeric"
            maxlength="15"
            @input="onWhatsappInput"
          />
        </div>
      </div>
      <label class="discrete-box" @click="form.discreteMode = !form.discreteMode">
        <span class="checkbox-custom" :class="{ checked: form.discreteMode }">
          <span v-if="form.discreteMode">✓</span>
        </span>
        <span>
          <span class="discrete-title">🎁 É um presente surpresa? (Modo Discreto)</span>
          <span class="discrete-desc">Não enviaremos notificações que possam estragar a surpresa</span>
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

<style scoped>
.preview-loading,
.preview-error {
  text-align: center;
  padding: 32px 16px;
  color: #4a6a80;
}

.preview-error {
  color: #ef4444;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border: 3px solid #daeaf5;
  border-top-color: #0099b8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-hero {
  margin-bottom: 24px;
}

.preview-cover-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.preview-cover {
  width: 160px;
  height: 160px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 153, 184, 0.2);
}

.preview-cover-placeholder {
  width: 160px;
  height: 160px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.preview-title {
  text-align: center;
  font-weight: 800;
  font-size: 1.2rem;
  color: #0099b8;
  margin-bottom: 4px;
}

.preview-subtitle {
  text-align: center;
  color: #4a6a80;
  margin-bottom: 16px;
}

.preview-player {
  margin-bottom: 16px;
}

.play-btn-lg {
  width: 56px !important;
  height: 56px !important;
  font-size: 1.4rem !important;
}

.preview-hint {
  text-align: center;
  font-size: 0.85rem;
  color: #0099b8;
  margin: 12px 0 0;
  font-weight: 600;
}

.lyrics-preview {
  background: #ffffff;
  border: 1px solid #daeaf5;
  border-radius: 12px;
  padding: 14px 16px;
  text-align: center;
  color: #4a6a80;
  font-size: 0.92rem;
  line-height: 1.6;
}

.lyrics-label {
  font-weight: 700;
  color: #0099b8;
  margin: 0 0 8px;
}

.lyrics-preview p {
  margin: 0 0 4px;
}
</style>
