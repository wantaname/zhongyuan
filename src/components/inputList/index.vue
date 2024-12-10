<script lang="ts" setup>
import { ref, watch } from 'vue'

const modelValue = defineModel<string[]>({ required: true })

const items = ref([...modelValue.value])

// 监听 items 的变化并更新父组件的 v-model
const updateModelValue = (newItems: any) => {
  modelValue.value = newItems
}

// 添加项
const addItem = () => {
  items.value.push('')
}

// 删除项
const removeItem = (index: number) => {
  if (items.value.length > 0) {
    items.value.splice(index, 1)
  }
}

// 在 items 变化时同步更新父组件的 modelValue
watch(
  items,
  (newItems) => {
    updateModelValue(newItems)
  },
  { deep: true },
)
</script>

<template>
  <div class="list-input">
    <div v-for="(item, index) in items" :key="index">
      <InputText size="small" v-model="items[index]" style="margin-bottom: 5px"></InputText>
      <Button
        icon="pi pi-times"
        @click="removeItem(index)"
        severity="danger"
        variant="text"
        rounded
      />
    </div>
    <Button
      type="button"
      severity="info"
      icon-pos="left"
      icon="pi pi-plus-circle"
      size="small"
      label="添加项"
      @click="addItem"
    ></Button>
  </div>
</template>

<style scoped lang="scss">
// .list-input {
//   margin: 10px;
// }
.list-item {
  margin-bottom: 10px;
}
button {
  margin-left: 10px;
}
</style>
