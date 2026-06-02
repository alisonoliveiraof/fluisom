<script setup>
import { onMounted } from 'vue'
import { useQuiz } from '../../composables/useQuiz'

const {
  form,
  orderId,
  honoredDisplay,
  showConfetti,
  confettiEmojis,
  resetQuiz,
} = useQuiz()

onMounted(() => {
  showConfetti.value = true
})
</script>

<template>
  <section class="step step-confirm">
    <div v-if="showConfetti" class="confetti-wrap" aria-hidden="true">
      <span
        v-for="(emoji, i) in confettiEmojis"
        :key="i"
        class="confetti-item"
        :style="{ left: 5 + i * 8 + '%', animationDelay: i * 0.15 + 's' }"
      >{{ emoji }}</span>
    </div>

    <div class="check-animation">
      <svg viewBox="0 0 200 200" class="check-svg">
        <defs>
          <linearGradient id="checkGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00c9d4" />
            <stop offset="1" stop-color="#22c55e" />
          </linearGradient>
        </defs>
        <circle class="check-circle-bg" cx="100" cy="100" r="90" />
        <circle class="check-circle" cx="100" cy="100" r="90" />
        <path class="check-mark" d="M60 100 L88 128 L140 72" fill="none" />
      </svg>
    </div>

    <h1 class="title title-confirm">Pedido Confirmado! 🎉</h1>
    <p class="subtitle center">
      Sua música para <span class="highlight-name">{{ honoredDisplay }}</span> está sendo criada com muito carinho.
    </p>

    <div class="confirm-card">
      <p><span>📦</span> Order ID: <strong class="mono">{{ orderId }}</strong></p>
      <p><span>📧</span> Entrega: <strong>{{ form.email }}</strong></p>
      <p class="text-success"><span>⏱️</span> Prazo: Em breve no seu email</p>
      <p class="confirm-msg">Você receberá um email em <strong>{{ form.email }}</strong> assim que sua música estiver pronta.</p>
    </div>

    <button type="button" class="btn-outline" @click="resetQuiz">🎵 Criar outra música</button>
  </section>
</template>
