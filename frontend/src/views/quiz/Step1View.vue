<script setup>
import { useQuiz } from '../../composables/useQuiz'

const { form, relationships, canProceed, goNext } = useQuiz()
</script>

<template>
  <section class="step">
    <div class="pill pill-coral">🎵 Personalização</div>
    <h1 class="title">Para quem é essa música?</h1>
    <p class="subtitle">Escolha o tipo de relacionamento para personalizar sua canção</p>

    <div class="grid-relationships">
      <button
        v-for="(rel, i) in relationships"
        :key="rel.value"
        type="button"
        class="select-card"
        :class="{ selected: form.relationship === rel.value }"
        :style="{ '--card-color': rel.color, animationDelay: i * 0.04 + 's' }"
        @click="form.relationship = rel.value"
      >
        <span v-if="form.relationship === rel.value" class="card-dot" :style="{ background: rel.color }" />
        <span v-if="form.relationship === rel.value" class="card-check">✓</span>
        <span class="card-emoji">{{ rel.emoji }}</span>
        <span class="card-label">{{ rel.label }}</span>
      </button>
    </div>

    <transition name="fade">
      <div v-if="form.relationship === 'outro'" class="field-group field-outro">
        <label class="label">Digite o Relacionamento ou Ocasião *</label>
        <input
          v-model="form.customRelationship"
          type="text"
          class="input"
          placeholder="Ex.: Casamento, Chá Revelação, Pet, Formatura…"
        />
      </div>
    </transition>

    <div class="field-group">
      <label class="label">Qual é o nome da pessoa homenageada? *</label>
      <div class="input-icon-wrap">
        <span class="input-prefix">👤</span>
        <input
          v-model="form.honoredName"
          type="text"
          class="input input-with-icon"
          placeholder="Ex.: Maria, João, Ana e Marcos"
        />
      </div>
      <p class="hint">💡 Use a acentuação correta para garantir a pronúncia (ex: Thaís, Jéssica)</p>
    </div>

    <nav class="nav nav-end">
      <button type="button" class="btn-next" :disabled="!canProceed(1)" @click="goNext">
        Próximo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </nav>
  </section>
</template>
