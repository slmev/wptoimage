const assert = require('assert/strict');
const { execFile } = require('child_process');
const path = require('path');
const test = require('node:test');
const { pathToFileURL } = require('url');
const { promisify } = require('util');

const {
    buildLaunchOptions,
    buildNavigationConfig,
    buildScreenshotConfig,
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
} = require('../index');

const execFileAsync = promisify(execFile);
const binPath = path.resolve(__dirname, '..', 'index.js');

function accessSucceeds() {
    return Promise.resolve();
}

function accessFails() {
    return Promise.reject(new Error('missing'));
}

test('normalizeInputFile keeps http and https URLs unchanged', async () => {
    assert.equal(await normalizeInputFile('http://example.com/a', accessFails), 'http://example.com/a');
    assert.equal(await normalizeInputFile('https://example.com/a', accessFails), 'https://example.com/a');
});

test('normalizeInputFile keeps file URLs unchanged for local HTML input', async () => {
    const fileUrl = pathToFileURL(path.resolve('demo.html')).href;

    assert.equal(await normalizeInputFile(fileUrl, accessFails), fileUrl);
});

test('normalizeInputFile converts existing local files to file URLs', async () => {
    const result = await normalizeInputFile('demo.html', accessSucceeds);

    assert.equal(result, pathToFileURL(path.resolve('demo.html')).href);
});

test('normalizeInputFile adds http protocol for non-local inputs without protocol', async () => {
    assert.equal(await normalizeInputFile('example.com/page', accessFails), 'http://example.com/page');
});

test('getSystemChromeCandidates includes common local browser paths', () => {
    assert.ok(getSystemChromeCandidates('darwin').includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
    assert.ok(getSystemChromeCandidates('linux').includes('/usr/bin/google-chrome'));
});

test('findSystemChrome returns the first existing candidate', () => {
    const existing = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';

    assert.equal(findSystemChrome((candidate) => candidate === existing, 'darwin'), existing);
});

test('buildLaunchOptions falls back to system Chrome when Puppeteer cache is missing', () => {
    const existing = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const result = buildLaunchOptions({}, (candidate) => candidate === existing, 'darwin', {});

    assert.equal(result.executablePath, existing);
    assert.ok(result.args.includes('--no-sandbox'));
});

test('buildLaunchOptions respects PUPPETEER_EXECUTABLE_PATH', () => {
    const result = buildLaunchOptions({}, () => true, 'darwin', {
        PUPPETEER_EXECUTABLE_PATH: '/custom/chrome',
    });

    assert.equal(Object.hasOwn(result, 'executablePath'), false);
});

test('getScreenshotType supports jpg, jpeg, and png outputs', () => {
    assert.equal(getScreenshotType('out.jpg'), 'jpeg');
    assert.equal(getScreenshotType('out.jpeg'), 'jpeg');
    assert.equal(getScreenshotType('out.PNG'), 'png');
});

test('getScreenshotType rejects unsupported output extensions', () => {
    assert.throws(() => getScreenshotType('out.webp'), /must end with/);
});

test('buildScreenshotConfig uses safe defaults', () => {
    const result = buildScreenshotConfig({}, 'out.jpg');

    assert.deepEqual(result.viewport, { width: 860, height: 600, deviceScaleFactor: 2 });
    assert.equal(result.screenshot.type, 'jpeg');
    assert.equal(result.screenshot.fullPage, true);
    assert.equal(result.screenshot.quality, 100);
});

test('buildScreenshotConfig parses explicit size, scale, quality, and fullPage options', () => {
    const result = buildScreenshotConfig({
        shotW: '1200',
        shotH: '800',
        deviceScaleFactor: '3',
        shotQ: '75',
        fullPage: false,
    }, 'out.jpeg');

    assert.deepEqual(result.viewport, { width: 1200, height: 800, deviceScaleFactor: 3 });
    assert.equal(result.screenshot.type, 'jpeg');
    assert.equal(result.screenshot.fullPage, false);
    assert.equal(result.screenshot.quality, 75);
});

test('buildScreenshotConfig does not pass quality for png output', () => {
    const result = buildScreenshotConfig({ shotQ: '75' }, 'out.png');

    assert.equal(result.screenshot.type, 'png');
    assert.equal(Object.hasOwn(result.screenshot, 'quality'), false);
});

test('buildNavigationConfig uses safe defaults', () => {
    assert.deepEqual(buildNavigationConfig({}), {
        delay: 0,
        waitFonts: false,
        waitImages: false,
        goto: {
            timeout: 60000,
            waitUntil: 'load',
        },
    });
});

test('buildNavigationConfig parses wait event and delay', () => {
    assert.deepEqual(buildNavigationConfig({
        waitUntil: 'networkidle0',
        delay: '500',
        waitFonts: true,
        waitImages: true,
    }), {
        delay: 500,
        waitFonts: true,
        waitImages: true,
        goto: {
            timeout: 60000,
            waitUntil: 'networkidle0',
        },
    });
});

test('formatBrowserLaunchError includes actionable browser setup hints', () => {
    const message = formatBrowserLaunchError(new Error('missing browser'), 'darwin', {
        PUPPETEER_EXECUTABLE_PATH: '/custom/chrome',
    });

    assert.match(message, /Failed to launch Chrome\/Chromium/);
    assert.match(message, /PUPPETEER_EXECUTABLE_PATH=\/custom\/chrome/);
    assert.match(message, /puppeteer browsers install chrome/);
    assert.match(message, /Original error: missing browser/);
});

test('parsePositiveInt rejects non-positive and non-integer values', () => {
    assert.equal(parsePositiveInt('1', 'shot-w'), 1);
    assert.throws(() => parsePositiveInt('0', 'shot-w'), /positive integer/);
    assert.throws(() => parsePositiveInt('-1', 'shot-w'), /positive integer/);
    assert.throws(() => parsePositiveInt('1.5', 'shot-w'), /positive integer/);
    assert.throws(() => parsePositiveInt('abc', 'shot-w'), /positive integer/);
});

test('parseNonNegativeInt rejects negative and non-integer values', () => {
    assert.equal(parseNonNegativeInt('0', 'delay'), 0);
    assert.equal(parseNonNegativeInt('500', 'delay'), 500);
    assert.throws(() => parseNonNegativeInt('-1', 'delay'), /non-negative integer/);
    assert.throws(() => parseNonNegativeInt('1.5', 'delay'), /non-negative integer/);
    assert.throws(() => parseNonNegativeInt('abc', 'delay'), /non-negative integer/);
});

test('parsePositiveNumber rejects non-positive values', () => {
    assert.equal(parsePositiveNumber('1.5', 'device-scale-factor'), 1.5);
    assert.throws(() => parsePositiveNumber('0', 'device-scale-factor'), /positive number/);
    assert.throws(() => parsePositiveNumber('-1', 'device-scale-factor'), /positive number/);
    assert.throws(() => parsePositiveNumber('abc', 'device-scale-factor'), /positive number/);
});

test('parseQuality only allows 1 through 100', () => {
    assert.equal(parseQuality('1'), 1);
    assert.equal(parseQuality('100'), 100);
    assert.throws(() => parseQuality('0'), /positive integer/);
    assert.throws(() => parseQuality('101'), /between 1 and 100/);
});

test('parseWaitUntil only allows Puppeteer wait events', () => {
    assert.equal(parseWaitUntil('load'), 'load');
    assert.equal(parseWaitUntil('domcontentloaded'), 'domcontentloaded');
    assert.equal(parseWaitUntil('networkidle0'), 'networkidle0');
    assert.equal(parseWaitUntil('networkidle2'), 'networkidle2');
    assert.throws(() => parseWaitUntil('idle'), /wait-until must be one of/);
});

async function assertCliFails(args, messagePattern) {
    await assert.rejects(
        execFileAsync(process.execPath, [binPath, ...args]),
        (err) => {
            assert.equal(err.code, 1);
            assert.match(err.stderr, messagePattern);
            return true;
        }
    );
}

test('CLI rejects unsupported output extensions without launching a browser', async () => {
    await assertCliFails(['demo.html', 'out.webp'], /must end with/);
    await assertCliFails(['--wait-fonts', '--wait-images', 'demo.html', 'out.webp'], /must end with/);
});

test('CLI rejects invalid width, height, and quality values', async () => {
    await assertCliFails(['-x', '0', 'demo.html', 'out.jpg'], /shot-w must be a positive integer/);
    await assertCliFails(['-y', '1.5', 'demo.html', 'out.jpg'], /shot-h must be a positive integer/);
    await assertCliFails(['-q', '101', 'demo.html', 'out.jpg'], /shot-q must be between 1 and 100/);
    await assertCliFails(['-d', '0', 'demo.html', 'out.jpg'], /device-scale-factor must be a positive number/);
    await assertCliFails(['--delay', '-1', 'demo.html', 'out.jpg'], /delay must be a non-negative integer/);
    await assertCliFails(['--wait-until', 'idle', 'demo.html', 'out.jpg'], /wait-until must be one of/);
});

test('CLI rejects unknown options clearly', async () => {
    await assertCliFails(['--bad-option', 'demo.html', 'out.jpg'], /unknown option '--bad-option'/);
});
