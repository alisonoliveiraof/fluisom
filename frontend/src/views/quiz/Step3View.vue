<script setup>
import { useQuiz } from '../../composables/useQuiz'

const { form, genres, canProceed, goNext, goBack, generationLoading } = useQuiz()
</script>

<template>
  <section class="step">
    <div class="pill pill-cyan">🎸 Estilo musical</div>
    <h1 class="title">Escolha um Gênero Musical</h1>
    <p class="subtitle">Qual o estilo mais combina? Selecione o estilo musical para sua canção</p>

    <div class="grid-genres">
      <button
        v-for="(g, i) in genres"
        :key="g.value"
        type="button"
        class="select-card select-card-sm"
        :class="{ selected: form.genre === g.value }"
        :style="{ '--card-color': g.color, animationDelay: i * 0.04 + 's' }"
        @click="form.genre = g.value"
      >
        <span v-if="form.genre === g.value" class="card-dot" :style="{ background: g.color }" />
        <span v-if="form.genre === g.value" class="card-check">✓</span>
        <span class="card-emoji">{{ g.emoji }}</span>
        <span class="card-label">{{ g.label }}</span>
      </button>
    </div>

    <div class="divider-gradient" />

    <div class="voice-section">
      <label class="label">Qual voz você prefere? *</label>
      <p class="hint">Recomendamos escolher seu próprio gênero para que os vocais soem mais pessoais</p>
      <div class="voice-grid">
        <button type="button" class="voice-card" :class="{ selected: form.voice === 'masculino' }" @click="form.voice = 'masculino'">
          <span v-if="form.voice === 'masculino'" class="card-check voice-check-m">✓</span>
          <span class="voice-emoji">🎤</span>
          <span class="voice-title">Voz Masculina</span>
          <span class="voice-desc">Tom grave e encorpado</span>
        </button>
        <button type="button" class="voice-card voice-card-f" :class="{ selected: form.voice === 'feminino' }" @click="form.voice = 'feminino'">
          <span v-if="form.voice === 'feminino'" class="card-check voice-check-f">✓</span>
          <span class="voice-emoji">🎵</span>
          <span class="voice-title">Voz Feminina</span>
          <span class="voice-desc">Tom claro e delicado</span>
        </button>
      </div>
    </div>

    <nav class="nav">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
      <button type="button" class="btn-next" :disabled="!canProceed(3) || generationLoading" @click="goNext">
        {{ generationLoading ? 'Iniciando...' : 'Próximo' }}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>
