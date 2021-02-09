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

### 参数说明

|      参数名      |  参数全名  | 类型  |                           参数说明                           |
| :--------------: | :--------: | :---: | :----------------------------------------------------------: |
|       `-x`       | `--shot-w` | <int> | 设置图片宽度，<br>full-page为true时，若x大于页面内容实际宽度，x为图片宽度，<br>若x小于页面内容实际宽度，页面最小宽度为图片宽度， <br/><font color="red">不存在页面最小宽度时请设置x的值；</font><br/>full-page为false时，x为图片宽度 |
|       `-y`       | `--shot-h` | <int> | 设置图片高度，<br/>full-page为true时，若y大于页面内容实际高度，y为图片高度，<br/>若y小于页面内容实际高度，页面最小高度为图片高度；<br/>full-page为false时，y为图片高度 |
|       `-q`       | `--shot-q` | <int> |           设置图片质量，只有jpg类型生效，1-100之间           |
| `--no-full-page` |     -      |   -   |           取消截取完整页面, 默认宽为860， 高为600            |



### 安装方式：
由于是nodejs开发的命令行工具，所以首先需要安装nodejs。  
其次：
```
npm i wptoimage -g
or
yarn global add wptoimage
```

### 安装过程中可能会出现的问题：
1、由于依赖的`puppeteer`需要下载`Chromium`，下载过程中不知道是<font color="red">权限问题</font>还是<font color="red">网络问题</font>导致发生错误。在`windows`下使用管理员权限能够正常的下载，但是在`linux`下切换到root依然无法下载。  
建议使用
```
cnpm i wptoimage -g
```
2、在linux下还可能会出现其他的问题<https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md>
主要是因为沙箱和Chromium依赖包未安装的原因。  
3、CentOS6需要在`~/.bashrc`文件配置环境变量
```
文件末尾添加
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib64/firefox/bundled/lib64
```