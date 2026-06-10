<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  versions: { type: Array, default: () => [] },
  honoredName: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  showDownload: { type: Boolean, default: false },
  downloadingKey: { type: String, default: null },
})

const emit = defineEmits(['download'])

const playingKey = ref(null)
const audioEls = ref({})

function versionKey(version) {
  return `v${version.version}`
}

function setAudioEl(key, el) {
  if (el) audioEls.value[key] = el
  else delete audioEls.value[key]
}

function pauseAllExcept(key) {
  for (const [id, el] of Object.entries(audioEls.value)) {
    if (id !== key && el) {
      el.pause()
      el.currentTime = 0
    }
  }
}

function playbackUrl(version) {
  return version.previewAudioUrl || version.fullAudioUrl
}

async function togglePlay(version) {
  if (!playbackUrl(version)) return

  await nextTick()
  const key = versionKey(version)
  const el = audioEls.value[key]
  if (!el) return

  if (playingKey.value === key) {
    el.pause()
    playingKey.value = null
    return
  }

  pauseAllExcept(key)
  playingKey.value = key
  if (el.src !== playbackUrl(version)) {
    el.src = playbackUrl(version)
  }
  el.load()
  el.play().catch(() => {
    playingKey.value = null
  })
}

function onEnded(version) {
  if (playingKey.value === versionKey(version)) playingKey.value = null
}

onBeforeUnmount(() => {
  Object.values(audioEls.value).forEach((el) => el?.pause())
})
</script>

<template>
  <div class="version-list" :class="{ compact }">
    <article
      v-for="version in versions"
      :key="version.version"
      class="version-card"
    >
      <div class="version-top">
        <img
          v-if="version.coverImageUrl"
          :src="version.coverImageUrl"
          :alt="version.title"
          class="version-cover"
        />
        <div v-else class="version-cover placeholder">🎵</div>
        <div class="version-info">
          <h3 class="version-title">{{ version.title }}</h3>
          <p v-if="honoredName" class="version-honored">Para: {{ honoredName.trim() }}</p>
        </div>
      </div>

      <audio
        v-if="playbackUrl(version)"
        :ref="(el) => setAudioEl(versionKey(version), el)"
        :src="playbackUrl(version)"
        preload="auto"
        playsinline
        class="hidden-audio"
        @ended="onEnded(version)"
      />

      <button
        v-if="playbackUrl(version)"
        type="button"
        class="btn-play"
        :class="{ playing: playingKey === versionKey(version) }"
        @click="togglePlay(version)"
      >
        {{ playingKey === versionKey(version) ? '⏸ Pausar' : '▶ Ouvir prévia' }}
      </button>

      <button
        v-if="showDownload && version.fullAudioUrl"
        type="button"
        class="btn-download"
        :disabled="downloadingKey === versionKey(version)"
        @click="emit('download', version)"
      >
        {{ downloadingKey === versionKey(version) ? 'Baixando…' : '⬇ Baixar' }}
      </button>
    </article>
  </div>
</template>

<style scoped>
.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.version-list.compact .version-card {
  padding: 14px;
}

.version-card {
  background: #f7f9ff;
  border: 1px solid #daeaf5;
  border-radius: 14px;
  padding: 16px;
}

.version-top {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.version-cover {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.version-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  font-size: 1.25rem;
}

.version-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0d2137;
  line-height: 1.35;
}

.version-honored {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #4a6a80;
}

.hidden-audio {
  position: fixed;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0.01;
}

.btn-play {
  width: 100%;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 11px;
  font-weight: 700;
  cursor: pointer;
}

.btn-play.playing {
  background: linear-gradient(135deg, #0066a8, #004d80);
}

.btn-download {
  width: 100%;
  margin-top: 8px;
  background: linear-gradient(135deg, #22c55e, #00c9d4);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn-download:disabled {
  opacity: 0.7;
  cursor: wait;
}
</style>
