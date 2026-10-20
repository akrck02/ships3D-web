<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ShipInfo } from '@/api/projects'
import { Hangar } from '@/game/hangar'
import { sound } from '@/game/sound'
import { t } from '@/i18n'

/** How far a finger must slide across the hangar to change ship, in CSS pixels. */
const SWIPE_PIXELS = 40

const props = defineProps<{ ships: ShipInfo[] }>()
const selected = defineModel<string>({ required: true })
const emit = defineEmits<{ launch: [] }>()

const stage = ref<HTMLElement | null>(null)
let hangar: Hangar | null = null
let resizeObserver: ResizeObserver | null = null
let swipeFrom: number | null = null

const index = computed(() =>
  Math.max(
    props.ships.findIndex((ship) => ship.id === selected.value),
    0,
  ),
)
const current = computed(() => props.ships[index.value])

onMounted(() => {
  hangar = new Hangar()
  stage.value!.prepend(hangar.canvas)
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) {
      hangar?.resize(entry.contentRect.width, entry.contentRect.height)
    }
  })
  resizeObserver.observe(stage.value!)
  if (current.value) {
    hangar.show(current.value.layers)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  hangar?.dispose()
})

watch(current, (ship) => {
  if (ship) {
    hangar?.show(ship.layers)
  }
})

function turn(step: number) {
  if (props.ships.length === 0) {
    return
  }
  const next = (index.value + step + props.ships.length) % props.ships.length
  selected.value = props.ships[next]!.id
  sound.unlock()
  sound.play('move')
}

function onKey(event: KeyboardEvent) {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }
  const step = steps[event.key]
  if (step !== undefined) {
    event.preventDefault()
    turn(step)
    return
  }
  if (event.key === 'Enter') {
    emit('launch')
  }
}

function onPointerDown(event: PointerEvent) {
  swipeFrom = event.clientX
}

function onPointerUp(event: PointerEvent) {
  if (swipeFrom === null) {
    return
  }
  const moved = event.clientX - swipeFrom
  swipeFrom = null
  if (Math.abs(moved) >= SWIPE_PIXELS) {
    turn(moved < 0 ? 1 : -1)
  }
}
</script>

<template>
  <section
    class="hangar"
    tabindex="0"
    :aria-label="t.play.hangar"
    @keydown="onKey"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeFrom = null"
  >
    <div ref="stage" class="stage">
      <!-- The arrows are Lucide's chevron-left and chevron-right (ISC licence, lucide.dev). -->
      <button
        type="button"
        class="turn previous"
        :aria-label="t.play.previousShip"
        @click="turn(-1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button type="button" class="turn next" :aria-label="t.play.nextShip" @click="turn(1)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      <p v-if="current" class="name" aria-live="polite">
        <strong>{{ current.name }}</strong>
        <span>{{ index + 1 }} / {{ ships.length }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.hangar {
  margin-bottom: 1rem;
  border: 2px solid var(--edge);
  box-shadow: var(--drop);
  overflow: hidden;
  touch-action: pan-y;
}
.hangar:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.stage {
  position: relative;
  height: min(22rem, 55vw);
  min-height: 14rem;
}
.stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.turn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.45);
}
.turn svg {
  width: 1.6rem;
  height: 1.6rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.previous {
  left: 0.8rem;
}
.next {
  right: 0.8rem;
}
.name {
  position: absolute;
  top: 0.8rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-shadow: 0 2px 4px rgb(0 0 0 / 0.8);
}
.name strong {
  font-family: var(--heading-font);
  font-size: 1.4rem;
  letter-spacing: 0.05em;
}
.name span {
  color: var(--muted);
}
</style>
