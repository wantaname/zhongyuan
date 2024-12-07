<script lang="ts" setup>
import { getAllTag, type TagItem } from '@/service/home'
import { onMounted, ref } from 'vue'

const tagList = ref<TagItem[]>([])

onMounted(async () => {
  tagList.value = await getAllTag()
})
</script>

<template>
  <div class="app-container">ddd</div>
</template>

<style scoped lang="scss"></style>
