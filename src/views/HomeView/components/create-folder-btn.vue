<script lang="ts" setup>
import {createFolder} from '@/service/home'
import {useToast} from 'primevue/usetoast'
import {ref} from 'vue'

interface Props {
  folderId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['created'])
const toast = useToast()

const visible = ref(false)
const clickNewFolder = async (e: MouseEvent) => {
  visible.value = true
}

const form = ref({
  name: '',
  desc: '',
})

const clickCancel = () => {
  visible.value = false
  form.value = {
    name: '',
    desc: '',
  }
}

const clickConfirm = async () => {
  await createFolder({
    folderId: props.folderId,
    name: form.value.name,
    description: form.value.desc,
  })
  emit('created', form.value)
  toast.add({severity: 'success', summary: '创建成功', detail: `${form.value.name}`, life: 2000})
  clickCancel()
}
</script>

<template>
  <Button
    icon="pi pi-plus"
    label="新建文件夹"
    severity="info"
    @click="clickNewFolder"
    iconPos="left"
    raised
    aria-controls="overlay_new_menu"
  />
  <Dialog v-model:visible="visible" modal header="新建文件夹" :style="{ width: '35rem' }">
    <div class="flex items-center gap-4 mb-5">
      <label for="name" class="font-semibold w-24">文件夹名称</label>
      <InputText
        placeholder="请输入文件夹名..."
        v-model="form.name"
        id="name"
        class="flex-auto"
        autocomplete="off"
      />
    </div>
    <div style="height: 10px"></div>
    <div class="flex gap-4 mb-5 items-center  ">
      <label for="email" class="font-semibold w-24">文件夹描述</label>
      <Textarea Filled placeholder="请输入文件描述..." v-model="form.desc" autoResize rows="3" cols="48"/>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="button" label="取消" severity="secondary" @click="clickCancel" :style="{ width: '5rem'}"></Button>
      <Button type="button" label="确认" @click="clickConfirm" :style="{ width: '5rem' }"></Button>
    </div>
  </Dialog>
</template>

<style scoped lang="scss"></style>
