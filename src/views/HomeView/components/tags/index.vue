<script lang="ts" setup>
import { useCustomDialog, type FormItem } from '@/components/dialog/hooks'
import { getAllTag, postAddTag, postDelTag, postEditTag, type TagItem } from '@/service/home'
import { useToast } from 'primevue/usetoast'
import { onMounted, ref, watch } from 'vue'

const tagList = ref<TagItem[]>([])

const show = defineModel<boolean>()

const onClose = () => {
  show.value = false
}

const getData = async () => {
  tagList.value = await getAllTag()
}

watch(show, async () => {
  if (!show.value) return
  getData()
})

const datatTypeOption = [
  {
    label: '文本',
    value: 'STRING',
  },
  {
    label: '数字',
    value: 'NUMBER',
  },
  {
    label: '日期',
    value: 'DATE',
  },
]

const booleanOption = [
  {
    label: '是',
    value: true,
  },
  {
    label: '否',
    value: 'NUMBER',
  },
]

const getDataType = (d: 'STRING' | 'NUMBER' | 'DATE') => {
  return d === 'STRING' ? '文本' : d === 'NUMBER' ? '数字' : '日期'
}

const { CustomDialog, showCustomDialog } = useCustomDialog()
const toast = useToast()

const editTagData = ref<TagItem | null>(null)

const clickDelTag = (tag: TagItem) => {
  postDelTag(tag.tagId)
    .then(() => {
      toast.add({ severity: 'success', summary: '删除成功', life: 2000 })
      getData()
    })
    .catch((e) => {
      toast.add({ severity: 'error', summary: '删除失败', detail: `${e}`, life: 2000 })
      getData()
    })
}

const clickEditTag = (tag: TagItem) => {
  editTagData.value = tag
  showCustomDialog(
    [
      { label: '标签名', type: 'input', value: editTagData.value.label },
      {
        label: '属性',
        type: 'selectButton',
        value: editTagData.value.dataType,
        options: [
          {
            label: '文本',
            value: 'STRING',
          },
          {
            label: '数字',
            value: 'NUMBER',
          },
          {
            label: '日期',
            value: 'DATE',
          },
        ],
      },
      {
        label: '是否数组',
        type: 'selectButton',
        value: editTagData.value.isList,
        options: [
          {
            label: '是',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
      {
        label: '能否搜索',
        type: 'selectButton',
        value: editTagData.value.isCanSearch,
        options: [
          {
            label: '能',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
      {
        label: '顺序',
        type: 'number',
        value: editTagData.value.index,
      },
      {
        label: '是否有效',
        type: 'selectButton',
        value: editTagData.value.isActive,
        options: [
          {
            label: '是',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
    ],
    {
      title: '编辑标签',
      labelWidth: '5rem',
      onClose: (done) => {
        done()
      },

      onSubmit: (data, done) => {
        if (!data[0].value) {
          return toast.add({ severity: 'warn', summary: '标签名不能为空' })
        }
        postEditTag({
          tagId: editTagData.value!.tagId,
          label: data[0].value,
          dataType: data[1].value,
          isList: data[2].value,
          isCanSearch: data[3].value,
          index: data[4].value,
          isActive: data[5].value,
        })
          .then(() => {
            toast.add({ severity: 'success', summary: '修改成功', life: 2000 })
            getData()
            done()
          })
          .catch((e) => {
            toast.add({ severity: 'error', summary: '修改失败', detail: `${e}`, life: 2000 })
          })
      },
    },
  )
}

const addTag = () => {
  showCustomDialog(
    [
      { label: '标签名', type: 'input', value: '' },
      {
        label: '属性',
        type: 'selectButton',
        value: 'NUMBER',
        options: [
          {
            label: '文本',
            value: 'STRING',
          },
          {
            label: '数字',
            value: 'NUMBER',
          },
          {
            label: '日期',
            value: 'DATE',
          },
        ],
      },
      {
        label: '是否数组',
        type: 'selectButton',
        value: false,
        options: [
          {
            label: '是',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
      {
        label: '能否搜索',
        type: 'selectButton',
        value: true,
        options: [
          {
            label: '能',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
      {
        label: '顺序',
        type: 'number',
        value: false,
      },
      {
        label: '是否有效',
        type: 'selectButton',
        value: true,
        options: [
          {
            label: '是',
            value: true,
          },
          {
            label: '否',
            value: false,
          },
        ],
      },
    ],
    {
      title: '添加标签',
      labelWidth: '5rem',
      onClose: (done) => {
        done()
      },

      onSubmit: (data, done) => {
        if (!data[0].value) {
          return toast.add({ severity: 'warn', summary: '标签名不能为空' })
        }
        postAddTag({
          label: data[0].value,
          dataType: data[1].value,
          isList: data[2].value,
          isCanSearch: data[3].value,
          index: data[4].value,
          isActive: data[5].value,
        })
          .then(() => {
            toast.add({ severity: 'success', summary: '添加成功', life: 2000 })
            done()
            getData()
          })
          .catch((e) => {
            toast.add({ severity: 'error', summary: '添加失败', detail: `${e}`, life: 2000 })
          })
      },
    },
  )
}
</script>

<template>
  <Dialog
    @hide="onClose"
    v-model:visible="show"
    modal
    header="标签管理"
    :style="{ width: '85rem', height: '50rem' }"
  >
    <div class="tag-table">
      <DataTable editMode="cell" :value="tagList" showGridlines tableStyle="min-width: 900px">
        <Column field="tagId" header="tagId"></Column>
        <Column field="label" header="标签名">
          <template #body="{ data, field }: { data: TagItem; field: string }">
            {{ data.label }}
          </template>
          <template #editor="{ data, field }: { data: TagItem; field: string }">
            <InputText v-model="data.label" autofocus />
          </template>
        </Column>
        <Column field="dataType" header="属性">
          <template #body="slotProps: { data: TagItem }">
            <div>
              {{ getDataType(slotProps.data.dataType) }}
            </div>
          </template>
          <template #editor="{ data, field }: { data: TagItem; field: string }">
            <Select
              v-model="data.dataType"
              :options="datatTypeOption"
              optionLabel="label"
              optionValue="value"
              placeholder="请选择"
              class="w-full"
            />
          </template>
        </Column>
        <Column field="isList" header="是否数组">
          <template #body="slotProps: { data: TagItem }">
            <div>
              {{ slotProps.data.isList ? '是' : '否' }}
            </div>
          </template>
          <template #editor="{ data, field }: { data: TagItem; field: string }">
            <Select
              v-model="data.isList"
              :options="booleanOption"
              optionLabel="label"
              optionValue="value"
              placeholder="请选择"
              class="w-full"
            />
          </template>
        </Column>
        <Column field="isCanSearch" header="能否搜索">
          <template #body="slotProps: { data: TagItem }">
            <div>
              {{ slotProps.data.isCanSearch ? '能' : '否' }}
            </div>
          </template>
          <template #editor="{ data, field }: { data: TagItem; field: string }">
            <Select
              v-model="data.isCanSearch"
              :options="booleanOption"
              optionLabel="label"
              optionValue="value"
              placeholder="请选择"
              class="w-full"
            />
          </template>
        </Column>
        <Column field="index" header="顺序">
          <template #body="slotProps: { data: TagItem }">
            <div style="width: 100%">
              {{ slotProps.data.index }}
            </div>
          </template>
        </Column>
        <Column field="index" header="是否有效">
          <template #body="slotProps: { data: TagItem }">
            <div>
              <Tag
                :severity="slotProps.data.isActive ? 'success' : 'danger'"
                :value="slotProps.data.isActive ? '是' : '否'"
              ></Tag>
            </div>
          </template>
          <template #editor="{ data, field }: { data: TagItem; field: string }">
            <Select
              v-model="data.isActive"
              :options="booleanOption"
              optionLabel="label"
              optionValue="value"
              placeholder="请选择"
              class="w-full"
            />
          </template>
        </Column>

        <Column header="操作" style="width: 120px">
          <template #body="slotProps: { data: TagItem }">
            <div>
              <Button
                @click="clickDelTag(slotProps.data)"
                icon="pi pi-trash"
                severity="danger"
                title="删除"
                variant="text"
                rounded
              />
              <Button
                icon="pi pi-file-edit"
                @click="clickEditTag(slotProps.data)"
                severity="help"
                title="编辑"
                variant="text"
                rounded
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <div class="flex justify-end gap-2" style="margin-top: 10px">
        <Button type="button" label="添加标签" @click="addTag" severity="success"></Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss"></style>
