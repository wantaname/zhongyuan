## 项目启动

```sh
pnpm i
pnpm run dev
```

## 部署文档

1、安装nginx

```sh
sudo yum update -y
sudo yum install nginx -y
```

启动nginx，设置为开机自启

```sh
sudo systemctl start nginx
sudo systemctl enable nginx
```

2、编辑nginx配置文件

```sh
sudo nano /etc/nginx/nginx.conf
```

写入下面的配置：

```nginx
user root;
worker_processes auto;
pid /var/run/nginx.pid;
error_log  /var/log/nginx/error.log  warn;
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
      listen 80;
      #  配置机器的ip地址
      server_name 124.220.149.108;

      # 前端静态文件路径
      location / {
          root /root/web/dist;  # 替换为你的前端静态文件所在路径
          index index.html
          try_files $uri $uri/ /index.html;
      }

      # 反向代理请求到后端服务（Java 后端服务）
      location /api/ {
          proxy_pass http://localhost:8080/api/;  # 假设后端服务监听在 8080 端口
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
    }
}
```

编辑完后可以检查nginx的配置是否有效：

```sh
sudo nginx -t
```

然后重新启动nginx加载配置：

```sh
sudo systemctl reload nginx
```

3、上传前端文件夹

执行`npm run build`构建项目，得到dist文件夹。

上传到linux机器上：

```sh
scp -r ./dist username@ip:/root/web/dist;
```
