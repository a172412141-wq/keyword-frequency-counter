# 1SME 工具平台 0 成本公网部署方案

推荐方案：Cloudflare Tunnel + Cloudflare Access。

这个方案不需要买云服务器，也不需要把文件处理逻辑迁到第三方平台。Next 平台、Bulk 表分析、经营分析继续跑在你的 Mac 或一台已有机器上，Cloudflare Tunnel 负责把公网域名安全转发到本机端口，Cloudflare Access 负责按邮箱放行。

## 推荐域名结构

| 域名 | 转发到 | 用途 |
| --- | --- | --- |
| `tools.example.com` | `http://127.0.0.1:3000` | 统一工具平台 |
| `bulk.example.com` | `http://127.0.0.1:8000` | Bulk 表分析 FastAPI |
| `business.example.com` | `http://127.0.0.1:8501` | 经营分析 Streamlit |

公网部署时，把平台环境变量改成这些域名：

```bash
NEXT_PUBLIC_BULK_LOCAL_URL=https://bulk.example.com/
NEXT_PUBLIC_BUSINESS_ANALYSIS_URL=https://business.example.com/
NEXT_PUBLIC_LAUNCHER_URL=http://127.0.0.1:8787
```

启动器只建议本机使用，不建议暴露到公网。

## 管理员保护

平台现在有两层保护：

1. `/admin` 页面内置管理员登录，用于本地隐藏管理入口。
2. 如果设置了 `ADMIN_BASIC_USER` 和 `ADMIN_BASIC_PASSWORD`，Next proxy 会在服务端先拦截 `/admin`。

上线建议：

```bash
ADMIN_BASIC_USER=your-email@example.com
ADMIN_BASIC_PASSWORD=换成强密码
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
NEXT_PUBLIC_ADMIN_PASSWORD_SHA256=你的密码SHA256
```

生成 SHA256：

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update('你的密码').digest('hex'))"
```

真正做到“只给我的账号开放”，建议在 Cloudflare Access 里给 `/admin*` 配一条策略：只允许你的邮箱登录。应用内密码是辅助层，不替代 Cloudflare Access。

## 效率说明

这个方案的性能瓶颈主要在你本机或已有机器的 CPU、内存和上传带宽。它比免费 Serverless/Render 之类更适合大 Excel 文件，因为没有冷启动，文件也不用绕到免费容器里排队。

## 官方文档

- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Cloudflare Access self-hosted app: https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/
