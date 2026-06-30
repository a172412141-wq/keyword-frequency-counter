# 本地高效率部署

推荐本地部署方式：Next 平台 + 本地启动器 + FastAPI Bulk 服务。

这种方式适合处理较大的 Amazon Ads Bulk Excel：文件不离开本机，解析结果会在 FastAPI 进程内缓存，生成诊断表时不重复读取同一个大文件。

## 一键启动

macOS 上双击项目根目录：

```bash
./启动1SME工具平台.command
```

它会启动：

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| 1SME 平台 | `http://127.0.0.1:3000` | Next 工具平台 |
| 本地启动器 | `http://127.0.0.1:8787` | 管理 Bulk / 经营分析服务 |

打开平台后进入 `/admin`，点击“启动”或“一键启动全部”，再回到 Bulk 表分析页面使用。

## 手动启动

```bash
pnpm dev --hostname 127.0.0.1 --port 3000
```

```bash
python3 platform_launcher.py --host 127.0.0.1 --port 8787
```

```bash
cd bulk-ad-diagnostic-generator
./.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000
```

## 为什么这样效率更高

- Bulk 服务本地运行，上传和下载都走本机回环网络，不受免费云服务冷启动和公网带宽影响。
- `/api/analyze` 会对上传文件计算 SHA256，并缓存解析后的 Bulk 对象。
- `/api/generate` 优先使用 `cache_key` 复用解析结果，避免同一个大 Excel 被重复读取。
- Bulk 服务保持单进程更适合单人桌面使用，能保留内存缓存，也避免多 worker 复制大文件内存。
- 文件处理只绑定 `127.0.0.1`，默认不暴露到局域网或公网。

## 公网访问

如果必须公网访问，用 Cloudflare Tunnel 暴露 `3000`、`8000`、`8501` 这些业务端口。不要暴露本地启动器 `8787`。

完整方案见 [zero-cost-deploy.md](zero-cost-deploy.md)。
