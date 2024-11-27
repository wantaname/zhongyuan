import request from '@/utils/request'

export interface Tag {
  id: number
  name: string
  createTime: string
}

/** 文件/文件夹信息 */
export interface FileItem {
  fileId: string
  /** 父文件夹的fileId */
  folderId: string
  /** 文件类型 */
  fileType: 'DOCUMENT' | 'FOLDER'
  /** 文件夹为null */
  tags: Tag[] | null
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
  return request<any, FolderInfo>({
    method: 'get',
    url: 'api/v1/file/folder/detail',
    params: {
      folderId,
    },
  }).then((data: FolderInfo) => {
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
        tags: null,
      },
      files: data.files.map((item) => ({
        fileId: item.fileId,
        folderId: item.folderId,
        description: item.description,
        fileSize: item.fileSize,
        fileType: item.fileType,
        name: item.name,
        createTime: item.createTime,
        documentType: item.documentType,
        updateTime: item.updateTime,
        url: item.url || '',
        tags: item.tags,
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

/** 上传文件 */
export function putFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    method: 'put',
    url: '/api/v1/file/upload',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // 指定上传文件的内容类型
    },
  })
}

export function getAllTags(): Promise<Tag[]> {
  return request({
    method: 'get',
    url: '/api/v1/tag/search',
  })
}
