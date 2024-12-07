import { ref, onMounted, onUnmounted } from 'vue'

export function useResizableSidebar(defaultWidth = 250, minWidth = 200, maxWidth = 500) {
  const sidebarWidth = ref(defaultWidth) // 默认宽度
  const isResizing = ref(false)

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.value) {
      // 限制宽度在 minWidth 和 maxWidth 之间
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX))
      sidebarWidth.value = newWidth
    }
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleMouseDown = () => {
    isResizing.value = true
    document.body.style.cursor = 'ew-resize'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  onMounted(() => {
    document.addEventListener('mouseup', handleMouseUp)
  })

  onUnmounted(() => {
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('mousemove', handleMouseMove)
  })

  return {
    sidebarWidth,
    handleMouseDown,
  }
}
