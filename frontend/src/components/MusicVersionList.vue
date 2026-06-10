<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  versions: { type: Array, default: () => [] },
  honoredName: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  showDownload: { type: Boolean, default: false },
  downloadingKey: { type: String, default: null },
  previewOnly: { type: Boolean, default: false },
  previewMaxSeconds: { type: Number, default: 30 },
})

const emit = defineEmits(['download'])

const playingKey = ref(null)
const audioEls = ref({})
const progressByKey = ref({})
const currentTimeByKey = ref({})
const durationByKey = ref({})

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
      progressByKey.value[id] = 0
      currentTimeByKey.value[id] = 0
    }
  }
}

function playbackUrl(version) {
  if (props.previewOnly) return version.previewAudioUrl
  return version.fullAudioUrl || version.previewAudioUrl
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function totalDuration(key) {
  if (props.previewOnly) return props.previewMaxSeconds
  return durationByKey.value[key] || 0
}

function timeDisplay(key) {
  const current = currentTimeByKey.value[key] || 0
  return `${formatTime(current)} / ${formatTime(totalDuration(key))}`
}

function progressPercent(key) {
  const total = totalDuration(key)
  if (!total) return 0
  const current = currentTimeByKey.value[key] || 0
  return Math.min(100, (current / total) * 100)
}

function onLoadedMetadata(version) {
  const key = versionKey(version)
  const el = audioEls.value[key]
  if (!el) return
  durationByKey.value[key] = el.duration || 0
}

function onTimeUpdate(version) {
  const key = versionKey(version)
  const el = audioEls.value[key]
  if (!el) return

  if (props.previewOnly && el.currentTime >= props.previewMaxSeconds) {
    el.pause()
    el.currentTime = props.previewMaxSeconds
    currentTimeByKey.value[key] = props.previewMaxSeconds
    progressByKey.value[key] = 100
    playingKey.value = null
    return
  }

  currentTimeByKey.value[key] = el.currentTime
  const total = totalDuration(key)
  progressByKey.value[key] = total ? (el.currentTime / total) * 100 : 0
}

function seek(version, event) {
  const key = versionKey(version)
  const el = audioEls.value[key]
  if (!el) return

  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const total = totalDuration(key)
  const nextTime = ratio * total

  el.currentTime = nextTime
  currentTimeByKey.value[key] = nextTime
  progressByKey.value[key] = ratio * 100
}

async function togglePlay(version) {
  const url = playbackUrl(version)
  if (!url) return

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

  if (el.src !== url) {
    el.src = url
  }

  if (props.previewOnly && el.currentTime >= props.previewMaxSeconds) {
    el.currentTime = 0
    currentTimeByKey.value[key] = 0
    progressByKey.value[key] = 0
  }

  el.load()
  el.play().catch(() => {
    playingKey.value = null
  })
}

function onEnded(version) {
  const key = versionKey(version)
  if (playingKey.value === key) playingKey.value = null
  if (props.previewOnly) {
    currentTimeByKey.value[key] = props.previewMaxSeconds
    progressByKey.value[key] = 100
  }
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
          <p v-if="previewOnly" class="version-preview-hint">Prévia de {{ previewMaxSeconds }} segundos</p>
        </div>
      </div>

      <template v-if="playbackUrl(version)">
        <audio
          :ref="(el) => setAudioEl(versionKey(version), el)"
          :src="playbackUrl(version)"
          preload="metadata"
          playsinline
          class="hidden-audio"
          @loadedmetadata="onLoadedMetadata(version)"
          @timeupdate="onTimeUpdate(version)"
          @ended="onEnded(version)"
        />

        <div class="player-controls">
          <button
            type="button"
            class="btn-play-icon"
            :class="{ playing: playingKey === versionKey(version) }"
            @click="togglePlay(version)"
          >
            {{ playingKey === versionKey(version) ? '⏸' : '▶' }}
          </button>

          <div class="player-track-wrap">
            <div class="player-time">{{ timeDisplay(versionKey(version)) }}</div>
            <div class="player-progress-track" @click="seek(version, $event)">
              <div
                class="player-progress-fill"
                :style="{ width: progressPercent(versionKey(version)) + '%' }"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn-play"
          :class="{ playing: playingKey === versionKey(version) }"
          @click="togglePlay(version)"
        >
          {{ playingKey === versionKey(version) ? '⏸ Pausar' : previewOnly ? '▶ Ouvir prévia' : '▶ Ouvir música' }}
        </button>
      </template>

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

.version-honored,
.version-preview-hint {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #4a6a80;
}

.version-preview-hint {
  color: #0099b8;
  font-weight: 600;
}

.hidden-audio {
  position: fixed;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0.01;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.btn-play-icon {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: white;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-play-icon.playing {
  background: linear-gradient(135deg, #0066a8, #004d80);
}

.player-track-wrap {
  flex: 1;
  min-width: 0;
}

.player-time {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  color: #4a6a80;
  margin-bottom: 6px;
}

.player-progress-track {
  height: 6px;
  background: #daeaf5;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
}

.player-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00c9d4, #0066a8);
  border-radius: 999px;
  transition: width 0.15s linear;
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
