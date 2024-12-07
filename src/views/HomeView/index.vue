<script setup lang="ts">
import IconVue from '@/components/icons/IconVue.vue'
import type {
  ContextMenu,
  DataTableRowClickEvent,
  DataTableRowContextMenuEvent,
  MultiSelectFilterEvent,
  TieredMenu,
} from 'primevue'
import Tree from 'primevue/tree'
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import {
  createFolder,
  deleteFile,
  downloadFile,
  getAllTag,
  getFolder,
  postAddTag,
  postSaveFile,
  putFile,
  renameFile,
  searchFile,
  searchTags,
  updateFile,
  type FileItem,
  type IPutFileRes,
  type ISearchFileParams,
  type ISearchResItem,
  type TagItem,
  type TagValueItem,
} from '@/service/home'
import type { TreeNode } from 'primevue/treenode'
import type { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem'
import createFolderBtn from './components/create-folder-btn.vue'
import { downloadUrl, formatTimestamp, selectLocalFile } from './utils'
import { Icon } from '@iconify/vue'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'
import TagWindow from './components/tags/index.vue'
import { cloneDeep, filter } from 'lodash'

const toast = useToast()
type FileId = string

/** 当前激活的文件夹id */
const currFolderId = ref<FileId>()

/** 当前展开的文件夹id */
const currExpandFolderIds = ref<FileId[]>([])

const selectedKey = ref<Record<string, boolean>>({})
const expandedKeys = ref<Record<FileId, boolean>>({})

watchEffect(() => {
  if (!currFolderId.value) {
    selectedKey.value = {}
  } else if (!selectedKey.value[currFolderId.value]) {
    selectedKey.value = { [currFolderId.value]: true }
  }
})

watchEffect(() => {
  expandedKeys.value = {}
  for (let k of currExpandFolderIds.value) {
    expandedKeys.value[k] = true
  }
})

const selectedNode = computed(() => {
  if (!currFolderId.value) {
    return null
  } else {
    return getNodeByKey(currFolderId.value, folderNodes.value[0])
  }
})

const currFolderItem = computed<null | FileItem>(() => {
  if (!selectedNode.value) return null
  return selectedNode.value.data
})

const getNodeByKey = (key: string, treeNode?: TreeNode): TreeNode | null => {
  if (!treeNode) {
    treeNode = folderNodes.value[0]
  }
  if (treeNode.key === key) return treeNode
  if (treeNode.children) {
    for (let item of treeNode.children) {
      let r = getNodeByKey(key, item)
      if (r) return r
    }
  }
  return null
}

/** 展开文件夹 */
const makeExpandFolder = (fileId: string) => {
  if (!currExpandFolderIds.value.includes(fileId)) {
    currExpandFolderIds.value.push(fileId)
  }
}

/** 折叠文件夹 */
const makeCollapseFolder = (fileId: string) => {
  const idx = currExpandFolderIds.value.indexOf(fileId)
  if (idx === -1) return
  currExpandFolderIds.value.splice(idx, 1)
}

/** 选中文件夹 */
const makeSelectFolder = (fileId: string) => {
  currFolderId.value = fileId
}

const onNodeSelect = (node: TreeNode) => {
  currFolderId.value = node.key
}
const onNodeUnSelect = (node: TreeNode) => {}

const onNodeCollapse = (node: TreeNode) => {
  currExpandFolderIds.value = currExpandFolderIds.value.filter((it) => it !== node.key)
}

/** 默认展开一级 */
const folderNodes = ref<TreeNode[]>([])

const getRootData = async () => {
  const res = await getFolder()
  folderNodes.value = [res].map(({ folder, files }) => {
    return {
      key: folder.fileId,
      label: folder.name,
      icon: 'pi pi-folder',
      data: folder,
      leaf: false,
      /** 左侧只展示文件夹 */
      children: files
        .filter((item) => item.fileType === 'FOLDER')
        .map((it) => {
          return {
            key: it.fileId,
            label: it.name,
            icon: 'pi pi-folder',
            data: it,
            /** 文件夹没有子文件 */
            leaf: it.fileSize === 0,
            loading: false,
          }
        }),
    }
  })
  currFolderId.value = folderNodes.value[0].key
  // currExpandFolderIds.value = [folderNodes.value[0].key]
  selectedKey.value = { [folderNodes.value[0].key]: true }
  // expandedKeys.value = {
  //   [folderNodes.value[0].key]: true,
  // }
  // console.log('当前节点', selectedNode.value?.data.fileId)
}

onMounted(async () => {
  getRootData()
})

const allTags = ref<TagItem[]>([])

onMounted(async () => {
  allTags.value = await getAllTag()
})

/** Tree组件内部会先设置expendKeys的值，再emit */
const onNodeExpand = async (node: TreeNode) => {
  if (node.children) {
    makeExpandFolder(node.key)
    return
  }
  node.loading = true
  const res = await getFolder(node.key)
  node.children = res.files
    .filter((item) => item.fileType === 'FOLDER')
    .map((it) => {
      return {
        key: it.fileId,
        label: it.name,
        icon: 'pi pi-folder',
        leaf: it.fileSize === 0,
        data: it,
        loading: false,
      }
    })
  node.loading = false
  /** 展开 */
  makeExpandFolder(node.key)
}

/** 由currKey得到当前节点TreeNode */

const uploadMenu = ref<InstanceType<typeof TieredMenu> | null>(null)

const clickUpload = (e: MouseEvent) => {
  uploadMenu.value?.toggle(e)
}

const showFileSaveDialog = ref(false)
const fileSaveData = ref<IPutFileRes | null>(null)

const ShowEditDialog = ref(false)
// const fileRenameData = ref<{ fileId: string; oldName: string; newName: string }>({
//   fileId: '',
//   oldName: '',
//   newName: '',
// })

const editFileData = ref<FileItem | null>(null)

/** 取消保存 */
const clickCancelSave = async () => {
  showFileSaveDialog.value = false
}

/** 确认修改文件信息 */
const clickConfirmEditFile = async () => {
  if (!editFileData.value) return
  const name = editFileData.value.name
  updateFile({
    fileId: editFileData.value.fileId,
    name: editFileData.value.name,
    tags: editFileData.value.tags,
  })
    .then(() => {
      toast.add({
        severity: 'success',
        summary: '修改成功',
        detail: `${name}`,
        life: 2000,
      })
      ShowEditDialog.value = false
      if (!isSearchMode.value) {
        const idx = tableData.value.findIndex((item) => item.fileId === editFileData.value!.fileId)
        if (idx !== -1) {
          tableData.value[idx].name = editFileData.value!.name
          tableData.value[idx].tags = editFileData.value!.tags
        }
      } else {
        const idx = searchResData.value.findIndex(
          (item) => item.fileId === editFileData.value!.fileId,
        )
        if (idx !== -1) {
          searchResData.value[idx].name = editFileData.value!.name
          searchResData.value[idx].tags = editFileData.value!.tags
        }
      }
    })
    .catch((err) => {
      toast.add({
        severity: 'error',
        summary: '修改失败',
        detail: `${err.message}`,
        life: 2000,
      })
    })
}
/** 确认保存 */
const clickConfirmSave = async () => {
  if (!currFolderId.value) return
  await postSaveFile({
    folderId: currFolderId.value,
    name: fileSaveData.value!.name,
    fileSize: fileSaveData.value!.size,
    documentType: fileSaveData.value!.documentType,
    url: fileSaveData.value!.url,
    createTime: Date.now(),
    updateTime: Date.now(),
  })
    .then(() => {
      toast.add({
        severity: 'success',
        summary: '上传成功',
        detail: `${fileSaveData.value?.name}`,
        life: 2000,
      })
      showFileSaveDialog.value = false
      onCreateFile()
    })
    .catch((err) => {
      toast.add({
        severity: 'error',
        summary: '保存失败',
        detail: `${err.message}`,
        life: 2000,
      })
    })
}

const mockUploadFile = async () => {
  fileSaveData.value = {
    url: '2024-11-28/1436851332_ES文件检索管理系统-初步清单.xlsx',
    name: 'ES文件检索管理系统-初步清单.xlsx',
    documentType: 'EXCEL',
    size: 11557,
  }
  showFileSaveDialog.value = true
}
const startUploadFile = async () => {
  if (!currFolderId.value) return
  // mockUploadFile()
  // return
  const file = await selectLocalFile({
    accept: '.doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .md, .pdf',
  })
  putFile(file, currFolderId.value)
    .then((res) => {
      onCreateFile()
    })
    .catch((error) => {
      toast.add({
        severity: 'error',
        summary: '上传失败',
        detail: `${error.message}`,
        life: 2000,
      })
    })
}

const tableData = ref<FileItem[]>([])

const getTableData = async () => {
  if (!currFolderId.value) tableData.value = []
  else {
    const res = await getFolder(currFolderId.value)
    tableData.value = res.files
  }
}

watch(
  currFolderId,
  async (v) => {
    getTableData()
  },
  { immediate: true },
)

const contextSelectRow = ref<FileItem | null>(null)

const onRowClick = (ev: DataTableRowClickEvent) => {
  const row: FileItem = ev.data
  if (row.fileType === 'FOLDER') {
    openFolder(row.fileId)
  }
}

const onClickRowAction = (ev: MouseEvent, data: FileItem) => {
  contextSelectRow.value = data
  /** 打开context菜单 */
  tableCMenu.value!.toggle(ev)
  ev.stopPropagation()
  ev.preventDefault()
}

const onRowContext = (ev: DataTableRowContextMenuEvent) => {
  /** 记录点击的数据 */
  contextSelectRow.value = ev.data
  /** 打开context菜单 */
  tableCMenu.value!.show(ev.originalEvent)
  ev.originalEvent.stopPropagation()
  ev.originalEvent.preventDefault()
}

const getRowClass = () => {
  return 'table-row'
}

/** 进入文件夹 */
const openFolder = (fileId: string) => {
  const targetFileId = fileId
  if (!targetFileId) return
  /** 如果是搜索模式，则关闭搜索 */
  if (isSearchMode.value) {
    clickCloseSearch()
  }
  makeSelectFolder(targetFileId)
  let fid = targetFileId
  while (true) {
    /** 依次展开 */
    const node = getNodeByKey(fid)
    if (!node) break
    const fileItem = node.data as FileItem
    if (!fileItem.folderId) break
    makeExpandFolder(fileItem.folderId)
    fid = fileItem.folderId
  }
}

const handleContextClick = (ev: MenuItemCommandEvent) => {
  if (!contextSelectRow.value) return
  if (ev.item.label === '打开') {
    openFolder(contextSelectRow.value!.fileId)
  } else if (ev.item.label === '下载') {
    var url = '/api/v1/file/download?fileId=' + contextSelectRow.value!.fileId
    downloadUrl(url, contextSelectRow.value!.name)
  } else if (ev.item.label === '删除') {
    deleteFile({ fileId: contextSelectRow.value!.fileId }).then(() => {
      toast.add({
        severity: 'success',
        summary: '删除成功',
        life: 2000,
      })
      if (!isSearchMode.value) {
        return onFileStatusChange()
      }
      /** 从文件列表移除 */
      const delIdx = searchResData.value.findIndex(
        (item) => item.fileId === contextSelectRow.value!.fileId,
      )
      if (delIdx !== -1) {
        searchResData.value.splice(delIdx, 1)
      }
    })
  } else if (ev.item.label === '修改') {
    editFileData.value = cloneDeep({ ...contextSelectRow.value })
    ShowEditDialog.value = true
  }
}

const contextItems = computed<MenuItem[]>(() => {
  if (contextSelectRow.value?.fileType === 'DOCUMENT' || isSearchMode.value) {
    return [
      {
        label: '下载',
        icon: 'pi pi-cloud-download',
        command: handleContextClick,
      },
      {
        label: '删除',
        icon: 'pi pi-delete-left',
        command: handleContextClick,
      },
      {
        label: '修改',
        icon: 'pi pi-file-edit',
        command: handleContextClick,
      },
    ]
  }
  return [
    {
      label: '打开',
      icon: 'pi pi-folder-open',
      command: handleContextClick,
    },
    {
      label: '删除',
      icon: 'pi pi-delete-left',
      command: handleContextClick,
    },
    {
      label: '重命名',
      icon: 'pi pi-file-edit',
      command: handleContextClick,
    },
  ]
})

const breadCrumItems = ref<MenuItem[]>([])

function findFilePath(targetKey: string): TreeNode[] | null {
  // 路径存储
  const path: TreeNode[] = []
  const tree = folderNodes.value[0]

  // 内部递归函数
  function dfs(node: TreeNode): boolean {
    // 将当前节点加入路径
    path.push(node)

    // 如果找到目标节点
    if (node.key === targetKey) {
      return true
    }

    // 遍历子节点
    for (const child of node.children || []) {
      if (dfs(child)) {
        return true
      }
    }

    // 如果当前路径无效，回溯
    path.pop()
    return false
  }

  // 从根节点开始深度优先搜索
  if (dfs(tree)) {
    return path
  }

  // 如果没有找到，返回 null
  return null
}

const handleClickBreadCrum = (ev: MenuItemCommandEvent) => {
  const key = ev.item.key
  openFolder(key!)
}

const filePathString = ref('')

watch(currFolderId, () => {
  if (!currFolderId.value) return
  /** 获取文件路径name */
  const nodePath = findFilePath(currFolderId.value)
  if (!nodePath) return
  const filePath: FileItem[] = nodePath.map((item) => item.data)
  breadCrumItems.value = filePath.map((item, idx) => ({
    label: item.name,
    key: item.fileId,
    icon: idx === 0 ? 'pi pi-home' : '',
    command: handleClickBreadCrum,
  }))
  filePathString.value = filePath.map((item) => item.name).join('/')
})

const tableCMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const clickTableAction = (ev: MouseEvent) => {
  tableCMenu.value?.toggle(ev)
}

const searchValue = ref('')

const clickCloseSearch = () => {
  searchValue.value = ''
}

const onFileStatusChange = async () => {
  /** 刷新当前节点的信息 */
  const res = await getFolder(currFolderId.value)
  selectedNode.value!.children = res.files
    .filter((item) => item.fileType === 'FOLDER')
    .map((it) => {
      return {
        key: it.fileId,
        label: it.name,
        icon: 'pi pi-folder',
        data: it,
        /** 文件夹没有子文件 */
        leaf: it.fileSize === 0,
        loading: false,
      }
    })
  getTableData()
}

/** 上传文件后，更新状态 */
const onCreateFile = async () => {
  onFileStatusChange()
}

const onCreateFolder = async () => {
  onFileStatusChange()
}

const isSearchMode = computed(() => {
  return !!searchValue.value
})

const selectedTagItem = ref<TagItem | null>(null)
const inputTagValue = ref('')
const inputNumberTagValue = ref([undefined, undefined])
const inputTagDateRange = ref<[Date | null, Date | null]>([null, null])
type SearchTagItem = TagValueItem
const filterItems = ref<SearchTagItem[]>([])

const removeSearchTag = (tag: SearchTagItem) => {
  const idx = filterItems.value.findIndex((it) => it.tagId === tag.tagId && it.value === tag.value)
  if (idx !== -1) {
    filterItems.value.splice(idx, 1)
  }
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}`
}

const formatDataType = (s: string | number[] | Date[] | any[]) => {
  if (!Array.isArray(s)) return s.toString()
  return s
    .map((item) => {
      if (item === null || item === undefined) return ''
      if (item instanceof Date) {
        return formatDate(item)
      }
      return item.toString()
    })
    .join('-')
}

const clickAddFilterItem = () => {
  if (!selectedTagItem.value) return
  const dataType = selectedTagItem.value.dataType
  if (dataType === 'STRING' && !inputTagValue.value) {
    toast.add({
      severity: 'warn',
      summary: '请输入标签值',
      life: 1200,
    })
    return
  }
  if (dataType === 'NUMBER' && inputNumberTagValue.value.find((item) => item === undefined)) {
    toast.add({
      severity: 'warn',
      summary: '请输入标签值',
      life: 1200,
    })
    return
  }
  if (dataType === 'DATE' && inputTagDateRange.value.find((item) => !item)) {
    toast.add({
      severity: 'warn',
      summary: '请输入标签值',
      life: 1200,
    })
    return
  }
  const origin_value =
    dataType === 'STRING'
      ? inputTagValue.value
      : dataType === 'NUMBER'
        ? inputNumberTagValue.value
        : inputTagDateRange.value
  const item = {
    ...selectedTagItem.value,
    value: formatDataType(origin_value),
    origin_value: origin_value,
  }
  if (filterItems.value.find((it) => it.tagId === item.tagId && it.value === item.value)) return
  filterItems.value.push(item)
}
const searchTagOptions = computed(() => {
  return allTags.value.filter((item) => item.isCanSearch)
})

/** 选择的标签 */
// const selectedTags = ref<Tag[]>([])
const dateRange = ref<[Date | null, Date | null]>([null, null])
// const tagOptions = ref<Tag[]>([])

const orderOptions = ref([
  { name: '时间', value: 'TIME' },
  { name: '相关度', value: 'RELEVANCE' },
])
const selectOrder = ref({ name: '时间', value: 'TIME' })

// const listenTagInputKeyUp = (ev: KeyboardEvent) => {
//   if (ev.key !== 'Enter') return
//   const target = ev.target as HTMLElement | null
//   if (!(target instanceof HTMLElement)) return
//   if (!target.classList.contains('p-multiselect-filter')) return
// }

/** 搜索结果数据 */
const searchResData = ref<ISearchResItem[]>([])

// onMounted(() => {
//   window.addEventListener('keyup', listenTagInputKeyUp)
// })
// onUnmounted(() => {
//   window.removeEventListener('keyup', listenTagInputKeyUp)
// })

const currTagFilterValue = ref('')

let searchTid = 0 as any

// todo
const searchParams = computed<ISearchFileParams | null>(() => {
  if (!isSearchMode.value) return null
  const res: ISearchFileParams = {
    folderId: currFolderId.value!,
    startTime: dateRange.value[0] ? dateRange.value[0].getTime() : null,
    endTime: dateRange.value[1] ? dateRange.value[1].getTime() : null,
    keyword: searchValue.value,
    sortBy: selectOrder.value.value,
    // search接口参数怎么传？
    tagFilters: filterItems.value.map((item) => {
      return {
        tagId: item.tagId,
      }
    }) as any,
  }
  return res
})

let sid = 0 as any

const startSearchFile = async () => {
  if (!searchParams.value) return
  const res = await searchFile({ ...searchParams.value })
  searchResData.value = res
}

const onSearch = async () => {
  if (!searchParams.value) return
  clearTimeout(sid)
  sid = setTimeout(() => {
    startSearchFile()
  }, 500)
}

watch(searchParams, onSearch, { deep: true })

const router = useRouter()

/** 展示标签管理弹窗 */
const showTagWindow = ref(false)
const clickTagPage = () => {
  showTagWindow.value = true
}
</script>

<template>
  <div class="home-view">
    <div class="left">
      <div class="title">
        <IconVue />
        <span style="margin-left: 10px">中远海运</span>
        <Button label="标签管理" @click="clickTagPage" severity="info" variant="text" />
      </div>

      <div class="tree">
        <Tree
          :selectionKeys="selectedKey"
          :value="folderNodes"
          @node-select="onNodeSelect"
          @node-unselect="onNodeUnSelect"
          @node-collapse="onNodeCollapse"
          @node-expand="onNodeExpand"
          selectionMode="single"
          :expanded-keys="expandedKeys"
          loading-mode="icon"
        ></Tree>
      </div>
    </div>
    <div class="right">
      <div class="header" style="display: flex; min-width: 300px">
        <IconField style="width: 70%">
          <InputIcon class="pi pi-search" />
          <InputText style="width: 100%" v-model="searchValue" placeholder="搜索" />
        </IconField>
        <Button
          style="margin-left: 10px"
          size="small"
          icon="pi pi-times"
          label="关闭搜索"
          severity="info"
          @click="clickCloseSearch"
          v-if="isSearchMode"
        />
      </div>
      <div class="list-mode" v-if="!isSearchMode">
        <div class="nav">
          <Breadcrumb :model="breadCrumItems" />
        </div>
        <div class="action">
          <div class="upload">
            <Button
              icon="pi pi-cloud-upload"
              label="上传文件"
              icon-pos="left"
              severity="secondary"
              @click="startUploadFile"
              raised
              aria-controls="overlay_upload_menu"
            />
            <!-- <TieredMenu ref="uploadMenu" id="overlay_upload_menu" :model="uploadItems" popup /> -->
          </div>
          <div class="new" style="margin-left: 20px">
            <create-folder-btn
              v-if="currFolderId"
              @created="onCreateFolder"
              :folder-id="currFolderId"
            ></create-folder-btn>
          </div>
        </div>
        <div class="file-table" style="margin-top: 10px">
          <DataTable
            style=""
            :value="tableData"
            @row-contextmenu="onRowContext"
            @row-click="onRowClick"
            :row-class="getRowClass"
            scrollable
            scroll-height="calc(100vh - 230px)"
          >
            <template #empty>
              <div style="display: flex; justify-content: center">
                <Message severity="secondary" variant="simple">此文件夹为空</Message>
              </div>
            </template>
            <Column field="name" header="名称">
              <template #body="slotProps: { data: FileItem }">
                <div class="file-name">
                  <Icon
                    v-show="slotProps.data.fileType === 'FOLDER'"
                    icon="material-symbols:folder"
                    color="#5dade2"
                    width="28"
                  ></Icon>
                  <Icon
                    icon="bx:file"
                    color="#cccccc"
                    width="28"
                    v-show="slotProps.data.fileType === 'DOCUMENT'"
                  ></Icon>
                  <span>{{ slotProps.data.name }}</span>
                </div>
              </template>
            </Column>

            <Column :header="item.label" v-for="item in allTags" :key="item.tagId">
              <template #body="slotProps: { data: FileItem }">
                <div class="file-name">
                  <Tag
                    v-if="slotProps.data.tags[item.tagId]"
                    severity="info"
                    :value="slotProps.data.tags[item.tagId].value"
                  ></Tag>
                </div>
              </template>
            </Column>

            <Column field="updateTime" header="修改时间" style="width: 200px">
              <template #body="slotProps">
                {{ formatTimestamp(slotProps.data.updateTime) }}
              </template>
            </Column>
            <Column header="" style="width: 100px">
              <template #body="slotProps">
                <Button
                  @click="onClickRowAction($event, slotProps.data)"
                  label=". . ."
                  severity="secondary"
                  variant="text"
                /> </template
            ></Column>
          </DataTable>
        </div>
      </div>

      <div class="search-mode" v-if="isSearchMode">
        <div class="filter-options" style="margin-top: 20px; padding-left: 30px">
          <div class="flex items-center gap-1 mb-4" style="flex-wrap: wrap">
            <span v-for="(item, idx) in filterItems" :key="idx">
              <Tag
                severity="info"
                :value="`${item.label}：${item.value}`"
                style="font-size: 1rem"
              ></Tag>
              <Button
                icon="pi pi-times"
                severity="danger"
                size="small"
                title="移除标签"
                style="margin-left: -2px"
                variant="text"
                rounded
                aria-label="Cancel"
                @click="removeSearchTag(item)"
              />
            </span>
          </div>
          <div class="flex items-center gap-4 mb-4">
            <label>添加筛选项</label>
            <Select
              v-model="selectedTagItem"
              :options="searchTagOptions"
              optionLabel="label"
              placeholder="选择标签"
              class="w-full md:w-56"
              style="width: 120px"
              filter
            />
            <InputText
              v-if="selectedTagItem?.dataType === 'STRING'"
              type="text"
              v-model="inputTagValue"
              placeholder="请输入值"
            />
            <span v-if="selectedTagItem?.dataType === 'NUMBER'">
              <InputNumber
                size="small"
                style="width: 100px"
                v-model="inputNumberTagValue[0]"
                showButtons
                fluid
              />
              -
              <InputNumber
                size="small"
                style="width: 100px"
                v-model="inputNumberTagValue[1]"
                showButtons
                fluid
              />
            </span>

            <span class="flex items-center" v-if="selectedTagItem?.dataType === 'DATE'">
              <DatePicker
                showTime
                hourFormat="24"
                style="width: 12rem"
                v-model="inputTagDateRange[0]"
                :manualInput="false"
                date-format="yy/mm/dd"
                show-button-bar
                fluid
              />
              -
              <DatePicker
                showTime
                hourFormat="24"
                style="width: 12rem"
                v-model="inputTagDateRange[1]"
                :manualInput="false"
                date-format="yy/mm/dd"
                show-button-bar
                fluid
              />
            </span>

            <Button
              :disabled="!selectedTagItem"
              @click="clickAddFilterItem"
              label="确认添加"
              size="small"
              severity="success"
              v-if="selectedTagItem"
            />
          </div>
          <div class="flex items-center gap-4 mb-4">
            <label>时间范围</label>
            <DatePicker
              showTime
              hourFormat="24"
              style="width: 12rem"
              v-model="dateRange[0]"
              :manualInput="false"
              date-format="yy/mm/dd"
              show-button-bar
              fluid
            />
            -
            <DatePicker
              showTime
              hourFormat="24"
              style="width: 12rem"
              v-model="dateRange[1]"
              :manualInput="false"
              date-format="yy/mm/dd"
              show-button-bar
              fluid
            />
            <!-- <Button
              label="清除"
              v-show="dateRange[0] || dateRange[1]"
              severity="secondary"
              variant="text"
              @click="clearDateRange"
            /> -->
          </div>
        </div>
        <div class="search-res">
          <DataTable
            :value="searchResData"
            @row-contextmenu="onRowContext"
            @row-click="onRowClick"
            :row-class="getRowClass"
            :show-headers="true"
          >
            <template #header>
              <div class="flex flex-wrap items-center justify-start gap-2">
                <span class="text-2xl font-bold">搜索结果</span>
                <SelectButton
                  size="small"
                  option-label="name"
                  v-model="selectOrder"
                  :options="orderOptions"
                />
              </div>
            </template>
            <Column field="name" header="文件名">
              <template #body="slotProps: { data: ISearchResItem }">
                <div class="file-name" style="font-size: 1.25rem">
                  <Icon icon="bx:file" color="#cccccc" width="28"></Icon>
                  <span>{{ slotProps.data.name }}</span>
                </div>
                <div class="card flex flex-wrap gap-4">
                  <Message
                    style="margin-left: 30px; margin-top: 10px"
                    severity="secondary"
                    variant="simple"
                    >{{ slotProps.data.description }}</Message
                  >
                </div>
              </template>
            </Column>

            <Column :header="item.label" v-for="item in allTags" :key="item.tagId">
              <template #body="slotProps: { data: FileItem }">
                <div class="file-name">
                  <Tag
                    v-if="slotProps.data.tags[item.tagId]"
                    severity="info"
                    :value="slotProps.data.tags[item.tagId].value"
                  ></Tag>
                </div>
              </template>
            </Column>
            <Column header="" style="width: 100px">
              <template #body="slotProps">
                <Button
                  @click="onClickRowAction($event, slotProps.data)"
                  label=". . ."
                  severity="secondary"
                  variant="text"
                /> </template
            ></Column>

            <template #footer> 共有 {{ searchResData.length }} 条搜索结果</template>
          </DataTable>
        </div>
      </div>

      <ContextMenu ref="tableCMenu" :model="contextItems" />
    </div>

    <Dialog
      v-model:visible="showFileSaveDialog"
      modal
      header="文件保存"
      :style="{ width: '35rem' }"
    >
      <div class="flex items-center gap-4 mb-4" style="margin-top: 10px">
        <label class="w-24">文件类型</label>
        <Message size="small" severity="success" variant="outlined"
          >{{ fileSaveData!.documentType }}
        </Message>
      </div>
      <div class="flex gap-4 mb-4 items-center">
        <label class="w-24">文件路径</label>
        <Message size="small" severity="secondary" variant="outlined"
          >{{ filePathString }}/
        </Message>
      </div>
      <div class="flex gap-4 mb-4 items-center">
        <label for="name" class="w-24">文件名</label>
        <InputText
          placeholder="请输入文件名"
          v-model="fileSaveData!.name"
          id="name"
          class="flex-auto"
          autocomplete="off"
        />
      </div>
      <div class="flex justify-end gap-2">
        <Button type="button" label="取消" severity="secondary" @click="clickCancelSave"></Button>
        <Button type="button" label="确认" @click="clickConfirmSave"></Button>
      </div>
    </Dialog>

    <Dialog v-model:visible="ShowEditDialog" modal header="文件修改" :style="{ width: '48rem' }">
      <div class="flex items-center gap-4 mb-4" style="margin-top: 10px" v-if="editFileData">
        <label class="w-16">文件名</label>
        <InputText
          placeholder=""
          v-model="editFileData.name"
          class="flex-auto"
          autocomplete="off"
        />
      </div>
      <div class="flex gap-4 mb-4" style="margin-top: 10px" v-if="editFileData">
        <label class="w-16">标签</label>
        <div style="display: flex; flex-wrap: wrap">
          <div
            class="tag-item"
            style="margin-left: 10px; margin-bottom: 10px"
            v-for="item in allTags"
            :key="item.tagId"
          >
            <IftaLabel v-show="editFileData.tags[item.tagId]">
              <InputText
                :id="item.tagId"
                v-model="editFileData.tags[item.tagId].value"
                variant="filled"
                style="width: 130px"
              />
              <label :for="item.tagId">{{ item.label }}</label>
            </IftaLabel>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="取消"
          severity="secondary"
          @click="ShowEditDialog = false"
        ></Button>
        <Button type="button" label="确认" @click="clickConfirmEditFile"></Button>
      </div>
    </Dialog>

    <TagWindow v-model="showTagWindow"></TagWindow>
  </div>
</template>

<style scoped lang="scss">
.home-view {
  width: 100%;
  height: 100vh;
  margin-top: 0;
  display: flex;

  .left {
    width: 380px;
    height: 100%;
    background-color: rgb(245, 245, 245);
  }
}

.right {
  width: calc(100vw - 380px);
  padding: 20px 20px;

  .header {
    padding-left: 20px;
  }

  .nav {
    margin-top: 20px;
  }

  .action {
    display: flex;
    justify-content: flex-end;
  }
}

.tree {
  --p-tree-background: rgb(245, 245, 245);
}

.title {
  padding-top: 20px;
  padding-left: 30px;
  display: flex;
  align-items: center;

  span {
    font-size: 18px;
    font-weight: bold;
  }
}

.file-name {
  display: flex;
  align-items: center;

  svg {
    flex-shrink: 0;
    margin-right: 3px;
  }
}

:deep(.table-row:hover) {
  background-color: rgb(229, 243, 255) !important;
}
</style>
