#!/usr/bin/env node

const program = require("commander");
const puppeteer = require('puppeteer');
const path = require('path');
const appInfo = require("./package.json");

program.allowUnknownOption()
       .version(appInfo.version, '-v, --version')
       .usage('[options] <input file> <output file>')
    //    .option('--shot-w <int>', '设置图片宽度', (e) => { console.log(e); return e; })
    //    .option('--shot-h <int>', '设置图片高度', (e) => { console.log(e); return e; })
       .action(function(inputFile, outputFile) {
           (async () => {
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                await page.goto(path.resolve(inputFile));
                await page.setViewport({
                    width: 790,
                    height: 1,
                });
                await page.screenshot({
                path: path.resolve(outputFile),
                    type: 'jpeg',
                    fullPage: true,
                });
                await browser.close();
            })();
       })
       .parse(process.argv);

