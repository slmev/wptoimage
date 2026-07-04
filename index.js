#!/usr/bin/env node

const { Command } = require("commander");
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const appInfo = require("./package.json");

const defaultBrowserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-crash-reporter', '--disable-crashpad'];
const waitUntilValues = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'];

function parsePositiveInt(value, name) {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return number;
}

function parseNonNegativeInt(value, name) {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }

    return number;
}

function parsePositiveNumber(value, name) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${name} must be a positive number`);
    }

    return number;
}

function parseQuality(value) {
    const quality = parsePositiveInt(value, 'shot-q');

    if (quality > 100) {
        throw new Error('shot-q must be between 1 and 100');
    }

    return quality;
}

function parseWaitUntil(value) {
    if (!waitUntilValues.includes(value)) {
        throw new Error(`wait-until must be one of: ${waitUntilValues.join(', ')}`);
    }

    return value;
}

function getScreenshotType(outputFile) {
    const ext = path.extname(outputFile).toLowerCase();

    if (ext === '.jpg' || ext === '.jpeg') {
        return 'jpeg';
    }

    if (ext === '.png') {
        return 'png';
    }

    throw new Error('output file must end with .jpg, .jpeg, or .png');
}

async function fileExists(inputFile, access = fs.promises.access) {
    try {
        await access(inputFile, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

async function normalizeInputFile(inputFile, access = fs.promises.access) {
    if (/^(?:https?|file):\/\//i.test(inputFile)) {
        return inputFile;
    }

    if (await fileExists(inputFile, access)) {
        return pathToFileURL(path.resolve(inputFile)).href;
    }

    return `http://${inputFile}`;
}

function getSystemChromeCandidates(platform = process.platform, env = process.env) {
    if (platform === 'darwin') {
        return [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ];
    }

    if (platform === 'linux') {
        return [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
        ];
    }

    if (platform === 'win32') {
        return [
            env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            env.PROGRAMFILES && path.join(env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            env['PROGRAMFILES(X86)'] && path.join(env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ].filter(Boolean);
    }

    return [];
}

function findSystemChrome(existsSync = fs.existsSync, platform = process.platform, env = process.env) {
    return getSystemChromeCandidates(platform, env).find((candidate) => existsSync(candidate));
}

function buildLaunchOptions(options = {}, existsSync = fs.existsSync, platform = process.platform, env = process.env) {
    const launchOptions = {
        args: defaultBrowserArgs,
    };
    const executablePath = options.executablePath || (!env.PUPPETEER_EXECUTABLE_PATH && findSystemChrome(existsSync, platform, env));

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    return launchOptions;
}

function formatBrowserLaunchError(err, platform = process.platform, env = process.env) {
    const candidates = getSystemChromeCandidates(platform, env);
    const lines = [
        'Failed to launch Chrome/Chromium.',
        '',
        'Tried:',
        env.PUPPETEER_EXECUTABLE_PATH
            ? `- PUPPETEER_EXECUTABLE_PATH=${env.PUPPETEER_EXECUTABLE_PATH}`
            : '- PUPPETEER_EXECUTABLE_PATH is not set',
        ...candidates.map((candidate) => `- ${candidate}`),
        '',
        'Fix:',
        '- Run: ./node_modules/.bin/puppeteer browsers install chrome',
        '- Or set PUPPETEER_EXECUTABLE_PATH to an installed Chrome/Chromium executable.',
        '',
        `Original error: ${err.message}`,
    ];

    return lines.join('\n');
}

function buildScreenshotConfig(options, outputFile) {
    const type = getScreenshotType(outputFile);
    const fullPage = options.fullPage !== false;
    const width = options.shotW ? parsePositiveInt(options.shotW, 'shot-w') : 860;
    const height = options.shotH ? parsePositiveInt(options.shotH, 'shot-h') : 600;
    const deviceScaleFactor = options.deviceScaleFactor ? parsePositiveNumber(options.deviceScaleFactor, 'device-scale-factor') : 2;
    const quality = options.shotQ ? parseQuality(options.shotQ) : 100;
    const screenshot = {
        path: path.resolve(outputFile),
        type,
        fullPage,
    };

    if (type === 'jpeg') {
        screenshot.quality = quality;
    }

    return {
        viewport: {
            width,
            height,
            deviceScaleFactor,
        },
        screenshot,
    };
}

function buildNavigationConfig(options) {
    return {
        delay: options.delay ? parseNonNegativeInt(options.delay, 'delay') : 0,
        goto: {
            timeout: 60000,
            waitUntil: options.waitUntil ? parseWaitUntil(options.waitUntil) : 'load',
        },
    };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture(inputFile, outputFile, options = {}, browserLib = puppeteer) {
    const newInputFile = await normalizeInputFile(inputFile);
    const { viewport, screenshot } = buildScreenshotConfig(options, outputFile);
    const navigation = buildNavigationConfig(options);
    let browser;

    try {
        try {
            browser = await browserLib.launch(buildLaunchOptions(options));
        } catch (err) {
            throw new Error(formatBrowserLaunchError(err));
        }
        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.goto(newInputFile, navigation.goto);
        if (navigation.delay > 0) {
            await delay(navigation.delay);
        }
        await page.screenshot(screenshot);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function createProgram() {
    const program = new Command();

    program.name('wptoimage')
        .version(appInfo.version, '-v, --version')
        .usage('[options] <input file> <output file>')
        .arguments('<inputFile> <outputFile>')
        .option('-x, --shot-w <int>', '设置图片宽度，full-page为true时，若x大于页面内容实际宽度，x为图片宽度，若x小于页面内容实际宽度，页面最小宽度为图片宽度，不存在页面最小宽度时请设置x的值；full-page为false时，x为图片宽度')
        .option('-y, --shot-h <int>', '设置图片高度，full-page为true时，若y大于页面内容实际高度，y为图片高度，若y小于页面内容实际高度，页面最小高度为图片高度；full-page为false时，y为图片高度')
        .option('-q, --shot-q <int>', '设置图片质量，只有jpg类型生效，1-100之间')
        .option('-d, --device-scale-factor <number>', '设置设备像素比，默认2，值越高图片越清晰但文件越大')
        .option('--wait-until <event>', '设置页面等待事件，可选 load、domcontentloaded、networkidle0、networkidle2，默认 load')
        .option('--delay <ms>', '页面加载完成后额外等待的毫秒数，默认0')
        .option('--no-full-page', '取消截取完整页面, 默认宽为860， 高为600')
        .action(async function (inputFile, outputFile) {
            await capture(inputFile, outputFile, program.opts());
        });

    return program;
}

async function runCli(argv = process.argv) {
    const program = createProgram();

    try {
        await program.parseAsync(argv);
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    runCli();
}

module.exports = {
    buildNavigationConfig,
    buildScreenshotConfig,
    buildLaunchOptions,
    capture,
    createProgram,
    findSystemChrome,
    formatBrowserLaunchError,
    getSystemChromeCandidates,
    getScreenshotType,
    normalizeInputFile,
    parseNonNegativeInt,
    parsePositiveInt,
    parsePositiveNumber,
    parseQuality,
    parseWaitUntil,
    runCli,
};
