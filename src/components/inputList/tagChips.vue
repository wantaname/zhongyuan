<script lang="ts" setup>
defineProps<{ label: string }>()

const emits = defineEmits(['remove'])

const remove = () => {
  emits('remove')
}
</script>

<template>
  <span class="chip">
    <span class="t">{{ label }}</span>

    <i @click="remove" class="pi pi-times-circle" style="color: #ef4444; cursor: pointer"></i>
  </span>
</template>

<style scoped lang="scss">
.t {
  margin-right: 6px;
}
.chip {
  border: 1px solid #fecaca;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 1.1rem;
}
</style>
