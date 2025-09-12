// 数据服务模块 - 统一管理JSON数据加载和缓存
const DataService = {}

// 缓存数据
DataService._cache = {
  profile: null,
  settings: null,
  works: null,
  gallery: null
}

// 加载JSON文件的通用方法
DataService._loadJSON = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`加载文件失败: ${url}, 状态码: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('数据加载错误:', error)
    return null
  }
}

// 加载个人信息
DataService.loadProfile = async () => {
  if (!DataService._cache.profile) {
    DataService._cache.profile = await DataService._loadJSON('data/profile.json')
  }
  return DataService._cache.profile
}

// 加载网站设置
DataService.loadSettings = async () => {
  if (!DataService._cache.settings) {
    DataService._cache.settings = await DataService._loadJSON('data/settings.json')
  }
  return DataService._cache.settings
}

// 加载作品数据
DataService.loadWorks = async () => {
  if (!DataService._cache.works) {
    DataService._cache.works = await DataService._loadJSON('data/works.json')
  }
  return DataService._cache.works
}

// 加载画廊数据
DataService.loadGallery = async () => {
  if (!DataService._cache.gallery) {
    DataService._cache.gallery = await DataService._loadJSON('data/gallery.json')
  }
  return DataService._cache.gallery
}

// 获取个人信息
DataService.getProfile = () => {
  return DataService._cache.profile
}

// 获取网站设置
DataService.getSettings = () => {
  return DataService._cache.settings
}

// 获取作品数据
DataService.getWorks = () => {
  return DataService._cache.works
}

// 获取画廊数据
DataService.getGallery = () => {
  return DataService._cache.gallery
}

// 刷新所有数据
DataService.refreshAll = async () => {
  DataService._cache = {
    profile: null,
    settings: null,
    works: null,
    gallery: null
  }
  await Promise.all([
    DataService.loadProfile(),
    DataService.loadSettings(),
    DataService.loadWorks(),
    DataService.loadGallery()
  ])
}

// 初始化所有数据
DataService.init = async () => {
  return await DataService.refreshAll()
}

// 导出为全局变量
window.DataService = DataService