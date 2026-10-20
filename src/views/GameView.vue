<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { WS_URL } from '@/api/http'
import { listGameShips, type ShipInfo } from '@/api/projects'
import { showError } from '@/alerts'
import ShipHangar from '@/components/ShipHangar.vue'
import ShipThumbnail from '@/components/ShipThumbnail.vue'
import { Game } from '@/game/Game'
import { sound, type Volumes } from '@/game/sound'
import { requestTiltPermission } from '@/game/tilt'
import { locale, t } from '@/i18n'
import { toggleFullscreen, type TouchMode } from '@/game/touchInput'
import { showAlert } from '@/alerts'
import { session } from '@/session'

const GUEST_NAME_KEY = 'ships3d.guestName'
const SHIP_KEY = 'ships3d.lastShip'
const TOUCH_MODE_KEY = 'ships3d.touchMode'
const MODE_KEY = 'ships3d.gameMode'

type GameMode = 'free' | 'assault'
const mode = ref<GameMode>(readStorage(MODE_KEY) === 'assault' ? 'assault' : 'free')

// A phone or tablet: its main pointer is a finger. They get on-screen
// controls (and the choice of steering by tilting the device).
const isTouch = window.matchMedia?.('(pointer: coarse)').matches ?? false
const touchMode = ref<TouchMode>(readStorage(TOUCH_MODE_KEY) === 'tilt' ? 'tilt' : 'stick')

const defaults = ref<ShipInfo[]>([])
const own = ref<ShipInfo[]>([])
const selectedId = ref('')
const guestName = ref(readStorage(GUEST_NAME_KEY) ?? '')
const playing = ref(false)
const gameContainer = ref<HTMLElement | null>(null)
const volumes = ref<Volumes>({ ...sound.currentVolumes })
let game: Game | null = null

const allShips = computed(() => [...own.value, ...defaults.value])

onMounted(async () => {
  try {
    const ships = await listGameShips()
    defaults.value = ships.defaults
    own.value = ships.own
  } catch (error) {
    showError(error, t.value.play.loadFailed)
    return
  }
  const last = readStorage(SHIP_KEY)
  selectedId.value = allShips.value.some((s) => s.id === last)
    ? last!
    : (allShips.value[0]?.id ?? '')
})

onBeforeUnmount(() => stop())

async function start() {
  if (!selectedId.value) return
  // Browsers let a page make sound only from a click or a key: this one.
  sound.unlock()
  sound.play('choose')
  writeStorage(SHIP_KEY, selectedId.value)
  writeStorage(MODE_KEY, mode.value)
  if (!session.user) writeStorage(GUEST_NAME_KEY, guestName.value)
  if (isTouch) {
    // Full screen and (on iOS) the motion-sensor prompt are only allowed
    // during the tap itself, so both start before anything is awaited.
    const fullscreen = document.fullscreenElement
      ? Promise.resolve()
      : toggleFullscreen(document.documentElement)
    const tiltAllowed = touchMode.value === 'tilt' ? requestTiltPermission() : Promise.resolve(true)
    await fullscreen
    if (!(await tiltAllowed)) {
      showAlert('info', t.value.play.noSensors)
      setTouchMode('stick')
    }
  }
  playing.value = true
  await nextTick()
  game = new Game(gameContainer.value!, {
    // The server's own messages (errors, the guest name) in this language.
    wsUrl: `${WS_URL}${mode.value === 'assault' ? '/assault' : ''}?lang=${locale.value}`,
    assault: mode.value === 'assault',
    shipId: selectedId.value,
    name: guestName.value,
    onExit: stop,
    touch: isTouch ? { mode: touchMode.value, onModeChange: setTouchMode } : undefined,
  })
}

function setVolume(kind: keyof Volumes, event: Event) {
  volumes.value = { ...volumes.value, [kind]: Number((event.target as HTMLInputElement).value) }
  sound.unlock()
  sound.setVolumes(volumes.value)
  if (kind === 'effects') sound.play('move')
}

function setTouchMode(mode: TouchMode) {
  touchMode.value = mode
  writeStorage(TOUCH_MODE_KEY, mode)
}

// The Game owns a render loop, a socket and window listeners that outlive
// any DOM node: it must be destroyed explicitly, or every visit leaks one.
function stop() {
  game?.destroy()
  game = null
  playing.value = false
}

// Per-browser conveniences only; private windows may refuse storage.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not important enough to report.
  }
}
</script>

<template>
  <div v-if="playing" ref="gameContainer" class="game-container" />

  <div v-else class="page">
    <h1>{{ t.play.title }}</h1>

    <div class="modes" role="radiogroup" :aria-label="t.play.mode">
      <button
        type="button"
        class="mode"
        :class="{ active: mode === 'free' }"
        :aria-checked="mode === 'free'"
        role="radio"
        @click="mode = 'free'"
      >
        <strong>{{ t.play.freeForAll }}</strong>
        <span class="muted">{{ t.play.freeForAllText }}</span>
      </button>
      <button
        type="button"
        class="mode"
        :class="{ active: mode === 'assault' }"
        :aria-checked="mode === 'assault'"
        role="radio"
        @click="mode = 'assault'"
      >
        <strong>{{ t.play.assault }}</strong>
        <span class="muted">{{ t.play.assaultText }}</span>
      </button>
    </div>

    <ShipHangar v-if="allShips.length" v-model="selectedId" :ships="allShips" @launch="start" />

    <form class="start" @submit.prevent="start">
      <label v-if="!session.user" class="guest">
        {{ t.play.yourName }}
        <input v-model="guestName" maxlength="20" :placeholder="t.play.guest" />
      </label>
      <p v-else class="muted">{{ t.play.playingAs(session.user.username) }}</p>
      <div v-if="isTouch" class="steer" role="radiogroup" :aria-label="t.play.steerWith">
        <span class="muted">{{ t.play.steerWith }}</span>
        <button
          type="button"
          :class="{ active: touchMode === 'stick' }"
          :aria-checked="touchMode === 'stick'"
          role="radio"
          @click="setTouchMode('stick')"
        >
          {{ t.play.stick }}
        </button>
        <button
          type="button"
          :class="{ active: touchMode === 'tilt' }"
          :aria-checked="touchMode === 'tilt'"
          role="radio"
          @click="setTouchMode('tilt')"
        >
          {{ t.play.tilt }}
        </button>
      </div>
      <label class="volume">
        {{ t.play.effectsVolume }}
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volumes.effects"
          @change="setVolume('effects', $event)"
        />
      </label>
      <label class="volume">
        {{ t.play.musicVolume }}
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volumes.music"
          @change="setVolume('music', $event)"
        />
      </label>
      <button class="primary" type="submit" :disabled="!selectedId">{{ t.play.launch }}</button>
    </form>

    <template v-if="own.length">
      <h2>{{ t.play.myShips }}</h2>
      <div class="ships">
        <button
          v-for="ship in own"
          :key="ship.id"
          type="button"
          class="ship"
          :class="{ selected: ship.id === selectedId }"
          @click="selectedId = ship.id"
          @dblclick="start"
        >
          <ShipThumbnail :layers="ship.layers" :alt="ship.name" />
          <span>{{ ship.name }}</span>
        </button>
      </div>
    </template>

    <h2>{{ t.play.builtIn }}</h2>
    <div class="ships">
      <button
        v-for="ship in defaults"
        :key="ship.id"
        type="button"
        class="ship"
        :class="{ selected: ship.id === selectedId }"
        @click="selectedId = ship.id"
        @dblclick="start"
      >
        <ShipThumbnail :layers="ship.layers" :alt="ship.name" />
        <span>{{ ship.name }}</span>
      </button>
    </div>

    <p v-if="!session.user && session.loaded" class="muted">
      {{ t.play.loginBefore }}<RouterLink to="/login">{{ t.play.loginLink }}</RouterLink
      >{{ t.play.loginAfter }}
    </p>
    <p v-else-if="session.user && !own.length" class="muted">
      {{ t.play.ownBefore }}<RouterLink to="/projects">{{ t.play.ownLink }}</RouterLink
      >{{ t.play.ownAfter }}
    </p>
  </div>
</template>

<style scoped>
.game-container {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.start {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
}
.volume {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--muted);
}
.steer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.mode {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.9rem;
  text-align: left;
  font-family: var(--text-font);
  font-size: 1.05rem;
}
.mode strong {
  font-family: var(--heading-font);
  font-size: 0.95rem;
}
.mode.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}
.steer button.active {
  border-color: var(--accent);
  color: var(--accent);
}
.guest {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--muted);
}
.muted {
  color: var(--muted);
}
.ships {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.8rem;
}
.ship {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
  text-align: center;
  overflow-wrap: anywhere;
  font-family: var(--text-font);
  font-size: 1.05rem;
}
.ship.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}
/* The chosen ship gets the 3DS's cursor: a little four-pointed star. */
.ship.selected::before {
  content: '';
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  width: 14px;
  height: 14px;
  background: var(--accent);
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
}
</style>
