FROM node:22-slim

# 设置工作目录（与 compose 中的挂载目标一致）
WORKDIR /workspace

# 先复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖（包括 devDependencies）
RUN npm install
RUN npm install --save express-session
RUN npm install --save body-parser
RUN npm install --save multer

RUN npm install -g nodemon

# 复制其余文件（实际开发时会被挂载覆盖，但保留使镜像自包含）
COPY . .

# 暴露端口
EXPOSE 3000
