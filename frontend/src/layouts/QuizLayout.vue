<script setup>
import QuizHeader from '../components/QuizHeader.vue'
import { provideQuiz } from '../composables/useQuiz'
import '../assets/quiz.css'

provideQuiz()
</script>

<template>
  <div class="quiz-app">
    <div class="bg-gradient-animated" aria-hidden="true" />
    <div class="orb orb-1" aria-hidden="true" />
    <div class="orb orb-2" aria-hidden="true" />
    <div class="orb orb-3" aria-hidden="true" />
    <div class="orb orb-4" aria-hidden="true" />

    <QuizHeader />

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="slide-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>
