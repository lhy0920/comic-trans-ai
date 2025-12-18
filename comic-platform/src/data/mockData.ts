/**
 * 模拟数据 - 使用固定的图片 URL
 * 实际项目中这些数据来自后端 API
 */

// 使用固定 seed 的图片，避免每次刷新都变化
const getFixedImage = (id: number, width = 300, height = 400) =>
  `https://picsum.photos/seed/${id}/${width}/${height}`

// 今日更新漫画
export const todayUpdates = [
  {
    id: 1,
    title: '星空下的约定',
    cover: getFixedImage(101),
    chapter: '第25话',
  },
  {
    id: 2,
    title: '魔法少女物语',
    cover: getFixedImage(102),
    chapter: '第37话',
  },
  {
    id: 3,
    title: '都市猎人',
    cover: getFixedImage(103),
    chapter: '第121话',
  },
  {
    id: 4,
    title: '恋爱日记',
    cover: getFixedImage(104),
    chapter: '第19话',
  },
]

// 好漫推荐
export const recommendations = [
  {
    id: 5,
    title: '异世界冒险记',
    cover: getFixedImage(105),
    rating: 9.5,
    tags: ['奇幻', '冒险'],
  },
  {
    id: 6,
    title: '校园青春恋曲',
    cover: getFixedImage(106),
    rating: 9.2,
    tags: ['恋爱', '校园'],
  },
  {
    id: 7,
    title: '热血格斗王',
    cover: getFixedImage(107),
    rating: 9.0,
    tags: ['热血', '格斗'],
  },
  {
    id: 8,
    title: '治愈系日常',
    cover: getFixedImage(108),
    rating: 8.8,
    tags: ['治愈', '日常'],
  },
]

// 书架漫画
export const bookshelfComics = [
  {
    id: 1,
    title: '星空下的约定',
    cover: getFixedImage(101),
    collectTime: '2024-12-10',
    chapters: 24,
    lastRead: 12,
  },
  {
    id: 2,
    title: '魔法少女物语',
    cover: getFixedImage(102),
    collectTime: '2024-12-08',
    chapters: 36,
    lastRead: 8,
  },
  {
    id: 3,
    title: '都市猎人',
    cover: getFixedImage(103),
    collectTime: '2024-12-05',
    chapters: 120,
    lastRead: 45,
  },
  {
    id: 4,
    title: '恋爱日记',
    cover: getFixedImage(104),
    collectTime: '2024-12-01',
    chapters: 18,
    lastRead: 18,
  },
  {
    id: 5,
    title: '异世界冒险',
    cover: getFixedImage(105),
    collectTime: '2024-11-28',
    chapters: 56,
    lastRead: 30,
  },
  {
    id: 6,
    title: '校园青春',
    cover: getFixedImage(106),
    collectTime: '2024-11-25',
    chapters: 42,
    lastRead: 1,
  },
]

// 漫画详情
export const getComicDetail = (id: number) => ({
  id,
  title: '星空下的约定',
  cover: getFixedImage(100 + id),
  author: '梦幻画师',
  description:
    '在那片璀璨的星空下，两个来自不同世界的灵魂相遇了。一段跨越时空的奇幻冒险即将展开，他们将面对命运的考验，寻找属于自己的答案...',
  tags: ['奇幻', '冒险', '治愈', '恋爱'],
  chapters: Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    title: `第${i + 1}话`,
    updateTime: `2024-12-${String(15 - Math.floor(i / 3)).padStart(2, '0')}`,
    isRead: i < 12,
  })),
  stats: {
    views: '125.6万',
    likes: '82.3万',
    collects: '45.2万',
  },
})

// 漫画页面（阅读器用）
export const getComicPages = (chapterId: number) =>
  Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    url: getFixedImage(chapterId * 100 + i, 800, 1200),
  }))

// 用户历史记录
export const userHistory = [
  {
    id: 1,
    title: '星空下的约定',
    cover: getFixedImage(101),
    chapter: '第12话',
    time: '10分钟前',
  },
  {
    id: 2,
    title: '魔法少女物语',
    cover: getFixedImage(102),
    chapter: '第8话',
    time: '2小时前',
  },
  {
    id: 3,
    title: '都市猎人',
    cover: getFixedImage(103),
    chapter: '第45话',
    time: '昨天',
  },
  {
    id: 4,
    title: '恋爱日记',
    cover: getFixedImage(104),
    chapter: '第18话',
    time: '3天前',
  },
]

// 用户收藏夹
export const userFolders = [
  { id: 1, name: '最爱的漫画', count: 12 },
  { id: 2, name: '待看列表', count: 8 },
  { id: 3, name: '经典收藏', count: 25 },
]

// 用户信息
export const userProfile = {
  avatar: getFixedImage(999, 200, 200),
  nickname: '漫画爱好者',
  signature: '每天都要看漫画，快乐似神仙 ✨',
  gender: '保密',
  birthday: '2000-01-01',
  phone: '138****8888',
  email: 'user@example.com',
}
