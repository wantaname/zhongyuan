/** 定义一个弹窗数组 */

import { ref } from 'vue'

export interface FormItem {
  label: string
  type: 'input' | 'number' | 'radio' | 'select' | 'upload' | 'selectButton'
  options?: { label: string; value: any }[]
  value: any
}

export const dialogList = ref<CustomDialog[]>([])

export const useCustomDialog = () => {
  return {
    dialogList,
    CustomDialog,
    showCustomDialog,
  }
}

let dKey = 0

export const showCustomDialog = (form: FormItem[], config: DialogConfig) => {
  new CustomDialog(form, config)
}

/** 关闭弹窗 */
type doneFunction = () => void
interface DialogConfig {
  title: string
  labelWidth: number | string
  /** data：表单数据，done:关闭弹窗 */
  onSubmit: (data: FormItem[], done: doneFunction) => void
  /** done:关闭弹窗 */
  onClose: (done: doneFunction) => void
}

/** 新建弹窗 */
class CustomDialog {
  visible = false

  props: any
  form: FormItem[]

  key: number
  config: DialogConfig

  onClose: () => void
  onSubmit: (data: FormItem[]) => void

  onDestroy: () => void

  constructor(form: FormItem[], config: DialogConfig) {
    this.form = form
    this.visible = false
    this.key = dKey++
    this.config = config
    this.onClose = () => {
      config.onClose(() => {
        this.hide()
      })
    }
    this.onDestroy = () => {
      this.destroy()
    }
    this.onSubmit = (data) => {
      config.onSubmit(data, () => {
        this.hide()
      })
    }
    /** 将当前实例加入数组 */
    dialogList.value.push(this)
    this.show()
  }

  show() {
    const idx = dialogList.value.findIndex((item) => item.key === this.key)
    dialogList.value[idx].visible = true
  }
  hide() {
    const idx = dialogList.value.findIndex((item) => item.key === this.key)
    dialogList.value[idx].visible = false
  }

  destroy() {
    /** 移除 */
    const idx = dialogList.value.findIndex((item) => item.key === this.key)
    if (idx !== -1) {
      dialogList.value.splice(idx, 1)
    }
  }
}
