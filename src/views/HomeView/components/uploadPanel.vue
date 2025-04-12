<template>
  <div class="upload-panel" :class="{ 'is-collapsed': isCollapsed }">
    <div class="panel-header" @click="toggleCollapse">
      <div class="header-left">
        <i class="pi pi-spinner pi-spin upload-icon" v-if="uploadingCount"></i>
        <i class="pi pi-check-circle upload-success-icon" v-else></i>
        <span class="upload-count" v-if="uploadingCount">{{ uploadingCount }}个文件上传中</span>
        <span class="upload-count" v-else>{{ completedCount }}个文件上传完成</span>
        <span class="upload-speed" v-if="uploadingCount">
          <i class="pi pi-cloud-upload"></i>
          {{ formatSpeed(uploadSpeed) }}
        </span>
      </div>
      <div class="header-right">
        <i class="pi pi-chevron-down collapse-icon"></i>
        <i class="pi pi-times clear-icon" @click.stop="handleClosePanel"></i>
      </div>
    </div>
    <!-- 上传统计信息 -->
    <div class="upload-stats-bar" v-if="!isCollapsed">
      <div class="stats-content">
        <span class="stats-text">
          已上传 {{ completedCount }} 个文件，共 {{ totalUploadedSize }} MB
        </span>
        <span title="移除已上传的文件">
          <i class="pi pi-trash" @click.stop="clearCompleted"></i>
        </span>
      </div>
    </div>
    <div class="panel-content" v-if="!isCollapsed">
      <div class="file-list">
        <div class="file-item" v-for="file in files" :key="file.id" :class="file.status">
          <div class="file-icon">
            <i class="pi" :class="getFileIcon(file)"></i>
          </div>

          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-progress">
              <ProgressBar
                v-if="file.status === 'uploading'"
                :value="file.progress"
                :showValue="false"
              />
              <div class="file-status">
                <span v-if="file.status === 'completed'"> <i class="pi pi-check"></i> 已完成 </span>
                <span v-else-if="file.status === 'error'">
                  <i class="pi pi-exclamation-triangle"></i> 上传失败
                </span>
                <span v-else> {{ formatSize(file.loaded) }} / {{ formatSize(file.size) }} </span>
              </div>
            </div>
          </div>

          <div class="file-actions">
            <button
              class="retry-btn"
              @click.stop="retryUpload(file)"
              v-if="file.status === 'error'"
            >
              <i class="pi pi-replay"></i> 重试
            </button>
            <button
              class="cancel-btn"
              @click.stop="cancelFile(file)"
              v-if="file.status === 'pending' || file.status === 'uploading'"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 关闭确认对话框 -->
    <Dialog
      v-model:visible="showCloseConfirm"
      header="提示"
      :style="{ width: '350px' }"
      :modal="true"
    >
      <div class="confirm-content">
        <i class="pi pi-exclamation-triangle" style="color: #e53e3e; font-size: 1.5rem"></i>
        <span style="margin-left: 10px"
          >当前有 {{ uploadingCount }} 个文件正在上传，确定要关闭面板吗？</span
        >
      </div>
      <template #footer>
        <Button
          label="取消"
          icon="pi pi-times"
          @click="showCloseConfirm = false"
          class="p-button-text"
        />
        <Button
          label="确定关闭"
          icon="pi pi-check"
          @click="confirmClosePanel"
          class="p-button-danger"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ProgressBar from 'primevue/progressbar'
type FileStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface UploadFile {
  id: number | string
  name: string
  size: number
  file: File
  progress: number
  loaded: number
  status: FileStatus
  cancelToken: any
}

const props = defineProps<{
  files: UploadFile[]
}>()

const emit = defineEmits<{
  (e: 'cancel-file', file: UploadFile): void
  (e: 'clear-completed'): void
  (e: 'close-panel'): void
  (e: 'retry-file', file: UploadFile): void
}>()

const isCollapsed = ref(false)

const uploadingCount = computed(() => {
  return props.files.filter((f) => f.status === 'uploading' || f.status === 'pending').length
})

const completedCount = computed(() => {
  return props.files.filter((f) => f.status === 'completed').length
})

const totalCount = computed(() => {
  return props.files.length
})

const getFileIcon = (file: UploadFile) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const icons: Record<string, string> = {
    pdf: 'pi-file-pdf',
    doc: 'pi-file-word',
    docx: 'pi-file-word',
    xls: 'pi-file-excel',
    xlsx: 'pi-file-excel',
    ppt: 'pi-file-powerpoint',
    pptx: 'pi-file-powerpoint',
    jpg: 'pi-image',
    jpeg: 'pi-image',
    png: 'pi-image',
    gif: 'pi-image',
    mp3: 'pi-file',
    mp4: 'pi-file',
    zip: 'pi-file-archive',
    rar: 'pi-file-archive',
    txt: 'pi-file',
    csv: 'pi-file-excel',
  }

  return icons[extension] || 'pi-file'
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const clearCompleted = () => {
  emit('clear-completed')
}

const cancelFile = (file: UploadFile) => {
  emit('cancel-file', file)
}
const showCloseConfirm = ref(false)
// 计算总上传大小(MB)
const totalUploadedSize = computed(() => {
  const totalBytes = props.files
    .filter((f) => f.status === 'completed')
    .reduce((sum, file) => sum + file.size, 0)
  return (totalBytes / (1024 * 1024)).toFixed(2)
})

// 重试上传
const retryUpload = (file: UploadFile) => {
  emit('retry-file', file)
}

const handleClosePanel = () => {
  if (uploadingCount.value > 0) {
    showCloseConfirm.value = true
  } else {
    emit('close-panel')
  }
}

const confirmClosePanel = () => {
  showCloseConfirm.value = false
  emit('close-panel')
}

// 新增网速计算相关代码
const uploadSpeed = ref(0)
const lastLoaded = ref(0)
const speedUpdateInterval = ref<any>()

const startSpeedCalculation = () => {
  // 每秒计算一次网速
  speedUpdateInterval.value = setInterval(() => {
    const currentLoaded = props.files
      .filter((f) => f.status === 'uploading')
      .reduce((sum, file) => sum + file.loaded, 0)

    // 计算每秒的字节变化量
    uploadSpeed.value = currentLoaded - lastLoaded.value
    lastLoaded.value = currentLoaded
  }, 1000)
}

const formatSpeed = (bytesPerSecond: number) => {
  if (bytesPerSecond <= 0) return '0 KB/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

onMounted(() => {
  startSpeedCalculation()
})

onUnmounted(() => {
  if (speedUpdateInterval.value) {
    clearInterval(speedUpdateInterval.value)
  }
})

// 监听上传状态变化
watch(
  () => uploadingCount.value,
  (newVal) => {
    if (newVal === 0) {
      uploadSpeed.value = 0
    }
  },
)
</script>

<style scoped>
.upload-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 360px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 1000;
  border: 1px solid #e0e0e0; /* 新增边框 */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  user-select: none;
  position: relative; /* 为层次感效果 */
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  color: #6366f1;
  font-size: 18px;
}

.upload-success-icon {
  color: rgb(34, 183, 96);
  font-size: 18px;
}
.upload-speed {
  color: rgb(43, 204, 110);
  font-size: 18px;
}
.upload-count {
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  color: #6c757d;
  font-size: 14px;
  transition: transform 0.2s;
}

.is-collapsed .collapse-icon {
  transform: rotate(-180deg);
}

.clear-icon {
  color: #6c757d;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.clear-icon:hover {
  background: #e9ecef;
  color: #495057;
}

.panel-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  padding-top: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0; /* 分隔线 */
}

.file-list {
  padding: 8px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: all 0.2s;
  background: #fff;
  /* border: 1px solid #f0f0f0; */
  border-radius: 6px;
  /* box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);  */
}

.file-item:hover {
  background: #e8ebed;
}

.file-item.completed {
  border-color: rgba(25, 135, 84, 0.2);
  background: rgba(25, 135, 84, 0.03);
}

.file-item.error {
  border-color: rgba(220, 53, 69, 0.2);
  background: rgba(220, 53, 69, 0.03);
}

.file-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 6px;
  margin-right: 12px;
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2); /* 图标边框 */
}

.file-item.completed .file-icon {
  color: #198754;
  background: rgba(25, 135, 84, 0.1);
  border-color: rgba(25, 135, 84, 0.2);
}

.file-item.error .file-icon {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  border-color: rgba(220, 53, 69, 0.2);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-progress {
  width: 100%;
}

.file-status {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.file-item.completed .file-status {
  color: #198754;
}

.file-item.error .file-status {
  color: #dc3545;
}

/* 新增重试按钮样式 */
.file-actions {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.retry-btn {
  padding: 5px 10px;
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); /* 浅红 -> 正红 */
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.retry-btn:hover {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); /* 深一点 */
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.retry-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.retry-btn i {
  font-size: 12px;
  color: white;
}

/* 调整取消按钮样式 */
.cancel-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  color: #e53e3e;
  background: rgba(229, 62, 62, 0.1);
}

/* 增强进度条样式 */
:deep(.p-progressbar) {
  height: 6px;
  border-radius: 3px;
  background: #f0f0f0;
  border: 1px solid #e0e0e0; /* 进度条边框 */
  overflow: hidden;
}

:deep(.p-progressbar .p-progressbar-value) {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
}

.upload-stats-bar {
  background: rgba(99, 102, 241, 0.08);
  padding: 8px 16px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
}

.stats-content {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.stats-text {
  font-size: 13px;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 10px;
}

.stats-text i {
  color: #38a169;
  font-size: 14px;
}

/* 调整底部清除按钮样式 */
.panel-footer {
  padding: 12px 16px;
  text-align: right;
  background: #f8f9fa;
  border-top: 1px solid #ebebeb;
  border-radius: 0 0 8px 8px;
}

.clear-completed-btn:hover:not(:disabled) {
  background: white;
  border-color: #6366f1;
  color: #6366f1;
}

.clear-completed-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-completed-btn i {
  font-size: 14px;
}
</style>
