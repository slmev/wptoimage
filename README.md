# wptoimage

通过 Puppeteer 的网页截图能力将本地 HTML 文件或 URL 转换为图片。

## 环境要求

- Node.js >= 18
- 安装依赖时 Puppeteer 需要下载或找到可用的 Chrome/Chromium；如果 Puppeteer 缓存缺失，本工具会尝试使用系统已安装的 Chrome/Chromium

## 安装方式

```bash
npm i wptoimage -g
```

或：

```bash
yarn global add wptoimage
```

## 使用方式

```bash
wptoimage [options] <input file|URL> <output file>
```

示例：

```bash
wptoimage demo.html demo.jpg
wptoimage ./pages/report.html report.png
wptoimage file:///Users/me/pages/report.html report.png
wptoimage https://example.com page.png
wptoimage -d 3 demo.html demo.png
wptoimage --wait-until networkidle0 --delay 500 demo.html demo.png
wptoimage --wait-fonts --wait-images demo.html demo.png
wptoimage --enhance demo.html demo.png
wptoimage --no-full-page -x 1200 -y 800 -q 90 demo.html demo.jpeg
```

## 参数说明

- `-x, --shot-w <int>`：设置视口宽度，必须是正整数，默认 `860`
- `-y, --shot-h <int>`：设置视口高度，必须是正整数，默认 `600`
- `-q, --shot-q <int>`：设置 JPEG 质量，范围 `1-100`，默认 `100`，仅对 `.jpg/.jpeg` 生效
- `-d, --device-scale-factor <number>`：设置设备像素比，默认 `2`，值越高图片越清晰但文件越大；如需旧尺寸可设为 `1`
- `--wait-until <event>`：设置页面等待事件，可选 `load`、`domcontentloaded`、`networkidle0`、`networkidle2`，默认 `load`
- `--delay <ms>`：页面加载完成后额外等待的毫秒数，默认 `0`
- `--wait-fonts`：截图前等待页面字体加载完成
- `--wait-images`：截图前等待页面图片加载或解码完成
- `--enhance`：截图后进行轻微锐化和格式编码优化，不改变图片尺寸
- `--no-full-page`：取消截取完整页面，只截取当前视口

输出文件支持：

- `.jpg`
- `.jpeg`
- `.png`

本地 HTML 文件路径会自动转换为 `file://` URL；已有的 `file://`、`http://` 和 `https://` URL 会原样使用；其他无协议输入会默认补 `http://`。

`-x` 和 `-y` 设置的是浏览器视口尺寸，实际输出像素尺寸还会乘以 `--device-scale-factor`。例如默认 `-d 2` 时，`-x 860 -y 600` 会输出约 `1720x1200` 像素；如果需要保持旧的输出尺寸，可以设置 `-d 1`。

`--enhance` 会在截图完成后使用 `sharp` 对输出图片做轻微锐化和格式编码优化，适合提升文字、边框和 UI 边缘观感。它不会进行 AI 超分，也不会改变图片宽高；如果需要更高像素尺寸，请优先调高 `--device-scale-factor`。

## 本地开发

```bash
yarn install
npm run demo
npm test
npm run test:e2e
npm run test:all
```

测试说明：

- `npm test` 使用 Node 内置测试框架，不启动真实浏览器。
- `npm run demo` 使用 `demo.html` 生成 `demo.png`，适合本地快速验证。
- `npm run test:e2e` 会启动 Puppeteer 并生成真实截图。
- 如果 E2E 环境没有可用浏览器，请先安装 Puppeteer 浏览器：

```bash
./node_modules/.bin/puppeteer browsers install chrome
```

也可以显式指定浏览器：

```bash
PUPPETEER_EXECUTABLE_PATH="/path/to/chrome" npm run test:e2e
```

## 常见问题

### 页面内容没有完全加载

如果页面依赖异步图片、字体或接口数据，可以使用更保守的等待策略：

```bash
wptoimage --wait-until networkidle0 --delay 500 --wait-fonts --wait-images demo.html demo.png
```

`networkidle0` 会等待网络连接空闲，`--delay` 会在页面加载完成后再额外等待一段时间。`--wait-fonts` 会等待字体就绪，`--wait-images` 会等待图片加载或解码完成，适合对输出清晰度和资源完整性要求更高的截图。

### Puppeteer 安装时下载 Chrome 失败

如果网络环境无法下载 Chrome，可以先跳过下载：

```bash
PUPPETEER_SKIP_DOWNLOAD=true yarn install
```

之后通过 `PUPPETEER_EXECUTABLE_PATH` 指定已有 Chrome/Chromium，或在网络可用时运行：

```bash
./node_modules/.bin/puppeteer browsers install chrome
```

如果本机已经安装 Chrome，通常可以直接运行本工具；也可以显式指定：

```bash
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" wptoimage demo.html demo.png
```

如果浏览器启动失败，错误信息会列出已尝试的 Chrome/Chromium 路径，并提示安装 Puppeteer 浏览器或设置 `PUPPETEER_EXECUTABLE_PATH`。

### Linux 环境启动浏览器失败

通常是 Chrome 依赖库或沙箱限制导致。可以参考 Puppeteer 官方 troubleshooting 文档：

https://pptr.dev/troubleshooting

本工具启动 Puppeteer 时默认带有 `--no-sandbox` 和 `--disable-setuid-sandbox`，但部分服务器仍需要额外安装系统依赖。

## 兼容性说明

从 `1.1.0` 开始，输出格式会根据文件扩展名决定：`.jpg/.jpeg` 输出 JPEG，`.png` 输出 PNG；旧版本固定按 JPEG 截图。默认 `--device-scale-factor` 也调整为 `2`，因此相同视口尺寸下输出像素会比旧版本更大。需要旧尺寸时请设置 `-d 1`。
