<script setup>
import { onMounted } from 'vue'
import { loadVturbPlayerAssets } from '../utils/vturb'

const PLAYER_ELEMENT_ID = 'vid-6a1f5eb1302e1bc3400efe9e'

onMounted(() => {
  loadVturbPlayerAssets()
})
</script>

<template>
  <vturb-smartplayer
    :id="PLAYER_ELEMENT_ID"
    class="vturb-embed"
  />
</template>

<style scoped>
.vturb-embed {
  display: block;
  margin: 0 auto;
  width: 100%;
}
</style>
