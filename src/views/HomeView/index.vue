<script setup lang="ts">
import IconVue from '@/components/icons/IconVue.vue'
import type {
  ContextMenu,
  DataTableRowClickEvent,
  DataTableRowContextMenuEvent,
  TieredMenu,
} from 'primevue'
import Tree from 'primevue/tree'
import { computed, nextTick, onMounted, ref, watch, watchEffect } from 'vue'
import {
  createFolder,
  downloadFile,
  getAllTags,
  getFolder,
  putFile,
  type FileItem,
  type Tag,
} from '@/service.ts/home'
import type { TreeNode } from 'primevue/treenode'
import type { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem'
import createFolderBtn from './components/create-folder-btn.vue'
import { downloadUrl, formatTimestamp, selectLocalFile } from './utils'
import { Icon } from '@iconify/vue'

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
  console.log('折叠', node)
  currExpandFolderIds.value = currExpandFolderIds.value.filter((it) => it !== node.key)
}

const onSelectedKeyChange = () => {
  // selectedKey.value = d
}

/** 默认展开一级 */
const folderNodes = ref<TreeNode[]>([])

const home = ref({
  icon: 'pi pi-home',
})

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

/** Tree组件内部会先设置expendKeys的值，再emit */
const onNodeExpand = async (node: TreeNode) => {
  if (node.children) {
    makeExpandFolder(node.key)
    return
  }
  node.loading = true
  const res = await getFolder(node.key)
  node.children = res.files.map((it) => {
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
const newMenu = ref<InstanceType<typeof TieredMenu> | null>(null)

const clickUpload = (e: MouseEvent) => {
  uploadMenu.value?.toggle(e)
}

const startUploadFile = async () => {
  const file = await selectLocalFile({ accept: '*' })
  await putFile(file)
}

const uploadItems = [
  {
    label: '上传文件',
    command: () => {
      startUploadFile()
    },
  },
]

const tableData = ref<FileItem[]>([])

watch(
  currFolderId,
  async (v) => {
    if (!v) tableData.value = []
    else {
      const res = await getFolder(currFolderId.value)
      tableData.value = res.files
    }
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
  makeSelectFolder(targetFileId)
  let fid = targetFileId
  while (true) {
    /** 依次展开 */
    const node = getNodeByKey(fid)
    console.log('ddd', node)
    if (!node) break
    const fileItem = node.data as FileItem
    if (!fileItem.folderId) break
    makeExpandFolder(fileItem.folderId)
    fid = fileItem.folderId
  }
}

const handleContextClick = (ev: MenuItemCommandEvent) => {
  if (ev.item.label === '打开') {
    openFolder(contextSelectRow.value!.fileId)
  } else if (ev.item.label === '下载') {
    downloadUrl(contextSelectRow.value!.url, contextSelectRow.value!.name)
  }
}

// const contextItems = ref<MenuItem[]>([
//   { label: '下载', icon: 'pi pi-copy', command: handleContextClick },
//   { label: 'Rename', icon: 'pi pi-file-edit' },
// ])

const contextItems = computed<MenuItem[]>(() => {
  if (contextSelectRow.value?.fileType === 'DOCUMENT') {
    return [
      {
        label: '下载',
        icon: 'pi pi-cloud-download',
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
})

const tableCMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const clickTableAction = (ev: MouseEvent) => {
  tableCMenu.value?.toggle(ev)
}

const searchValue = ref('')

const onCreateFolder = async () => {
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
}

const isSearchMode = computed(() => {
  return !!searchValue.value
})

/** 选择的标签 */
const selectedTags = ref([])

const tagOptions = ref<Tag[]>([])

onMounted(async () => {
  tagOptions.value = await getAllTags()
  /** test */
  tagOptions.value = [
    {
      id: 1,
      name: 'tag1',
      createTime: '333',
    },
    {
      id: 2,
      name: 'tag2',
      createTime: '333',
    },
    {
      id: 3,
      name: 'tag3',
      createTime: '333',
    },
  ]
})
</script>

<template>
  <div class="home-view">
    <div class="left">
      <div class="title">
        <IconVue />
        <span style="margin-left: 10px">primeVue</span>
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
      <div class="header">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            style="width: 70%"
            v-model="searchValue"
            placeholder="在此文件夹下搜索，输入关键字，按回车"
          />
        </IconField>
      </div>
      <div class="list-mode" v-show="!isSearchMode">
        <div class="nav">
          <Breadcrumb :model="breadCrumItems" />
        </div>
        <div class="action">
          <div class="upload">
            <Button
              icon="pi pi-angle-down"
              label="上传"
              severity="secondary"
              @click="clickUpload"
              iconPos="right"
              raised
              aria-controls="overlay_upload_menu"
            />
            <TieredMenu ref="uploadMenu" id="overlay_upload_menu" :model="uploadItems" popup />
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
            <Column field="updateTime" header="修改时间">
              <template #body="slotProps">
                {{ formatTimestamp(slotProps.data.updateTime) }}
              </template></Column
            >
          </DataTable>
          <ContextMenu ref="tableCMenu" :model="contextItems" />
        </div>
      </div>

      <div class="search-mode" v-show="isSearchMode">
        <div class="filter-options" style="margin-top: 20px; padding-left: 30px">
          <div class="flex items-center gap-4 mb-4">
            <label class="font-semibold">选择标签</label>
            <MultiSelect
              v-model="selectedTags"
              :options="tagOptions"
              optionLabel="name"
              filter
              placeholder="选择标签"
              :maxSelectedLabels="3"
              class="w-full md:w-80"
            />
          </div>
        </div>
      </div>
    </div>
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
