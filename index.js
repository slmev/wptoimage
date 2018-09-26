#!/usr/bin/env node

const program = require("commander");
const puppeteer = require('puppeteer');
const path = require('path');
const appInfo = require("./package.json");

program.allowUnknownOption()
       .version(appInfo.version, '-v, --version')
       .usage('[options] <input file> <output file>')
       .option('--shot-w <int>', '设置图片宽度')
       .option('--shot-h <int>', '设置图片高度')
       .option('--full-page <bool>', '设置是否截取完整页面, 默认为true')
       .action(function(inputFile, outputFile) {
            const { shotW, shotH, fullPage } = program;
           (async () => {
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(path.resolve(inputFile));
                await page.setViewport({
                    width: Number(shotW) || 790,
                    height: Number(shotH) || (fullPage === 'false' ? 600 : 1),
                });
                await page.screenshot({
                path: path.resolve(outputFile),
                    type: 'jpeg',
                    fullPage: fullPage === 'false' ? false : true,
                });
                await browser.close();
            })();
       })
       .parse(process.argv);
