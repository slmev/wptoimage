const assert = require('assert/strict');
const { execFile } = require('child_process');
const fsSync = require('fs');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { promisify } = require('util');
const test = require('node:test');

const execFileAsync = promisify(execFile);
const binPath = path.resolve(__dirname, '..', 'index.js');

function findCachedChromeForTesting() {
    const chromeCache = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');

    if (!fsSync.existsSync(chromeCache)) {
        return null;
    }

    const cacheDirs = fsSync.readdirSync(chromeCache).sort().reverse();
    const executableCandidates = [
        ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
        ['chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
        ['chrome-linux64', 'chrome'],
        ['chrome-win64', 'chrome.exe'],
    ];

    for (const dir of cacheDirs) {
        for (const candidate of executableCandidates) {
            const executable = path.join(chromeCache, dir, ...candidate);

            if (fsSync.existsSync(executable)) {
                return executable;
            }
        }
    }

    return null;
}

function getEnv() {
    const env = { ...process.env };
    const executable = findCachedChromeForTesting();

    if (!env.PUPPETEER_EXECUTABLE_PATH && executable) {
        env.PUPPETEER_EXECUTABLE_PATH = executable;
    }

    return env;
}

async function assertNonEmptyFile(filePath) {
    const stat = await fs.stat(filePath);

    assert.ok(stat.size > 0, `${filePath} should not be empty`);
}

async function readImageSize(filePath) {
    const buffer = await fs.readFile(filePath);

    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20),
        };
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;

        while (offset < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset += 1;
                continue;
            }

            const marker = buffer[offset + 1];
            const length = buffer.readUInt16BE(offset + 2);

            if (marker >= 0xc0 && marker <= 0xc3) {
                return {
                    width: buffer.readUInt16BE(offset + 7),
                    height: buffer.readUInt16BE(offset + 5),
                };
            }

            offset += 2 + length;
        }
    }

    throw new Error(`Unsupported image format: ${filePath}`);
}

async function assertImageSize(filePath, width, height) {
    assert.deepEqual(await readImageSize(filePath), { width, height });
}

test('CLI creates jpg and png screenshots', { timeout: 120000 }, async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wptoimage-'));

    try {
        const jpgOutput = path.join(tempDir, 'demo.jpg');
        const pngInput = path.join(tempDir, 'input.html');
        const pngOutput = path.join(tempDir, 'demo.png');
        const fileUrlOutput = path.join(tempDir, 'file-url.png');

        await fs.writeFile(pngInput, '<!doctype html><title>wptoimage</title><main style="width:320px;height:180px;background:#fff;color:#111">test</main>');

        await execFileAsync(process.execPath, [
            binPath,
            '--no-full-page',
            '-x',
            '320',
            '-y',
            '240',
            path.resolve(__dirname, '..', 'demo.html'),
            jpgOutput,
        ], { env: getEnv() });
        await execFileAsync(process.execPath, [
            binPath,
            '--no-full-page',
            '--wait-fonts',
            '--wait-images',
            '-x',
            '320',
            '-y',
            '240',
            pngInput,
            pngOutput,
        ], { env: getEnv() });
        await execFileAsync(process.execPath, [
            binPath,
            '--no-full-page',
            '-x',
            '320',
            '-y',
            '240',
            pathToFileURL(pngInput).href,
            fileUrlOutput,
        ], { env: getEnv() });

        await assertNonEmptyFile(jpgOutput);
        await assertNonEmptyFile(pngOutput);
        await assertNonEmptyFile(fileUrlOutput);
        await assertImageSize(jpgOutput, 640, 480);
        await assertImageSize(pngOutput, 640, 480);
        await assertImageSize(fileUrlOutput, 640, 480);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});
