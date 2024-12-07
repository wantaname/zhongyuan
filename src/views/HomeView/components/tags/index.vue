<script lang="ts" setup>
import { getAllTag, type TagItem } from '@/service/home'
import { onMounted, ref, watch } from 'vue'

const tagList = ref<TagItem[]>([])

const show = defineModel<boolean>()

const onClose = () => {
  show.value = false
}

watch(show, async () => {
  tagList.value = await getAllTag()
})
</script>

<template>
  <Dialog
    @hide="onClose"
    v-model:visible="show"
    modal
    header="标签管理"
    :style="{ width: '32rem' }"
  >
    <div class="flex items-center gap-4 mb-4"></div>
    <Tag severity="info" :value="item.label" v-for="item in tagList" :key="item.tagId"></Tag>

    <div class="flex justify-end gap-2">
      <Button type="button" label="确认" @click="onClose"></Button>
    </div>
  </Dialog>
</template>

<style scoped lang="scss"></style>
