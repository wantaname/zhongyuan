<script lang="ts" setup>
import { useDialog } from 'primevue'
import { ref, useCssVars } from 'vue'
import { useCustomDialog } from './hooks'

const { dialogList } = useCustomDialog()
</script>

<template>
  <div class="dialog-component">
    <div class="card flex justify-center">
      <Dialog
        v-model:visible="dItem.visible"
        modal
        :header="dItem.config.title"
        :style="{ width: '25rem' }"
        @after-hide="dItem.onDestroy"
        v-for="(dItem, idx) in dialogList"
        :key="dItem.key"
      >
        <div class="flex items-center gap-4 mb-4" v-for="formItem in dItem.form">
          <label for="username" :style="{ width: dItem.config.labelWidth, textAlign: 'right' }">{{
            formItem.label
          }}</label>
          <InputText
            v-model="formItem.value"
            class="flex-auto"
            autocomplete="off"
            v-if="formItem.type === 'input'"
          />
          <SelectButton
            v-if="formItem.type === 'selectButton'"
            v-model="formItem.value"
            :options="formItem.options"
            optionLabel="label"
            option-value="value"
          />
          <InputNumber
            v-if="formItem.type === 'number'"
            v-model="formItem.value"
            showButtons
            :min="0"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" label="取消" severity="secondary" @click="dItem.onClose"></Button>
          <Button type="button" label="确认" @click="dItem.onSubmit(dItem.form)"></Button>
        </div>
      </Dialog>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
