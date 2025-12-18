/**
 * 环境配置
 * 根据运行环境自动选择对应的配置
 */

export type Environment = 'development' | 'test' | 'production'

// 判断当前环境
const getEnvironment = (): Environment => {
  if (process.env.NODE_ENV === 'production') {
    return 'production'
  }
  if (process.env.NODE_ENV === 'test' || window.location.hostname.includes('test')) {
    return 'test'
  }
  return 'development'
}

const currentEnv = getEnvironment()

// 环境配置
const configs = {
  development: {
    apiBaseUrl: 'http://localhost:5000/api',
    imageBaseUrl: 'http://localhost:5000',
    uploadBaseUrl: 'http://localhost:5000',
    wsBaseUrl: 'ws://localhost:5000',
    timeout: 30000,
  },
  test: {
    apiBaseUrl: 'https://test-api.yourdomain.com/api',
    imageBaseUrl: 'https://test-cdn.yourdomain.com',
    uploadBaseUrl: 'https://test-api.yourdomain.com',
    wsBaseUrl: 'wss://test-api.yourdomain.com',
    timeout: 30000,
  },
  production: {
    apiBaseUrl: 'https://api.yourdomain.com/api',
    imageBaseUrl: 'https://cdn.yourdomain.com',
    uploadBaseUrl: 'https://api.yourdomain.com',
    wsBaseUrl: 'wss://api.yourdomain.com',
    timeout: 15000,
  },
}

// 获取当前环境配置
export const config = configs[currentEnv]

// 环境信息
export const env = {
  current: currentEnv,
  isDevelopment: currentEnv === 'development',
  isTest: currentEnv === 'test',
  isProduction: currentEnv === 'production',
}

// 导出常用配置项
export const BASE_URL = config.apiBaseUrl
export const IMAGE_BASE_URL = config.imageBaseUrl
export const UPLOAD_BASE_URL = config.uploadBaseUrl
export const WS_BASE_URL = config.wsBaseUrl
export const TIMEOUT = config.timeout

export default config