<script setup>
import { computed } from 'vue'
import FluisomLogo from './FluisomLogo.vue'
import { useQuiz } from '../composables/useQuiz'

const { currentStep, progressPercent } = useQuiz()
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <FluisomLogo />
      <div class="progress-section">
        <span class="progress-label">Passo {{ currentStep }} de 7</span>
        <div class="progress-dots">
          <span
            v-for="n in 7"
            :key="n"
            class="dot"
            :class="{
              done: n < currentStep,
              active: n === currentStep,
              inactive: n > currentStep,
            }"
          />
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
    </div>
  </header>
</template>
