<script setup>
import { computed } from 'vue'
import { useQuiz } from '../../composables/useQuiz'
import VturbPlayer from '../../components/VturbPlayer.vue'

const {
  honoredDisplay,
  goNext,
  goBack,
  generationProgress,
  generationStatusLabel,
  generationError,
  generationStatus,
  previewData,
} = useQuiz()

const canContinue = computed(() =>
  ['music_ready', 'preview_shown'].includes(generationStatus.value) || !!previewData.value,
)
</script>

<template>
  <section class="step step-center">
    <div class="banner-emotional">
      🎶 Sua música está sendo preparada com carinho especial para <strong>{{ honoredDisplay }}</strong>
    </div>

    <div class="generation-progress">
      <div class="progress-bar" :style="{ width: Math.max(0, generationProgress) + '%' }" />
      <p class="progress-status">{{ generationStatusLabel }}</p>
      <p v-if="generationError" class="progress-error">{{ generationError }}</p>
    </div>

    <div class="bounce-icon">🎶</div>
    <h1 class="title">Você está quase lá!</h1>
    <p class="subtitle">
      A um passo de presentear <span class="highlight-name">{{ honoredDisplay }}</span> com uma música que vai fluir para sempre em seu coração. Enquanto produzimos sua música personalizada, assista este vídeo importante que irá explicar como funcionará a entrega.
    </p>

    <div class="video-player vturb-player-wrap">
      <VturbPlayer />
    </div>

    <nav class="nav nav-center">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
      <button type="button" class="btn-next" :disabled="!canContinue" @click="goNext">
        Próximo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.generation-progress {
  width: 100%;
  max-width: 480px;
  margin: 0 auto 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #daeaf5;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 24px rgba(0, 153, 184, 0.08);
}

.generation-progress .progress-bar {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  transition: width 0.6s ease;
  min-width: 2%;
}

.progress-status {
  margin: 12px 0 0;
  text-align: center;
  color: #4a6a80;
  font-size: 0.95rem;
  font-weight: 600;
}

.progress-error {
  margin: 8px 0 0;
  text-align: center;
  color: #ef4444;
  font-size: 0.85rem;
}
</style>
