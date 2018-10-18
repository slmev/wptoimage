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
    .option('-x, --shot-w <int>', '设置图片宽度')
    .option('-y, --shot-h <int>', '设置图片高度')
    .option('--no-full-page', '取消截取完整页面, 默认宽为860， 高为600')
    .action(function (inputFile, outputFile) {
        try {
            const { shotW, shotH, fullPage } = program;
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
                    // quality: 100, // 默认质量普通页面和质量100普通页面肉眼查看没有区别，但是大小基本翻倍
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