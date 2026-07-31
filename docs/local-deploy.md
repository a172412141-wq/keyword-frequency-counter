# 本地高效率部署

推荐本地部署方式：本地启动器统一托管 Next 平台、Listing FastAPI 服务和经营分析 Streamlit 服务。

## 一键启动

macOS 上双击项目根目录：

```bash
./启动1SME工具平台.command
```

它会启动：

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| 1SME 平台 | `http://127.0.0.1:3000` | Next 生产模式工具平台 |
| 本地启动器 | `http://127.0.0.1:8787` | 管理平台前端、Listing 优化和经营分析服务 |
| Listing 优化 | `http://127.0.0.1:8010` | 标题、五点和 A+ 合规优化 API |
| 经营分析 | `http://127.0.0.1:8501` | 库存利润经营分析工具 |

打开平台后进入 `/admin`，可以查看所有本地服务状态；遇到页面或接口卡住时，优先点对应服务的“重启”。

## 手动启动

```bash
pnpm dev:local
```

```bash
python3 platform_launcher.py --host 127.0.0.1 --port 8787
```

```bash
curl -X POST http://127.0.0.1:8787/api/services/platform-web/start
```

## 为什么这样效率更高

- 平台前端由启动器用生产模式托管，不依赖 Next dev server 热更新状态，减少占端口但不响应的问题。
- Listing 和经营分析服务本地运行，上传和下载都走本机回环网络，不受免费云服务冷启动和公网带宽影响。
- 文件处理只绑定 `127.0.0.1`，默认不暴露到局域网或公网。

## 公网访问

如果必须公网访问，用 Cloudflare Tunnel 暴露 `3000`、`8010`、`8501` 这些业务端口。不要暴露本地启动器 `8787`。

完整方案见 [zero-cost-deploy.md](zero-cost-deploy.md)。
