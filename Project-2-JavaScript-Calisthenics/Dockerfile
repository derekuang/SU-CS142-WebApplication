FROM node:22-alpine

# 设置工作目录
WORKDIR /workspace

# 先复制依赖清单，利用 Docker 缓存
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm install

# 复制剩余文件（开发时会被挂载覆盖，但保留使镜像自包含）
COPY . .
