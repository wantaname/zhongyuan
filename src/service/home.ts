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
  folderPath: string[]
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

export interface FolderInfo {
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
export function getFolder(
  folderId: string | undefined,
  pn: number,
  ps: number,
): Promise<{
  folder: FileItem
  files: FileItem[]
  page: { pn: number; ps: number; total: number }
}> {
  return request<any, any>({
    method: 'get',
    url: 'api/v1/file/folder/detail',
    params: {
      folderId,
      pn,
      ps,
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
        folderPath: data.folderPath || [],
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
        folderPath: item.folderPath || [],
      })),
      page: {
        pn: data.pn,
        ps: data.ps,
        total: data.total,
      },
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

export function checkExist(name: string, folderId: string): Promise<boolean> {
  return request({
    method: 'get',
    url: '/api/v1/file/check/exist?folderId=' + folderId + "&fileName=" + name,
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
  value: string | number | string[] | any
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

export interface Folder {
  folderId: string
  name: string
  subFiles: Folder[]
}

export function getAllFolder(): Promise<Folder> {
  return request({
    method: 'get',
    url: '/api/v1/file/getAllFolder',
  })
}

type AddTagItemParams = Omit<TagItem, 'tagId'>

export function postAddTag(params: AddTagItemParams) {
  return request({
    method: 'post',
    url: '/api/v1/tag/config/saveOrUpdate',
    data: params,
  })
}

export function postEditTag(params: TagItem) {
  return request({
    method: 'post',
    url: '/api/v1/tag/config/saveOrUpdate',
    data: params,
  })
}

export function postDelTag(tagId: string) {
  return request({
    method: 'post',
    url: '/api/v1/tag/config/delete',
    data: {
      tagId,
    },
  })
}

export function getAllTag(): Promise<TagItem[]> {
  return request({
    method: 'get',
    url: '/api/v1/tag/config/all',
  })
}

export interface ISearchFileParams {
  folderIds: string[] | null
  startTime: number | null
  endTime: number | null
  keyword: string
  sortBy: string
  searchContent: boolean
  searchName: boolean
  // todo
  tagFilters: { tagId: string; param: any; condition: 'AND' | 'OR' }[]
  documentType?: string[]
  pageNo: number
  pageSize: number
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

interface ISearchRes {
  items: ISearchResItem[]
  pageSize: number
  pageNo: number
  total: number
}

/** 搜索文件 */
export function searchFile(params: ISearchFileParams): Promise<ISearchRes> {
  return request<any, ISearchRes>({
    method: 'post',
    url: '/api/v1/file/search',
    data: {
      ...params,
    },
  }).then((res) => {
    res.items = res.items || []
    res.items.forEach((item) => {
      item.content = item.content || ''
      item.tags = item.tags || {}

      item.url = item.url || ''
      item.description = item.description || ''
    })
    return res
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
