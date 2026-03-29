# OpenClaw Mobile Team

一个可在手机端运行的 OpenClaw 团队控制台网页原型。

## 功能

- 首页左侧 Agent 列表与状态
- 右侧随机工作场景卡片
- Agent 详情页
- 报表页（默认收起，只显示每周总消耗 token）
- 设置页（Gateway 地址与 Token）

## 启动

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build
```

## 上传 GitHub

```bash
git init
git add .
git commit -m "init project"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```


## GitHub Pages 发布

这个版本已经包含：
- 可正常构建的 TypeScript / Vite 配置
- `.github/workflows/deploy.yml` 自动部署工作流

如果你的仓库名是 `octopus8600.github.io`：
1. 把本项目文件全部上传到仓库根目录
2. 进入 `Settings -> Pages`
3. 将 `Source` 设为 `GitHub Actions`
4. 推送后等待 `Actions` 里的部署完成
