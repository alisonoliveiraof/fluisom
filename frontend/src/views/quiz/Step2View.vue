<script setup>
import { useQuiz } from '../../composables/useQuiz'

const {
  form,
  honoredDisplay,
  qualitiesProgress,
  momentsProgress,
  canProceed,
  goNext,
  goBack,
} = useQuiz()
</script>

<template>
  <section class="step">
    <div class="pill pill-violet">💜 Sua história</div>
    <h1 class="title">Sua história, memórias e datas favoritas</h1>
    <p class="subtitle">
      Quanto mais detalhes você escrever, melhor a letra que criaremos! Fique tranquilo(a), você pode colocar mais informações antes de finalizar o pedido.
    </p>

    <div class="field-group">
      <label class="label">
        O que torna <span class="highlight-coral">{{ honoredDisplay }}</span> tão especial para você? *
      </label>
      <textarea v-model="form.specialQualities" class="textarea" rows="5" maxlength="500" placeholder="Conte o que faz essa pessoa única na sua vida…" />
      <div class="progress-field">
        <div class="progress-track"><div class="progress-fill" :style="{ width: qualitiesProgress.pct + '%', background: qualitiesProgress.fill }" /></div>
        <div class="progress-meta">
          <span class="progress-msg" :style="{ color: qualitiesProgress.msgColor }">{{ qualitiesProgress.msg }}</span>
          <span class="counter">{{ form.specialQualities.length }}/500</span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <label class="label">
        Momentos especiais juntos com <span class="highlight-violet">{{ honoredDisplay }}</span> *
      </label>
      <textarea v-model="form.specialMoments" class="textarea" rows="5" maxlength="500" placeholder="Datas importantes, viagens, conquistas…" />
      <div class="progress-field">
        <div class="progress-track"><div class="progress-fill" :style="{ width: momentsProgress.pct + '%', background: momentsProgress.fill }" /></div>
        <div class="progress-meta">
          <span class="progress-msg" :style="{ color: momentsProgress.msgColor }">{{ momentsProgress.msg }}</span>
          <span class="counter">{{ form.specialMoments.length }}/500</span>
        </div>
      </div>
    </div>

    <div class="field-group">
      <label class="label">
        Uma mensagem especial
        <span class="badge-optional">opcional</span>
      </label>
      <textarea v-model="form.specialMessage" class="textarea" rows="4" maxlength="400" placeholder="Uma dedicatória, promessa ou desejo do fundo do coração…" />
      <p class="hint">💌 Escreva do fundo do coração — essa parte costuma emocionar mais</p>
    </div>

    <nav class="nav">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
      <button type="button" class="btn-next" :disabled="!canProceed(2)" @click="goNext">
        Próximo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>
