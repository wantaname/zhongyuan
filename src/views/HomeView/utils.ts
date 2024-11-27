export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp) // 使用时间戳创建 Date 对象
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从 0 开始，所以需要加 1
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  // 格式化为 "YYYY-MM-DD HH:mm:ss"
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function downloadUrl(url: string, filename = 'download') {
  // 创建一个隐藏的 <a> 元素
  const a = document.createElement('a')
  a.href = url

  // 设置下载文件名（仅对同源文件有效）
  a.download = filename

  // 将 <a> 元素临时添加到 DOM 中
  document.body.appendChild(a)

  // 触发点击事件，启动下载
  a.click()

  // 移除 <a> 元素
  document.body.removeChild(a)
}

export function selectLocalFile(params: { accept: string }): Promise<File> {
  return new Promise((resolve, reject) => {
    // 创建 input 元素，类型为 file
    const input: null | HTMLInputElement = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'
    input.accept = params.accept
    document.body.appendChild(input)

    let lock = false

    // 监听文件选择事件
    input.addEventListener(
      'change',
      (event: Event) => {
        lock = true
        const target = event.target as HTMLInputElement
        const file = target.files?.[0] || null

        if (file) {
          resolve(file)
        } else {
          reject(new Error('未选择任何文件'))
        }
        input?.remove()
      },
      {
        once: true,
      },
    )

    // 监听 input 元素的取消操作
    input.addEventListener(
      'cancel',
      () => {
        lock = true
        input.remove()
        reject(new Error('用户取消了文件选择'))
      },
      { once: true },
    )

    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!lock && input.parentNode) {
            reject(new Error('用户取消了文件选择'))
            // remove dom
            input.remove()
          }
        }, 1200)
      },
      { once: true },
    )

    // 自动触发文件选择框
    input.click()
  })
}
