#Comic-Translate-AI
一个基于ai的漫画翻译系统，用户可上传漫画并翻译为多种语言
## 🚀 快速开始

### 前置要求
- Node.js 16+
- npm 或 yarn
- ### 安装步骤
1. 克隆项目
```bash
git clone https://github.com/lhy0920/comic-trans-ai.git
cd comic-trans-ai
2.安装后端依赖
bash
cd comic-backend
npm install
3.安装前端依赖

bash
cd ../comic-platform
npm install

4.配置环境变量

bash
# 在后端创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，填入你的配置(数据库使用mongodb)

5.# 后端（端口 3000）
cd comic-backend
npm run dev

# 前端（端口 5173）
cd ../comic-platform
npm run dev

访问 http://localhost:5173 开始使用！
