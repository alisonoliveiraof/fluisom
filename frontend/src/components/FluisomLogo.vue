<script setup>
import { LOGO_URL } from '../constants'

defineProps({
  small: { type: Boolean, default: false },
})
</script>

<template>
  <div class="logo" :class="{ 'logo-sm': small }">
    <img
      :src="LOGO_URL"
      alt="Fluisom"
      class="logo-img"
      width="160"
      height="42"
    />
  </div>
</template>
