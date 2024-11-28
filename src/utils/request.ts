import axios from 'axios'

// 创建 axios 实例
const service = axios.create({
  // baseURL: 'http://124.220.149.108:8080/', // 基础路径
  timeout: 5000, // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    // 请求错误
    console.error('Request error:', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 只返回数据部分
    const res = response.data
    if (res.code !== 200) {
      return Promise.reject(new Error(res.msg || 'Error'))
    }
    return res.data
  },
  (error) => {
    // 响应错误处理
    console.error('Response error:', error)
    return Promise.reject(error)
  },
)

export default service
