<script lang="ts" setup>
import { nextTick, ref } from 'vue'

const visible = ref(false)
const searchValue = ref('')

const vFocus = {
  mounted: (el: HTMLElement) => {
    setTimeout(() => {
      if (el.tagName === 'INPUT') {
        return el.focus()
      }
      let t = el.querySelector('input')
      if (!t) return
      t.focus()
    }, 200)
  },
}

const onEnter = (ev: KeyboardEvent) => {
  visible.value = true
  ev.stopPropagation()
  ev.preventDefault()
}
</script>

<template>
  <div class="search-dialog">
    <IconField>
      <InputIcon class="pi pi-search" />
      <InputText
        @keyup.enter="onEnter"
        style="width: 70%"
        v-model="searchValue"
        placeholder="在此文件夹下搜索，输入关键字，按回车"
      />
    </IconField>
    <Dialog
      v-model:visible="visible"
      modal
      header="Edit Profile"
      :style="{ width: '80%', minWidth: '500px', height: '80%', minHeight: '500px' }"
    >
      <template #container>
        <div class="content">
          <div class="header">
            <IconField>
              <InputIcon class="pi pi-search" />
              <InputText
                @keyup.enter="onEnter"
                style="width: 80%"
                v-model="searchValue"
                size="large"
                v-focus
                class="search-input"
                placeholder="请输入关键字"
              />
            </IconField>
            <Divider style="margin-top: 0px" type="solid" />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.search-input {
  border-style: none !important;
}
.search-input:hover,
.search-input:active,
.search-input:focus {
  border-style: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.content {
  padding: 4px 5px;
}
</style>
