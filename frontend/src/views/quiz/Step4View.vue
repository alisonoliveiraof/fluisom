<script setup>
import { useQuiz } from '../../composables/useQuiz'

const {
  honoredDisplay,
  videoPlaying,
  videoProgress,
  videoWaveBars,
  toggleVideo,
  goNext,
  goBack,
} = useQuiz()
</script>

<template>
  <section class="step step-center">
    <div class="banner-emotional">
      🎶 Sua música está sendo preparada com carinho especial para <strong>{{ honoredDisplay }}</strong>
    </div>
    <div class="bounce-icon">🎶</div>
    <h1 class="title">Você está quase lá!</h1>
    <p class="subtitle">
      A um passo de presentear <span class="highlight-name">{{ honoredDisplay }}</span> com uma música que vai fluir para sempre em seu coração...
    </p>

    <div class="video-player">
      <div class="video-inner">
        <button type="button" class="play-btn play-btn-lg" @click="toggleVideo">
          {{ videoPlaying ? '⏸' : '▶' }}
        </button>
        <span class="video-badge">3:00</span>
        <span class="video-label">Como funciona a entrega</span>
        <div class="video-progress-track">
          <div class="video-progress-fill" :style="{ width: videoProgress + '%' }" />
        </div>
        <div class="video-waves">
          <span
            v-for="bar in videoWaveBars"
            :key="bar"
            class="video-wave-bar"
            :style="{ animationDelay: bar * 0.1 + 's' }"
          />
        </div>
      </div>
    </div>

    <nav class="nav nav-center">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
      <button type="button" class="btn-next" @click="goNext">
        Próximo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>
