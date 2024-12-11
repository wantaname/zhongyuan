import type { FolderInfo, TagItem } from '@/service/home'
import Mock, { type MockjsRequestOptions } from 'mockjs'

const Random = Mock.Random

const getFolderDetail = (option: MockjsRequestOptions): FolderInfo => {
  const fileCount = 15
  const files: FolderInfo['files'] = []
  for (let i = 0; i < fileCount; i++) {
    files.push({
      fileId: Random.word(5, 10),
      folderId: Random.word(5, 10),
      fileType: Random.pick(['DOCUMENT', 'FOLDER']),
      tags: {},
      name: Random.ctitle(2, 10),
      fileSize: Random.integer(0, 10000),
      documentType: Random.pick(['WORD', 'PDF', 'EXCEL', 'PPT', 'TXT']),
      description: Random.csentence(10, 200),
      createTime: Date.now() - Random.integer(100, 1000000),
      updateTime: Date.now() - Random.integer(100, 1000000),
      url: Random.image(),
    })
  }
  return {
    fileId: Random.word(5, 10),
    folderId: Random.word(5, 10),
    description: Random.csentence(10, 100),
    name: Random.ctitle(2, 10),
    createTime: Date.now() - Random.integer(100, 1000000),
    updateTime: Date.now() - Random.integer(100, 1000000),
    files: files,
  }
}

const getAllTags = (option: MockjsRequestOptions): TagItem[] => {
  return [
    {
      tagId: '1',
      label: '国家',
      isList: false,
      isCanSearch: true,
      isActive: true,
      index: 1,
      dataType: 'STRING',
    },
    {
      tagId: '2',
      label: '大小',
      isList: false,
      isCanSearch: true,
      isActive: true,
      index: 2,
      dataType: 'NUMBER',
    },
    {
      tagId: '3',
      label: '日期',
      isList: false,
      isCanSearch: true,
      isActive: true,
      index: 3,
      dataType: 'DATE',
    },
    {
      tagId: '4',
      label: '行业',
      isList: true,
      isCanSearch: true,
      isActive: true,
      index: 1,
      dataType: 'STRING',
    },
  ]
}

const wrapResponse = (data: any) => {
  return {
    code: 200,
    msg: '',
    data,
  }
}

Mock.mock(/api\/v1\/file\/folder\/detail.*/, 'get', wrapResponse(getFolderDetail))
Mock.mock('/api/v1/tag/config/all', 'get', wrapResponse(getAllTags))
