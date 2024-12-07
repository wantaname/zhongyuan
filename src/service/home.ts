import request from '@/utils/request'

/** 文件/文件夹信息 */
export interface FileItem {
  fileId: string
  /** 父文件夹的fileId */
  folderId: string
  /** 文件类型 */
  fileType: 'DOCUMENT' | 'FOLDER'
  /** 文件夹为null */
  tags: Record<string, TagValueItem>
  /** 文件名 */
  name: string
  /** 文件大小(B)|文件夹子文件个数 */
  fileSize: number
  documentType: 'WORD' | 'PDF' | 'EXCEL' | 'PPT' | 'TXT' | null
  /** 描述 */
  description: string
  /** 创建时间戳 */
  createTime: number
  /** 更新时间戳 */
  updateTime: number
  /** 文档的链接 */
  url: string
}

/** test */
const getTestTags = (count: number) => {
  let i = 0
  return Array(count).fill({
    id: i++,
    name: '标签' + i,
    createTime: Date.now(),
  })
}

interface FolderInfo {
  /** 每个文件夹或者文件的唯一id */
  fileId: string
  /** 文件项的父目录的id */
  folderId: string
  /** 文件的描述 */
  description: string
  /** 文件名称 */
  name: string
  /** 2024-11-26T11:20:11.568Z */
  createTime: number
  updateTime: number
  /** 子文件，只返回一层 */
  files: FileItem[]
}

/** 获取文件夹信息 */
export function getFolder(folderId?: string): Promise<{ folder: FileItem; files: FileItem[] }> {
  return request<any, any>({
    method: 'get',
    url: 'api/v1/file/folder/detail',
    params: {
      folderId,
    },
  }).then((data: any) => {
    return {
      folder: {
        fileId: data.fileId,
        folderId: data.folderId,
        description: data.description || '',
        fileSize: data.files.length,
        fileType: 'FOLDER',
        name: data.name,
        createTime: data.createTime,
        documentType: null,
        updateTime: data.updateTime,
        url: '',
        tags: {},
      },
      files: data.files.map((item: any) => ({
        fileId: item.fileId,
        folderId: item.folderId,
        description: item.description || '',
        fileSize: item.fileSize,
        fileType: item.fileType,
        name: item.name,
        createTime: item.createTime,
        documentType: item.documentType,
        updateTime: item.updateTime,
        url: item.url || '',
        tags: item.tags || {},
      })),
    }
  })
}

/** 下载文件 */
export function downloadFile(fileId: string) {
  return request({
    method: 'get',
    url: '/api/v1/file/download',
    params: {
      fileId,
    },
  })
}

interface ICreateFolderParams {
  folderId: string
  name: string
  description?: string
}

/** 创建文件夹 */
export function createFolder(params: ICreateFolderParams) {
  return request({
    method: 'post',
    url: '/api/v1/file/create',
    data: {
      ...params,
      fileType: 'FOLDER',
    },
  })
}

export interface IPutFileRes {
  url: string
  name: string
  documentType: string
  size: number
}

/** 上传文件 */
export function putFile(file: File, folderId: string): Promise<IPutFileRes> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folderId', folderId)
  return request({
    method: 'put',
    url: '/api/v1/file/upload',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // 指定上传文件的内容类型
    },
  })
}

export function searchTags(name: string): Promise<TagValueItem[]> {
  return request({
    method: 'get',
    url: '/api/v1/tag/search',
    params: { name },
  })
}

interface IPostSaveFileParams {
  fileId?: string
  folderId: string
  name: string
  description?: string
  fileSize: number
  url: string
  documentType: string
  createTime?: number
  updateTime?: number
}

/** 保存文件 */
export function postSaveFile(params: IPostSaveFileParams) {
  return request({
    method: 'post',
    url: '/api/v1/file/create',
    data: {
      ...params,
      fileType: 'DOCUMENT',
    },
  })
}

export interface TagValueItem {
  label: string
  dataType: 'STRING' | 'NUMBER' | 'DATE'
  isList: boolean
  tagId: string
  isCanSearch: boolean
  index: number
  isActive: boolean
  value: string
}

export interface TagItem {
  label: string
  dataType: 'STRING' | 'NUMBER' | 'DATE'
  isList: boolean
  tagId: string
  isCanSearch: boolean
  index: number
  isActive: boolean
}

/** 创建标签 */
/** 创建文件夹 */
export function postAddTag(params: TagValueItem) {
  return request({
    method: 'post',
    url: '/api/v1/tag/add',
    data: params,
  })
}

export function getAllTag(): Promise<TagItem[]> {
  return request({
    method: 'get',
    url: '/api/v1/tag/config/all',
  })
}

export interface ISearchFileParams {
  folderId: string
  startTime: number | null
  endTime: number | null
  keyword: string
  sortBy: string
  // todo
  tagFilters: { tagId: string }
  documentType?: string[]
}

export interface ISearchResItem {
  content: string
  createTime: number
  description: string
  documentType: string
  fileId: string
  fileSize: number
  fileType: null
  folderId: string
  name: string
  tags: Record<string, TagValueItem>
  updateTime: number
  url: string
}

/** 搜索文件 */
export function searchFile(params: ISearchFileParams): Promise<ISearchResItem[]> {
  return request<any, { items: ISearchResItem[] }>({
    method: 'post',
    url: '/api/v1/file/search',
    data: {
      ...params,
    },
  }).then((res) => {
    res.items = res.items || []
    res.items.forEach((item) => {
      item.content = item.content || ''
      item.tags = item.tags || []
      item.url = item.url || ''
      item.description = item.description || ''
    })
    return res.items
  })
}

/** 删除文件 */
export function deleteFile(params: { fileId: string }): Promise<any> {
  return request({
    method: 'get',
    url: '/api/v1/file/delete',
    params: {
      ...params,
    },
  })
}

/** 重命名文件 */
export function renameFile(params: { fileId: string; name: string }): Promise<any> {
  return request({
    method: 'post',
    url: '/api/v1/file/update',
    params: {
      ...params,
    },
  })
}

/** 更新文件信息 */
export function updateFile(params: {
  fileId: string
  name: string
  tags: Record<string, TagValueItem>
}): Promise<any> {
  return request({
    method: 'post',
    url: '/api/v1/file/update',
    data: {
      ...params,
    },
  })
}
