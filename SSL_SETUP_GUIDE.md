# SSL证书配置指南

## 概述

程序现在支持自动检测SSL证书并启用HTTPS。如果在 `ssh/` 目录中找到有效的SSL证书文件，程序将自动使用HTTPS模式启动。

## SSL证书目录结构

在项目根目录创建 `ssh/` 文件夹，并将SSL证书文件放入其中：

```
项目根目录/
├── backend/
├── frontend/
├── ssh/                    # SSL证书目录
│   ├── cert.pem           # 证书文件
│   ├── key.pem            # 私钥文件
│   └── fullchain.pem      # 完整证书链（可选）
└── ...
```

## 支持的证书文件名

### 证书文件（以下任一）：
- `cert.pem`
- `certificate.pem`
- `server.crt`
- `ssl.crt`
- `fullchain.pem`
- `wisdomlink.asia.pem`（域名证书）
- 任何以 `.crt`、`.pem`、`.cert` 结尾的文件（不包含"key"或"private"）

### 私钥文件（以下任一）：
- `key.pem`
- `private.key`
- `server.key`
- `ssl.key`
- `privkey.pem`
- `wisdomlink.asia_key.key`（域名私钥）
- 任何以 `.key` 结尾或包含"key"、"private"的文件

## 启动行为

### 检测到SSL证书时：
1. 程序会尝试在443端口启动HTTPS服务
2. 如果443端口被占用或权限不足，会尝试8443端口
3. 如果HTTPS启动失败，会回退到HTTP模式（7000端口）

### 未检测到SSL证书时：
- 程序使用HTTP模式在7000端口启动

## 获取SSL证书

### 1. Let's Encrypt（免费）
```bash
# 安装certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d yourdomain.com

# 证书通常位于：
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 2. 自签名证书（测试用）
```bash
# 创建ssh目录
mkdir ssh

# 生成私钥
openssl genrsa -out ssh/key.pem 2048

# 生成证书
openssl req -new -x509 -key ssh/key.pem -out ssh/cert.pem -days 365
```

### 3. 商业证书
从证书颁发机构购买的证书，通常包含：
- 证书文件（.crt 或 .pem）
- 私钥文件（.key 或 .pem）
- 中间证书（可选）

## 文件权限

确保证书文件有正确的权限：
```bash
chmod 600 ssh/key.pem      # 私钥文件，仅所有者可读
chmod 644 ssh/cert.pem     # 证书文件，所有者可读写，其他人可读
```

## 日志信息

程序启动时会输出相关日志：
- `找到证书文件: ssh/cert.pem`
- `找到私钥文件: ssh/key.pem`
- `检测到SSL证书，启用HTTPS模式`
- `未检测到SSL证书，使用HTTP模式`

## 故障排除

### 1. 证书文件未被识别
- 检查文件名是否符合支持的模式
- 确保文件确实存在于 `ssh/` 目录中
- 检查文件权限

### 2. HTTPS启动失败
- 检查443端口是否被其他服务占用
- 确保有足够权限绑定443端口（可能需要sudo）
- 检查证书文件格式是否正确

### 3. 权限错误
```bash
# 在Linux上，绑定443端口可能需要root权限
sudo python backend/app.py

# 或者使用非特权端口（如8443）
```

## 安全建议

1. **保护私钥文件**：确保私钥文件权限设置为600
2. **定期更新证书**：SSL证书有有效期，需要定期更新
3. **使用强密码**：如果私钥有密码保护，使用强密码
4. **备份证书**：定期备份证书文件
5. **监控过期时间**：设置证书过期提醒

## 示例配置

### Let's Encrypt证书
```bash
# 复制Let's Encrypt证书到项目目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssh/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssh/key.pem
sudo chown $USER:$USER ssh/*.pem
chmod 600 ssh/key.pem
chmod 644 ssh/cert.pem
```

### 自签名证书（开发环境）
```bash
mkdir -p ssh
openssl req -x509 -newkey rsa:4096 -keyout ssh/key.pem -out ssh/cert.pem -days 365 -nodes -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

### 域名证书示例（如wisdomlink.asia）
```bash
# 如果您有域名证书文件，直接复制到ssh目录
cp wisdomlink.asia.pem ssh/
cp wisdomlink.asia_key.key ssh/

# 或者重命名为标准格式（可选）
cp wisdomlink.asia.pem ssh/cert.pem
cp wisdomlink.asia_key.key ssh/key.pem
```

## 支持的文件名格式

程序现在支持以下文件名格式：

### 证书文件识别规则：
- 以 `.pem`、`.crt`、`.cert` 结尾
- 包含 "cert"、"certificate"、"fullchain" 关键词
- 不包含 "key" 或 "private" 关键词
- 示例：`wisdomlink.asia.pem`、`domain.crt`、`fullchain.pem`

### 私钥文件识别规则：
- 以 `.key` 结尾
- 包含 "_key."、"private"、"privkey" 关键词
- 示例：`wisdomlink.asia_key.key`、`private.key`、`domain.key`

配置完成后，重新启动程序即可自动启用HTTPS模式。