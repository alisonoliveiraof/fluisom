<script setup>
import { useQuiz } from '../../composables/useQuiz'
import VturbPlayer from '../../components/VturbPlayer.vue'

const { honoredDisplay, goNext, goBack } = useQuiz()
</script>

<template>
  <section class="step step-center">
    <div class="banner-emotional">
      🎶 Sua música está sendo preparada com carinho especial para <strong>{{ honoredDisplay }}</strong>
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
      <button type="button" class="btn-next" @click="goNext">
        Próximo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>
