FROM node:22-alpine

# 设置工作目录（与 compose 中的挂载目标一致）
WORKDIR /workspace

# 先复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖（包括 devDependencies）
RUN npm install

# 复制其余文件（实际开发时会被挂载覆盖，但保留使镜像自包含）
COPY . .

# 暴露端口
EXPOSE 3000

# 默认命令（可被 compose 覆盖）
CMD ["sh", "-c", "nohup node webServer.js & tail -f /dev/null"]
