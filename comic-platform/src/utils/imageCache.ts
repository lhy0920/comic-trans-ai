/**
 * 图片缓存工具
 * 使用 IndexedDB 存储图片，支持离线访问
 */

const DB_NAME = 'ComicImageCache'
const DB_VERSION = 1
const STORE_NAME = 'images'

let db: IDBDatabase | null = null

// 初始化数据库
export const initImageCache = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve()
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      db = request.result
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'url' })
      }
    }
  })
}

// 缓存图片
export const cacheImage = async (url: string): Promise<string> => {
  await initImageCache()

  // 先检查缓存
  const cached = await getCachedImage(url)
  if (cached) return cached

  try {
    // 下载图片
    const response = await fetch(url)
    const blob = await response.blob()

    // 转为 base64
    const base64 = await blobToBase64(blob)

    // 存入 IndexedDB
    await saveToCache(url, base64)

    return base64
  } catch (error) {
    console.error('缓存图片失败:', error)
    return url // 失败时返回原 URL
  }
}

// 获取缓存的图片
export const getCachedImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null)
      return
    }

    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(url)

    request.onsuccess = () => {
      resolve(request.result?.data || null)
    }

    request.onerror = () => resolve(null)
  })
}

// 保存到缓存
const saveToCache = (url: string, data: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'))
      return
    }

    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put({
      url,
      data,
      timestamp: Date.now(),
    })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Blob 转 Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 清除过期缓存（超过7天）
export const clearExpiredCache = async (): Promise<void> => {
  await initImageCache()
  if (!db) return

  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const request = store.openCursor()
  const expireTime = 7 * 24 * 60 * 60 * 1000 // 7天

  request.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest).result
    if (cursor) {
      if (Date.now() - cursor.value.timestamp > expireTime) {
        cursor.delete()
      }
      cursor.continue()
    }
  }
}

// 获取缓存大小
export const getCacheSize = async (): Promise<string> => {
  await initImageCache()
  if (!db) return '0 KB'

  return new Promise((resolve) => {
    const transaction = db!.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.openCursor()
    let totalSize = 0

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        totalSize += cursor.value.data?.length || 0
        cursor.continue()
      } else {
        // 转换为可读格式
        if (totalSize < 1024) {
          resolve(`${totalSize} B`)
        } else if (totalSize < 1024 * 1024) {
          resolve(`${(totalSize / 1024).toFixed(1)} KB`)
        } else {
          resolve(`${(totalSize / 1024 / 1024).toFixed(1)} MB`)
        }
      }
    }
  })
}

// 清除所有缓存
export const clearAllCache = async (): Promise<void> => {
  await initImageCache()
  if (!db) return

  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  store.clear()
}
