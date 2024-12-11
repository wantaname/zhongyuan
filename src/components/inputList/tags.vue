<script lang="ts" setup>
import { ref } from 'vue'
import InputButton from './inputButton.vue'
import TagChips from './tagChips.vue'

const modelValue = defineModel<string[]>({ required: true })

const onAdd = (v: string) => {
  modelValue.value.push(v)
}
const onRemove = (idx: number) => {
  modelValue.value.splice(idx, 1)
}
</script>

<template>
  <div class="input-tags-lit">
    <TagChips
      :label="item"
      style="margin-right: 10px"
      v-for="(item, idx) in modelValue"
      @remove="onRemove(idx)"
      :key="idx"
    ></TagChips>
    <InputButton @change="onAdd"></InputButton>
  </div>
</template>

<style scoped lang="scss"></style>
