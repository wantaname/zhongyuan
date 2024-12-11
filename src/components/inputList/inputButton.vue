<script lang="ts" setup>
import { nextTick, ref } from 'vue'

const newTag = ref('')
const isInputVisible = ref(false)

const tagInput = ref<any>(null)

const emit = defineEmits(['change'])

// 显示输入框
const showInput = () => {
  isInputVisible.value = true
  // 在下一次渲染时聚焦输入框
  nextTick(() => {
    console.log('ff', tagInput.value)
    tagInput.value && tagInput.value.$el.focus()
  })
}

const add = () => {
  if (newTag.value.trim()) {
    emit('change', newTag.value.trim())
  }
  hideInput()
}

// 隐藏输入框
const hideInput = () => {
  isInputVisible.value = false
  newTag.value = ''
}
</script>

<template>
  <span v-if="isInputVisible" class="input-container" style="display: inline-block">
    <InputText
      placeholder="输入后按回车"
      v-model="newTag"
      @keydown.enter="add"
      @blur="hideInput"
      ref="tagInput"
      size="small"
      auto
    />
  </span>
  <Button
    type="button"
    severity="info"
    icon-pos="left"
    icon="pi pi-plus-circle"
    size="small"
    label="添加"
    v-else
    @click="showInput"
  ></Button>
</template>

<style scoped lang="scss"></style>
