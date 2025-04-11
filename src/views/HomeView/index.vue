<script setup lang="ts">
import IconVue from '@/components/icons/IconVue.vue'
import { useConfirm } from 'primevue/useconfirm'
import type {
  ContextMenu,
  DataTableRowClickEvent,
  DataTableRowContextMenuEvent,
  MultiSelectFilterEvent,
  PageState,
  TieredMenu,
} from 'primevue'
import Tree from 'primevue/tree'
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import {
  checkExist,
  createFolder,
  deleteFile,
  downloadFile,
  getAllFolder,
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
  type Folder,
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
import { cloneDeep, filter, over } from 'lodash'
import { useResizableSidebar } from '@/hooks/useResizableSidebar'
import inputList from '@/components/inputList/index.vue'
import inputTagList from '@/components/inputList/tags.vue'
import Paginator from 'primevue/paginator'
import UploadPanel from './components/uploadPanel.vue'
import axios, { type CancelTokenSource } from 'axios'
import request from '@/utils/request'
import { debounce } from 'lodash'

// 默认宽度 300px，最小宽度 150px，最大宽度 600px
const { sidebarWidth, handleMouseDown } = useResizableSidebar(300, 150, 600)

const toast = useToast()
type FileId = string

/** 当前激活的文件夹id */
const currFolderId = ref<FileId>()

/** 当前展开的文件夹id */
const currExpandFolderIds = ref<FileId[]>([])

const selectedKey = ref<Record<string, boolean>>({})
const expandedKeys = ref<Record<FileId, boolean>>({})

const pagination = ref({
  ps: 20,
  total: 0,
  pn: 1,
  sizeOption: [20, 50, 100],
})

const onPageSizeChange = (v: number) => {
  console.log('pageSize', v)
}

const onPageNumChange = (v: number) => {
  console.log('pageNum', v)
}

/** pageNum从0开始，每次点击都会触发这个函数 */
const onPageChange = (state: PageState) => {
  const ps = state.rows
  const pn = state.page + 1
  if (ps === pagination.value.ps && pn === pagination.value.pn) return
  pagination.value.ps = ps
  pagination.value.pn = pn
  getTableData()
}

const onSearchPageChange = (state: PageState) => {
  const ps = state.rows
  const pn = state.page + 1
  if (ps === searchPagination.value.ps && pn === searchPagination.value.pn) return
  searchPagination.value.ps = ps
  searchPagination.value.pn = pn
}
watchEffect(() => {
  if (!currFolderId.value) {
    selectedKey.value = {}
  } else if (!selectedKey.value[currFolderId.value]) {
    selectedKey.value = { [currFolderId.value]: true }
  }
})

watchEffect(() => {
  expandedKeys.value = {}
  for (const k of currExpandFolderIds.value) {
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
    for (const item of treeNode.children) {
      const r = getNodeByKey(key, item)
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
  const res = await getFolderData('', pagination.value.pn, pagination.value.ps)
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

const formatTagList = (tabValue: string | string[]) => {
  if (typeof tabValue === 'string') return [tabValue]
  return tabValue
}
const setAllTags = async () => {
  allTags.value = (await getAllTag()).filter((item) => item.isActive)
}
onMounted(async () => {
  setAllTags()
})

/** Tree组件内部会先设置expendKeys的值，再emit */
const onNodeExpand = async (node: TreeNode) => {
  if (node.children) {
    makeExpandFolder(node.key)
    return
  }
  node.loading = true
  const res = await getFolderData(node.key, pagination.value.pn, pagination.value.ps)
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
  const tags: Record<string, TagValueItem> = {}
  for (const key in editFileData.value.tags) {
    if (
      editFileData.value.tags[key].value !== undefined &&
      editFileData.value.tags[key].value !== null
    ) {
      tags[key] = editFileData.value.tags[key]
      if (tags[key].isList) {
        tags[key].value = tags[key].value.filter((item: any) => !!item)
      }
      /** 时间格式转化为时间戳 */
      if (tags[key].dataType === 'DATE') {
        tags[key].value = tags[key].value?.getTime() || tags[key].value
      }
    }
  }
  updateFile({
    fileId: editFileData.value.fileId,
    name: editFileData.value.name,
    tags: tags,
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

const confirm = useConfirm()

/** 同名文件确认框 */
const confirmFilename = () => {
  return new Promise((resolve, reject) => {
    confirm.require({
      message: '当前目录下存在同名文件，是否覆盖？',
      header: '上传提示',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: '否',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: '是',
      },
      accept: () => {
        resolve(true)
      },
      reject: () => {
        resolve(false)
      },
    })
  })
}

const doUploadFile = (file: File) => {
  if (!currFolderId.value) return
  putFile(file, currFolderId.value)
    .then((res) => {
      onCreateFile()
      toast.add({
        severity: 'success',
        summary: '上传成功',
        detail: `${res.name}`,
        group: 'br',
        life: 3000,
      })
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

const startUploadFile = async () => {
  if (!currFolderId.value) return
  // mockUploadFile()
  // return
  const file = await selectLocalFile({
    accept: '.doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .md, .pdf',
  })

  const isExist = await checkExist(file.name, currFolderId.value)
  if (isExist) {
    const override = await confirmFilename()
    if (override) {
      doUploadFile(file)
    } else {
      toast.add({
        severity: 'secondary',
        summary: '已取消上传',
        group: 'tr',
        life: 2000,
      })
    }
  } else {
    doUploadFile(file)
  }
}

const tableData = ref<FileItem[]>([])

const getTableData = async () => {
  if (!currFolderId.value) tableData.value = []
  else {
    const res = await getFolderData(currFolderId.value, pagination.value.pn, pagination.value.ps)
    folderPath.value = res.folder.folderPath
    canUploadFile.value = res.folder.canUploadFile
    tableData.value = res.files
    pagination.value.total = res.page.total || tableData.value.length
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
    const url = '/api/v1/file/download?fileId=' + contextSelectRow.value!.fileId
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
    for (const item of allTags.value) {
      if (!editFileData.value.tags[item.tagId]) {
        editFileData.value.tags[item.tagId] = { ...item, value: undefined }
        if (item.isList) {
          editFileData.value.tags[item.tagId].value = []
        }
      } else {
        if (item.dataType === 'DATE') {
          editFileData.value.tags[item.tagId].value = new Date(
            editFileData.value.tags[item.tagId].value,
          )
        }
      }
    }
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
      label: '修改',
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
const folderPath = ref<any[]>([])
const canUploadFile = ref(true)
watch(folderPath, () => {
  breadCrumItems.value = folderPath.value.map((item, idx) => ({
    label: item.name,
    key: item.fileId,
    icon: idx === 0 ? 'pi pi-home' : '',
    command: handleClickBreadCrum,
  }))
  filePathString.value = folderPath.value.map((item) => item.name).join('/')
})

watch(currFolderId, () => {
  if (!currFolderId.value) return
  /** 获取文件路径name */
  // const nodePath = findFilePath(currFolderId.value)
  // if (!nodePath) return
  // const filePath: FileItem[] = nodePath.map((item) => item.data)
  // breadCrumItems.value = filePath.map((item, idx) => ({
  //   label: item.name,
  //   key: item.fileId,
  //   icon: idx === 0 ? 'pi pi-home' : '',
  //   command: handleClickBreadCrum,
  // }))
  // filePathString.value = filePath.map((item) => item.name).join('/')
  // const filePath = currFolderItem.value!.folderPath
  // console.log('fff', filePath)
  // breadCrumItems.value = filePath.map((item, idx) => ({
  //   label: item.name,
  //   key: item.name,
  //   icon: idx === 0 ? 'pi pi-home' : '',
  //   command: handleClickBreadCrum,
  // }))
  // filePathString.value = filePath.map((item) => item).join('/')
})

const tableCMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const clickTableAction = (ev: MouseEvent) => {
  tableCMenu.value?.toggle(ev)
}

const searchValue = ref('')

const clickCloseSearch = () => {
  searchValue.value = ''
}

const getFolderData = async (folderId: string | undefined, pn: number, ps: number) => {
  let res = await getFolder(folderId, pn, ps)
  return res
}

const onFileStatusChange = async () => {
  /** 刷新当前节点的信息 */
  const res = await getFolderData(currFolderId.value, pagination.value.pn, pagination.value.ps)
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

const debouncedRefresh = debounce(onFileStatusChange, 1000)

/** 上传文件后，更新状态 */
const onCreateFile = async () => {
  debouncedRefresh()
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
const searchName = ref(true)
const searchContent = ref(true)

const dateRange = ref<[Date | null, Date | null]>([null, null])
// const tagOptions = ref<Tag[]>([])
const filterTagData = ref<
  Record<
    string,
    { tagId: string; label: string; dataType: 'STRING' | 'NUMBER' | 'DATE'; param: any[] }
  >
>({})

const setFilterTagData = () => {
  for (const tag of allTags.value) {
    filterTagData.value[tag.tagId] = {
      tagId: tag.tagId,
      label: tag.label,
      dataType: tag.dataType,
      param: [],
    }
  }
}
watchEffect(() => {
  setFilterTagData()
})

const orderOptions = ref([
  { name: '相关度', value: 'RELEVANCE' },
  { name: '时间', value: 'TIME' },
])
const selectOrder = ref({ name: '相关度', value: 'RELEVANCE' })

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

const searchTid = 0 as any

// todo
const searchParams = computed<ISearchFileParams | null>(() => {
  if (!isSearchMode.value) return null
  const res: ISearchFileParams = {
    pageNo: searchPagination.value.pn,
    pageSize: searchPagination.value.ps,
    folderIds: Object.keys(folderSelectedValue.value || {}),
    startTime: dateRange.value[0] ? dateRange.value[0].getTime() : null,
    endTime: dateRange.value[1] ? dateRange.value[1].getTime() : null,
    keyword: searchValue.value,
    sortBy: selectOrder.value.value,
    searchContent: searchContent.value,
    searchName: searchName.value,
    tagFilters: Object.values(filterTagData.value).map((item) => {
      return {
        tagId: item.tagId,
        param:
          item.dataType === 'STRING'
            ? item.param
            : {
                from: item.param[0],
                to: item.param[1],
                includeLower: true,
                includeUpper: true,
              },
        condition: 'AND',
      }
    }),
  }
  return res
})

let sid = 0 as any

const searchPagination = ref({
  ps: 20,
  total: 0,
  pn: 1,
  sizeOption: [20, 50, 100],
})

const startSearchFile = async () => {
  if (!searchParams.value) return
  const res = await searchFile({ ...searchParams.value })
  searchResData.value = res.items
  searchPagination.value.total = res.total
}

const onSearch = async () => {
  if (!searchParams.value) return
  clearTimeout(sid)
  sid = setTimeout(() => {
    startSearchFile()
  }, 250)
}

watch(searchParams, onSearch, { deep: true })

const router = useRouter()

/** 展示标签管理弹窗 */
const showTagWindow = ref(false)
const clickTagPage = () => {
  showTagWindow.value = true
}

watch(showTagWindow, (v) => {
  if (!v) {
    setAllTags()
  }
})

const folderSelectedValue = ref<Record<string, boolean> | null>(null)
const folderOptions = ref<any[]>([])

const transformFolderNodes = (node: any): any[] => {
  return node.subFiles.map((item: any) => {
    return {
      key: item.folderId,
      label: item.name,
      icon: 'pi pi-folder',
      data: {
        path: `${node.name}/${item.name}`,
      },
      children: transformFolderNodes(item),
    }
  })
}

watch(isSearchMode, async () => {
  const res = await getAllFolder()
  folderOptions.value = [
    {
      key: res.folderId,
      label: res.name,
      icon: 'pi pi-folder',
      children: transformFolderNodes(res),
      data: {
        path: res.name,
      },
    },
  ]
  folderSelectedValue.value = { [currFolderId.value + '']: true }
})

const getFolderSelectPath = (item: any) => {
  return item.data.path
}

/** 拖拽上传 */
const onTableDrop = (event: DragEvent) => {
  event.stopPropagation()
  event.preventDefault()
  fileDraging.value = false
  const files = event.dataTransfer?.items
  if (!files) return
  let fileList: File[] = []
  for (var i = 0; i < files.length; i++) {
    let entry = files[i].webkitGetAsEntry()
    if (!entry) continue
    if (!entry.isDirectory) {
      const file = files[i].getAsFile()
      if (file) fileList.push(file)
    }
  }
  addUploadFiles(fileList)
}

type FileStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface UploadFile {
  id: number | string
  name: string
  size: number
  file: File
  progress: number
  loaded: number
  status: FileStatus
  cancelToken: CancelTokenSource | null
}
const fileUploadList = ref<UploadFile[]>([])
const maxConcurrentUploads = ref(3) // 默认并发数为3
const activeUploads = ref(0) // 当前活跃的上传任务数

const startFileUpload = () => {
  // 计算可启动的新上传任务数量
  const availableSlots = maxConcurrentUploads.value - activeUploads.value
  if (availableSlots <= 0) return
  const pendingFiles = fileUploadList.value
    .filter((f) => f.status === 'pending')
    .slice(0, availableSlots)
  pendingFiles.forEach((file) => {
    file.status = 'uploading'
    activeUploads.value++ // 增加活跃的上传任务数
    uploadSingleFile(file).finally(() => {
      onCreateFile()
      activeUploads.value-- // 上传完成后减少活跃的上传任务数
      startFileUpload() // 继续启动新的上传任务
    })
  })
}
const api = axios.create()
const uploadSingleFile = async (file: UploadFile) => {
  const formData = new FormData()
  formData.append('file', file.file)
  formData.append('folderId', currFolderId.value!)
  // 创建取消令牌源
  const source = axios.CancelToken.source()
  file.cancelToken = source
  try {
    await api({
      url: '/api/v1/file/upload',
      method: 'put',
      data: formData,
      cancelToken: source.token,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          file.progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          file.loaded = progressEvent.loaded
        }
      },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    file.status = 'completed'
    file.progress = 100
  } catch (error) {
    console.log('err', error)
    if (axios.isCancel(error)) {
      console.log('Upload canceled:', error.message)
    }
    file.status = 'error'
  } finally {
    file.cancelToken = null
  }
}

/** 用户取消上传 */
const cancelUpload = (file: UploadFile) => {
  if (file.cancelToken) {
    file.cancelToken.cancel('Upload canceled by user')
    activeUploads.value-- // 减少活跃的上传任务数
  }
  fileUploadList.value = fileUploadList.value.filter((f) => f.id !== file.id)
  startFileUpload() // 继续启动新的上传任务
}

const clearCompleted = () => {
  fileUploadList.value = fileUploadList.value.filter((f) => f.status !== 'completed')
}
const closePanel = () => {
  // 获取所有上传中的文件
  const uploadingFiles = fileUploadList.value.filter((f) => f.status === 'uploading')
  // 取消所有上传中的文件
  uploadingFiles.forEach((file) => {
    if (file.cancelToken) {
      file.cancelToken.cancel('Upload canceled by user')
    }
  })
  // 清空上传列表
  fileUploadList.value = []
}
// 处理重试上传
const handleRetryUpload = (file: UploadFile) => {
  // 1. 找到失败的原始文件
  const index = fileUploadList.value.findIndex((f) => f.id === file.id)
  if (index === -1) return

  // 2. 更新文件状态为pending
  fileUploadList.value[index] = {
    ...fileUploadList.value[index],
    status: 'pending',
    progress: 0,
    loaded: 0,
  }

  startFileUpload()
}
const addUploadFiles = (newFiles: File[]) => {
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i]
    fileUploadList.value.push({
      id: Date.now().toString() + i,
      name: file.name,
      size: file.size,
      file: file,
      progress: 0,
      loaded: 0,
      status: 'pending',
      cancelToken: null,
    })
  }
  startFileUpload()
}

const fileDraging = ref(false)
const fileDragingCount = ref(0)

const onTableDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!fileDraging.value) {
    const files = event.dataTransfer?.items || []
    fileDragingCount.value = files.length
    fileDraging.value = true
  }
}
const onTableDragLeave = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  fileDraging.value = false
}
</script>

<template>
  <div class="home-view">
    <div class="left" :style="{ width: sidebarWidth + 'px', minWidth: sidebarWidth + 'px' }">
      <div class="title">
        <!-- <IconVue /> -->
        <img style="width: 50px" src="/img.png" alt="" />
        <span style="margin-left: 10px">文件管理</span>
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

    <div class="resizer" @mousedown="handleMouseDown"></div>
    <div
      class="right"
      @drop="onTableDrop"
      @dragover="onTableDragOver"
      :style="{ width: `calc(100% - ${sidebarWidth}px)` }"
    >
      <div class="dragging-box" v-if="fileDraging" @dragleave="onTableDragLeave">
        上传 <span style="margin: 0 10px">{{ fileDragingCount }}</span> 个文件到
        <span class="path">{{ filePathString || '/' }}</span>
      </div>
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
              :disabled="!canUploadFile"
              :title="!canUploadFile ? '暂无上传权限' : ''"
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
            scroll-height="calc(100vh - 260px)"
          >
            <template #empty>
              <div style="display: flex; justify-content: center">
                <Message severity="secondary" variant="simple">此文件夹为空</Message>
              </div>
            </template>
            <Column frozen field="name" header="名称" style="min-width: 250px">
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

            <Column
              style="max-width: 200px; min-width: 150px"
              :header="item.label"
              v-for="item in allTags"
              :key="item.tagId"
            >
              <template #body="slotProps: { data: FileItem }">
                <div class="tag-name" v-if="slotProps.data.tags[item.tagId]">
                  <Tag
                    style="margin-right: 5px; margin-bottom: 8px"
                    severity="info"
                    :value="it"
                    v-for="(it, idx) in formatTagList(slotProps.data.tags[item.tagId].value)"
                  ></Tag>
                </div>
              </template>
            </Column>

            <Column
              frozen
              field="updateTime"
              alignFrozen="right"
              header="修改时间"
              style="min-width: 200px"
            >
              <template #body="slotProps">
                {{ formatTimestamp(slotProps.data.updateTime) }}
              </template>
            </Column>
            <Column frozen header="" alignFrozen="right" style="min-width: 100px">
              <template #body="slotProps">
                <Button
                  @click="onClickRowAction($event, slotProps.data)"
                  label=". . ."
                  severity="secondary"
                  variant="text"
                />
              </template>
            </Column>
          </DataTable>
        </div>
        <div class="pagination">
          <Paginator
            :rows="pagination.ps"
            :totalRecords="pagination.total"
            :rowsPerPageOptions="pagination.sizeOption"
            :first="pagination.ps * (pagination.pn - 1)"
            @page="onPageChange"
          >
            <template #start="slotProps"> 共 {{ pagination.total }} 条</template>
          </Paginator>
        </div>
      </div>

      <div class="search-mode" v-if="isSearchMode">
        <div class="filter-options" style="margin-top: 20px; padding-left: 30px">
          <Fieldset legend="筛选项" style="--p-fieldset-legend-border-width: 0px">
            <div style="max-height: 16rem; overflow: auto">
              <div class="flex items-center gap-4 mb-2" style="margin-top: 10px">
                <label class="edit-file-label">搜索名字</label>
                <input type="checkbox" v-model="searchName" />

                <label class="edit-file-label" style="margin-left: 30px">搜索文件夹</label>
                <input type="checkbox" v-model="searchContent" />
              </div>
              <div class="flex items-start gap-4 mb-2" style="margin-top: 10px">
                <label class="edit-file-label" style="margin-top: 10px">文件夹选择</label>
                <span>
                  <TreeSelect
                    v-model="folderSelectedValue"
                    filter
                    show-clear
                    selection-mode="multiple"
                    filterMode="strict"
                    :options="folderOptions"
                    placeholder="请选择"
                    style="width: 25rem"
                  >
                    <template #value="scope">
                      <div v-for="item in scope.value" :key="item.key">
                        {{ getFolderSelectPath(item) }}
                      </div>
                    </template>
                  </TreeSelect>
                </span>
              </div>

              <!--              <div class="flex items-center gap-4 mb-2" style="margin-top: 10px">-->
              <!--                <label class="edit-file-label">发布时间</label>-->
              <!--                <span>-->
              <!--                  <DatePicker-->
              <!--                    showTime-->
              <!--                    hourFormat="24"-->
              <!--                    style="width: 12rem"-->
              <!--                    placeholder="选择起始时间"-->
              <!--                    v-model:model-value="dateRange[0]"-->
              <!--                    :manualInput="false"-->
              <!--                    date-format="yy/mm/dd"-->
              <!--                    show-button-bar-->
              <!--                  />-->
              <!--                  - -->
              <!--                  <DatePicker-->
              <!--                    showTime-->
              <!--                    hourFormat="24"-->
              <!--                    style="width: 12rem"-->
              <!--                    placeholder="选择结束时间"-->
              <!--                    v-model="dateRange[1]"-->
              <!--                    :manualInput="false"-->
              <!--                    date-format="yy/mm/dd"-->
              <!--                    show-button-bar-->
              <!--                  />-->
              <!--                </span>-->
              <!--              </div>-->

              <div
                class="flex items-center gap-4 mb-2"
                style="margin-top: 20px"
                v-for="tagItem in filterTagData"
                :key="tagItem.tagId"
              >
                <label class="edit-file-label">{{ tagItem.label }}</label>
                <span v-if="tagItem.dataType === 'DATE'">
                  <DatePicker
                    showTime
                    hourFormat="24"
                    style="width: 12rem"
                    v-model="tagItem.param[0]"
                    :manualInput="false"
                    placeholder="选择起始时间"
                    date-format="yy/mm/dd"
                    show-button-bar
                  />
                  -
                  <DatePicker
                    showTime
                    hourFormat="24"
                    style="width: 12rem"
                    v-model="tagItem.param[1]"
                    :manualInput="false"
                    date-format="yy/mm/dd"
                    placeholder="选择结束时间"
                    show-button-bar
                  />
                </span>

                <span v-if="tagItem.dataType === 'STRING'">
                  <inputTagList v-model:model-value="tagItem.param"></inputTagList>
                </span>

                <span v-if="tagItem.dataType === 'NUMBER'">
                  <InputNumber
                    placeholder="最小值"
                    style="width: 10rem"
                    v-model="tagItem.param[0]"
                    showButtons
                    fluid
                  />
                  -
                  <InputNumber
                    placeholder="最大值"
                    style="width: 10rem"
                    v-model="tagItem.param[1]"
                    showButtons
                    fluid
                  />
                </span>
              </div>
            </div>
          </Fieldset>
        </div>
        <div class="search-res">
          <DataTable
            :value="searchResData"
            @row-contextmenu="onRowContext"
            @row-click="onRowClick"
            :row-class="getRowClass"
            :show-headers="true"
            scrollable
          >
            <template #header>
              <div class="flex flex-wrap items-center justify-start gap-2">
                <span class="text-2xl font-bold" style="margin-right: 10px">搜索结果</span>
                <SelectButton
                  size="small"
                  option-label="name"
                  v-model="selectOrder"
                  :options="orderOptions"
                />
              </div>
            </template>
            <Column field="name" header="文件名" style="min-width: 250px" frozen>
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
                    >{{ slotProps.data.description }}
                  </Message>
                </div>
              </template>
            </Column>

            <Column
              style="min-width: 150px; max-width: 200px"
              :header="item.label"
              v-for="item in allTags"
              :key="item.tagId"
            >
              <template #body="slotProps: { data: FileItem }">
                <div class="tag-name" v-if="slotProps.data.tags[item.tagId]">
                  <Tag
                    style="margin-right: 5px; margin-bottom: 8px"
                    severity="info"
                    :value="it"
                    v-for="(it, idx) in formatTagList(slotProps.data.tags[item.tagId].value)"
                  ></Tag>
                </div>
              </template>
            </Column>
            <Column header="" style="min-width: 100px" alignFrozen="right" frozen>
              <template #body="slotProps">
                <Button
                  @click="onClickRowAction($event, slotProps.data)"
                  label=". . ."
                  severity="secondary"
                  variant="text"
                />
              </template>
            </Column>

            <template #footer>
              <div class="pagination">
                <Paginator
                  :rows="searchPagination.ps"
                  :totalRecords="searchPagination.total"
                  :rowsPerPageOptions="searchPagination.sizeOption"
                  :first="searchPagination.ps * (searchPagination.pn - 1)"
                  @page="onSearchPageChange"
                >
                  <template #start="slotProps">
                    共有 {{ searchPagination.total }} 条搜索结果
                  </template>
                </Paginator>
              </div>
            </template>
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

    <Dialog
      v-if="editFileData"
      v-model:visible="ShowEditDialog"
      modal
      header="文件修改"
      :style="{ width: '38rem' }"
    >
      <div :style="{ 'max-height': '40rem', 'padding-right': '5rem' }">
        <div class="flex items-start gap-4 mb-4" style="margin-top: 10px" v-if="editFileData">
          <label class="edit-file-label">文件名</label>
          <InputText
            placeholder=""
            v-model="editFileData.name"
            class="flex-auto"
            autocomplete="off"
          />
        </div>

        <div
          class="flex items-start gap-4 mb-4"
          style="margin-top: 10px"
          v-if="editFileData.fileType == 'DOCUMENT'"
          v-for="(item, idx) in Object.values(editFileData.tags)"
          :key="idx"
        >
          <label class="edit-file-label">{{ item.label }}</label>
          <InputText
            v-if="item.dataType === 'STRING' && !item.isList"
            placeholder=""
            v-model="item.value"
            class="flex-auto"
            autocomplete="off"
          />

          <InputNumber
            v-if="item.dataType === 'NUMBER'"
            v-model="item.value"
            class="flex-auto"
            showButtons
          />

          <DatePicker
            showTime
            v-if="item.dataType === 'DATE'"
            hourFormat="24"
            style="width: 12rem"
            placeholder=""
            v-model="item.value"
            :manualInput="false"
            date-format="yy/mm/dd"
            show-button-bar
          />

          <span v-if="item.dataType === 'STRING' && item.isList">
            <!-- <Chip :label="v" :key="i" v-for="(v, i) in item.value || []" removable /> -->
            <inputList v-model="item.value"></inputList>
          </span>
        </div>

        <div class="flex justify-end gap-2 pb-5">
          <Button
            type="button"
            label="取消"
            severity="secondary"
            @click="ShowEditDialog = false"
          ></Button>
          <Button type="button" label="确认" @click="clickConfirmEditFile"></Button>
        </div>
      </div>
    </Dialog>

    <TagWindow v-model="showTagWindow"></TagWindow>
    <!-- 上传列表 -->
    <UploadPanel
      v-if="fileUploadList.length > 0"
      :files="fileUploadList"
      @cancel-file="cancelUpload"
      @clear-completed="clearCompleted"
      @close-panel="closePanel"
      @retry-file="handleRetryUpload"
    />
  </div>
</template>

<style scoped lang="scss">
.edit-file-label {
  text-align: right;
  width: 6rem;
  min-width: 6rem;
}

.resizer {
  margin-left: -5px;
  width: 5px;
  cursor: ew-resize;
  background-color: transparent;
  user-select: none; /* 禁止选择文本 */
  border-right: 1px solid #d2d2d2b4;
}

.home-view {
  display: flex;
  width: 100%;
  height: 100vh;
  margin-top: 0;
  display: flex;

  .left {
    width: 380px;
    height: 100%;
    overflow: auto;
    background-color: rgb(245, 245, 245);
  }
}

.right {
  // width: calc(100vw - 380px);
  flex-grow: 1;
  padding: 20px 20px;
  position: relative;
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

.dragging-box {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 99;
  border: 2px dashed rgba(19, 16, 16, 0.913);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22px;
  color: rgba(5, 118, 224, 0.5);

  background-color: #ffffff7d;

  .path {
    color: rgba(5, 118, 224, 0.75);
    font-weight: bold;
    margin-left: 23px;
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

:deep(.p-treeselect-label) {
  display: block !important;
}
</style>
