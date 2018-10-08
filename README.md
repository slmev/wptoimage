# wptoimage
通过puppeteer的网页截图功能实现把网页转换为图片


### 开发涉及到的工具：
*   [nodejs](https://github.com/nodejs/node)
*   [commander.js](https://github.com/tj/commander.js)
*   [puppeteer](https://github.com/GoogleChrome/puppeteer)

### 功能实现：
通过`puppeteer`的网页截屏功能实现网页转换为图片。

### 实现方式：
```
wptoimage <本地文件名/URL> <图片名称>
```

### 安装方式：
由于是nodejs开发的命令行工具，所以首先需要安装nodejs。  
其次：
```
npm i wptoimage -g
or
yarn global add wptoimage
```

### 安装过程中可能会出现的错误：
1、由于依赖的`puppeteer`需要下载`Chromium`，下载过程中不知道是<font color="red">权限问题</font>还是<font color="red">网络问题</font>导致发生错误。在`windows`下使用管理员权限能够正常的下载，但是在`linux`下切换到root依然无法下载。  
建议使用
```
cnpm i wptoimage -g
```
2、在linux下还可能会出现其他的问题[https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md)  
主要是因为沙箱和Chromium依赖包未安装的原因。

### 安装成功后出现的问题：
1、~~`linux`本地文件的绝对路径需要在路径前面手动添加`file://`，puppeteer不然无法识别，会报错为无效的URL。~~ 代码已添加系统判断并添加`file://`。  

2、~~LF与CRLF的问题，由于上传到到npm的文件问CRLF导致在linux中会出现问题，#!/usr/bin/env node无法识别node路径，报<font color="red">no such file or directory</font>。~~ 修改为LF后能够正常使用。