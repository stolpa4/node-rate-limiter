const path = require('path');
const fs = require('fs');

async function main() {
    const args = parseArgs();

    let promises = [];

    for (const fp of args.inFiles) {
        promises.push(processFile(fp, args.indentSize));
    }

    await Promise.all(promises);
}

function parseArgs() {
    if (process.argv.length < 3) {
        console.log(
            `Usage: ${process.argv[0]} ${process.argv[1]} <path to directory for recursive json search> [indent size]`
        );
        process.exit(1);
    }

    return {
        inFiles: parseAndValidatePath(process.argv[2]),
        indentSize: +process.argv[3] || 4,
    };
}

function parseAndValidatePath(inputPath) {
    if (!fs.existsSync(inputPath)) {
        console.log(`Input path provided does not exist!`);
        process.exit(1);
    }

    if (fs.lstatSync(inputPath).isDirectory()) {
        return rglobJson(inputPath);
    } else {
        return [path.resolve(inputPath)];
    }
}

function rglobJson(dir) {
    let res = [];

    if (/node_modules|build*|converage*/.test(path.basename(dir))) {
        return res;
    }

    for (let item of fs.readdirSync(dir)) {
        item = path.join(dir, item);

        if (fs.lstatSync(item).isDirectory()) {
            res.push(...rglobJson(item));
        } else if (path.extname(item).toLowerCase() === '.json') {
            res.push(path.resolve(item));
        }
    }

    return res;
}

async function processFile(absPath, indentSize) {
    console.log(`Processing file: ${absPath}.`);
    await dumpObjectToFile(sortObjectByKeys(require(absPath)), absPath, indentSize);
}

function sortObjectByKeys(o) {
    return Object(o) !== o || Array.isArray(o)
        ? o
        : Object.keys(o)
              .sort()
              .reduce((a, k) => ({ ...a, [k]: sortObjectByKeys(o[k]) }), {});
}

async function dumpObjectToFile(obj, path, indentSize = 4) {
    await fs.promises.writeFile(path, JSON.stringify(obj, null, indentSize));
}

if (require.main === module) {
    main().catch((e) => {
        console.error('Got error', e);
    });
}
