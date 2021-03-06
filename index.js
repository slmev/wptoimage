#!/usr/bin/env node

const program = require("commander");
const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const appInfo = require("./package.json");

program.allowUnknownOption()
    .name('wptoimage')
    .version(appInfo.version, '-v, --version')
    .usage('[options] <input file> <output file>')
    .arguments('<inputFile> <outputFile>')
    .option('-x, --shot-w <int>', '设置图片宽度，full-page为true时，若x大于页面内容实际宽度，x为图片宽度，若x小于页面内容实际宽度，页面最小宽度为图片宽度，不存在页面最小宽度时请设置x的值；full-page为false时，x为图片宽度')
    .option('-y, --shot-h <int>', '设置图片高度，full-page为true时，若y大于页面内容实际高度，y为图片高度，若y小于页面内容实际高度，页面最小高度为图片高度；full-page为false时，y为图片高度')
    .option('-q, --shot-q <int>', '设置图片质量，只有jpg类型生效，1-100之间')
    .option('--no-full-page', '取消截取完整页面, 默认宽为860， 高为600')
    .action(function (inputFile, outputFile) {
        try {
            const { shotW, shotH, shotQ, fullPage } = program.opts();
            let newInputFile;
            // 判断文件是否存在
            fs.access(inputFile, fs.constants.F_OK, (err) => {
                if (err) {
                    if (/^http(s)?:\/\//.test(inputFile)) {
                        newInputFile = inputFile;
                    } else {
                        newInputFile = `http:\/\/${inputFile}`;
                    }
                } else {
                    const sysType = os.type();
                    switch (sysType) {
                        case 'Linux':
                        case 'Darwin':
                            newInputFile = `file:\/\/${path.resolve(inputFile)}`;
                            break;
                        default:
                            newInputFile = path.resolve(inputFile);
                            break;
                    }

                }
            });
            (async () => {
                const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.goto(newInputFile, { timeout: 60000 });
                await page.setViewport({
                    width: Number(shotW) || (fullPage ? 1 : 860),
                    height: Number(shotH) || (fullPage ? 1 : 600),
                });
                await page.screenshot({
                    path: path.resolve(outputFile),
                    type: 'jpeg',
                    quality: Number(shotQ) || 100, // 默认质量为100
                    fullPage,
                });
                await browser.close();
            })();
        }
        catch (err) {
            program.outputHelp();
            console.error(err);
        }
    })
    .parse(process.argv);