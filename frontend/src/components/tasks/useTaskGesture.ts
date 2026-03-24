import { useCallback, useRef } from "react"

type GestureState =
  | "idle"
  | "pending"
  | "longpress"
  | "dragging"
  | "swiping"
  | "committed"

interface GestureCallbacks {
  onTap: (e: PointerEvent) => void
  onDragStart: (e: PointerEvent) => void // vertical movement → reorder
  onLongPress: (e: PointerEvent) => void // timer fires → calendar drop
  onSwipeLeft: () => void
  onSwipeRightCommit: (e: PointerEvent) => void // fires at threshold while pointer is down
  onSwipeMove: (dx: number) => void // continuous x offset for animation
  onSwipeEnd: () => void // snap back
}

const LONG_PRESS_MS = 400
const SWIPE_THRESHOLD_PX = 10
const DRAG_THRESHOLD_PX = 10
const MAX_SWIPE_PX = 80

/** Rubber-band: linear up to max, then heavy damping beyond */
function rubberBand(dx: number, max: number): number {
  const sign = Math.sign(dx)
  const abs = Math.abs(dx)
  if (abs <= max) return dx
  const over = abs - max
  return sign * (max + over * 0.12)
}

export function useTaskGesture(callbacks: GestureCallbacks) {
  const state = useRef<GestureState>("idle")
  const startX = useRef(0)
  const startY = useRef(0)
  const storedEvent = useRef<PointerEvent | null>(null)
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bypassGesture = useRef(false)
  const pointerId = useRef<number | null>(null)
  const captureTarget = useRef<HTMLElement | null>(null)

  const cleanup = useCallback(() => {
    if (timerId.current !== null) {
      clearTimeout(timerId.current)
      timerId.current = null
    }
    state.current = "idle"
    storedEvent.current = null
    pointerId.current = null
    captureTarget.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (bypassGesture.current) {
        bypassGesture.current = false
        return
      }
      // Only handle primary button (left click / touch)
      if (e.button !== 0) return
      // Ignore clicks on buttons/inputs
      const target = e.target as HTMLElement
      if (target.closest("button, input, [role='button']")) return

      e.stopPropagation()

      state.current = "pending"
      startX.current = e.clientX
      startY.current = e.clientY
      pointerId.current = e.pointerId
      storedEvent.current = e.nativeEvent
      captureTarget.current = e.currentTarget as HTMLElement

      // Capture pointer for reliable tracking
      try {
        captureTarget.current.setPointerCapture(e.pointerId)
      } catch {
        // setPointerCapture can fail if element is removed
      }

      timerId.current = setTimeout(() => {
        if (state.current === "pending") {
          state.current = "longpress"
          callbacks.onLongPress(storedEvent.current!)
        }
      }, LONG_PRESS_MS)
    },
    [callbacks],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (state.current !== "pending" && state.current !== "swiping") return
      if (e.pointerId !== pointerId.current) return

      const dx = e.clientX - startX.current
      const dy = e.clientY - startY.current

      if (state.current === "pending") {
        // Vertical movement > threshold → start reorder drag
        if (Math.abs(dy) > DRAG_THRESHOLD_PX) {
          if (timerId.current !== null) {
            clearTimeout(timerId.current)
            timerId.current = null
          }
          state.current = "dragging"

          // Release capture so Reorder can take over
          if (captureTarget.current && pointerId.current !== null) {
            try {
              captureTarget.current.releasePointerCapture(pointerId.current)
            } catch {
              // ignore
            }
          }

          if (storedEvent.current) {
            callbacks.onDragStart(storedEvent.current)
          }
          return
        }
        // Horizontal movement > threshold → start swiping
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
          if (timerId.current !== null) {
            clearTimeout(timerId.current)
            timerId.current = null
          }
          state.current = "swiping"
          e.preventDefault()
          callbacks.onSwipeMove(rubberBand(dx, MAX_SWIPE_PX))
        }
      } else if (state.current === "swiping") {
        e.preventDefault()
        callbacks.onSwipeMove(rubberBand(dx, MAX_SWIPE_PX))

        // Right-swipe threshold crossed while pointer is still down
        if (dx > 60) {
          state.current = "committed"
          // Release capture so FC Draggable can track the pointer
          if (captureTarget.current && pointerId.current !== null) {
            try {
              captureTarget.current.releasePointerCapture(pointerId.current)
            } catch {
              // ignore
            }
          }
          callbacks.onSwipeEnd()
          callbacks.onSwipeRightCommit(e.nativeEvent)
        }
      }
    },
    [callbacks],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return

      const currentState = state.current

      if (currentState === "pending") {
        // Released before timer fired and within movement threshold → tap
        cleanup()
        callbacks.onTap(e.nativeEvent)
      } else if (currentState === "swiping") {
        const dx = e.clientX - startX.current
        if (dx < -60) {
          callbacks.onSwipeLeft()
        }
        callbacks.onSwipeEnd()
        cleanup()
      } else if (currentState === "committed") {
        // Mid-swipe handoff already fired; just cleanup
        cleanup()
      } else if (currentState === "longpress" || currentState === "dragging") {
        cleanup()
      } else {
        cleanup()
      }
    },
    [callbacks, cleanup],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return
      if (state.current === "swiping") {
        callbacks.onSwipeEnd()
      }
      cleanup()
    },
    [callbacks, cleanup],
  )

  return {
    bypassGesture,
    gestureBindings: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style: { touchAction: "pan-y" as const },
    },
  }
}
