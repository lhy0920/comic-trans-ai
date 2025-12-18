/**
 * 收藏夹存储工具
 * 使用 IndexedDB 存储收藏夹和图片文件
 */

const DB_NAME = 'ComicFolders'
const DB_VERSION = 1
const FOLDER_STORE = 'folders'
const IMAGE_STORE = 'images'

let db: IDBDatabase | null = null

// 初始化数据库
export const initFolderDB = (): Promise<void> => {
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
      
      // 收藏夹存储
      if (!database.objectStoreNames.contains(FOLDER_STORE)) {
        database.createObjectStore(FOLDER_STORE, { keyPath: 'id' })
      }
      
      // 图片存储
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        const imageStore = database.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
        imageStore.createIndex('folderId', 'folderId', { unique: false })
      }
    }
  })
}

// 存储的图片类型
export interface StoredImage {
  id: number
  folderId: number
  fileName: string
  blob: Blob
  status: string
  createdAt: number
}

// 存储的收藏夹类型
export interface StoredFolder {
  id: number
  name: string
  createdAt: number
  imageCount: number
}

// 保存收藏夹
export const saveFolder = async (folder: StoredFolder): Promise<void> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(FOLDER_STORE, 'readwrite')
    const store = transaction.objectStore(FOLDER_STORE)
    const request = store.put(folder)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 获取所有收藏夹
export const getAllFolders = async (): Promise<StoredFolder[]> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(FOLDER_STORE, 'readonly')
    const store = transaction.objectStore(FOLDER_STORE)
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// 删除收藏夹
export const deleteFolder = async (folderId: number): Promise<void> => {
  await initFolderDB()
  
  // 删除收藏夹
  await new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction(FOLDER_STORE, 'readwrite')
    const store = transaction.objectStore(FOLDER_STORE)
    const request = store.delete(folderId)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  
  // 删除收藏夹内的图片
  const images = await getImagesByFolder(folderId)
  for (const img of images) {
    await deleteImage(img.id)
  }
}

// 保存图片
export const saveImage = async (image: StoredImage): Promise<void> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(IMAGE_STORE, 'readwrite')
    const store = transaction.objectStore(IMAGE_STORE)
    const request = store.put(image)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 获取收藏夹内的图片
export const getImagesByFolder = async (folderId: number): Promise<StoredImage[]> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(IMAGE_STORE, 'readonly')
    const store = transaction.objectStore(IMAGE_STORE)
    const index = store.index('folderId')
    const request = index.getAll(folderId)
    
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// 获取单张图片
export const getImage = async (imageId: number): Promise<StoredImage | null> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(IMAGE_STORE, 'readonly')
    const store = transaction.objectStore(IMAGE_STORE)
    const request = store.get(imageId)
    
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// 删除图片
export const deleteImage = async (imageId: number): Promise<void> => {
  await initFolderDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(IMAGE_STORE, 'readwrite')
    const store = transaction.objectStore(IMAGE_STORE)
    const request = store.delete(imageId)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 更新收藏夹图片数量
export const updateFolderImageCount = async (folderId: number): Promise<void> => {
  const images = await getImagesByFolder(folderId)
  const folders = await getAllFolders()
  const folder = folders.find(f => f.id === folderId)
  
  if (folder) {
    folder.imageCount = images.length
    await saveFolder(folder)
  }
}
