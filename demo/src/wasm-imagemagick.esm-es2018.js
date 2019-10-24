const pMap = (iterable, mapper, options) => new Promise((resolve, reject) => {
	options = Object.assign({
		concurrency: Infinity
	}, options);

	if (typeof mapper !== 'function') {
		throw new TypeError('Mapper function is required');
	}

	const {concurrency} = options;

	if (!(typeof concurrency === 'number' && concurrency >= 1)) {
		throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${concurrency}\` (${typeof concurrency})`);
	}

	const ret = [];
	const iterator = iterable[Symbol.iterator]();
	let isRejected = false;
	let isIterableDone = false;
	let resolvingCount = 0;
	let currentIndex = 0;

	const next = () => {
		if (isRejected) {
			return;
		}

		const nextItem = iterator.next();
		const i = currentIndex;
		currentIndex++;

		if (nextItem.done) {
			isIterableDone = true;

			if (resolvingCount === 0) {
				resolve(ret);
			}

			return;
		}

		resolvingCount++;

		Promise.resolve(nextItem.value)
			.then(element => mapper(element, i))
			.then(
				value => {
					ret[i] = value;
					resolvingCount--;
					next();
				},
				error => {
					isRejected = true;
					reject(error);
				}
			);
	};

	for (let i = 0; i < concurrency; i++) {
		next();

		if (isIterableDone) {
			break;
		}
	}
});

var pMap_1 = pMap;
var default_1 = pMap;
pMap_1.default = default_1;

// internal misc utilities
function values(object) {
    return Object.keys(object).map(name => object[name]);
}
function flat(arr) {
    return arr.reduce((a, b) => a.concat(b));
}
// export function trimNoNewLines(s: string): string {
//   return s.replace(/^ +/, '').replace(/ +$/, '')
// }

// TODO: store variables from text file output and reuse them. example:
// `
// color=$(convert filename.png -format "%[pixel:p{0,0}]" info:foo.txt)
// convert filename.png -alpha off -bordercolor $color -border 1 \
//     \( +clone -fuzz 30% -fill none -floodfill +0+0 $color \
//        -alpha extract -geometry 200% -blur 0x0.5 \
//        -morphology erode square:1 -geometry 50% \) \
//     -compose CopyOpacity -composite -shave 1 outputfilename.png
// `
/**
 * Generates a valid command line command from given `string[]` command. Works with a single command.
 */
function arrayToCliOne(command) {
    return command
        .map(c => c + '')
        // if it contain spaces
        .map(c => (c.trim().match(/\s/)) ? `'${c}'` : c)
        // escape parenthesis
        .map(c => c.trim() === '(' ? '\\(' : c.trim() === ')' ? '\\)' : c)
        .join(' ');
}
/**
 * Generates a valid command line string from given `string[]` that is compatible with  {@link call}. Works with multiple
 * commands by separating  them with new lines and support comand splitting in new lines using `\`.
 * See {@link ExecuteCommand} for more information.
 */
function arrayToCli(command) {
    const cmd = typeof command[0] === 'string' ? [command] : command;
    return cmd.map(arrayToCliOne).join('\n');
}
/**
 * Generates a command in the form of array of strings, compatible with {@link call} from given command line string . The string must contain only one command (no newlines).
 */
function cliToArrayOne(cliCommand) {
    let inString = false;
    const spaceIndexes = [0];
    for (let index = 0; index < cliCommand.length; index++) {
        const c = cliCommand[index];
        if (c.match(/[\s]/im) && !inString) {
            spaceIndexes.push(index);
        }
        if (c === `'`) {
            inString = !inString;
        }
    }
    spaceIndexes.push(cliCommand.length);
    const command = spaceIndexes
        .map((spaceIndex, i) => cliCommand.substring(i === 0 ? 0 : spaceIndexes[i - 1], spaceIndexes[i]).trim())
        .filter(s => !!s)
        // remove quotes
        .map(s => s.startsWith(`'`) ? s.substring(1, s.length) : s)
        .map(s => s.endsWith(`'`) ? s.substring(0, s.length - 1) : s)
        //  unescape parenthesis
        .map(s => s === `\\(` ? `(` : s === `\\)` ? `)` : s);
    return command;
}
/**
 * Generates a command in the form of `string[][]` that is compatible with {@link call} from given command line string.
 * This works for strings containing multiple commands in different lines. and also respect `\` character for continue the same
 * command in a new line. See {@link ExecuteCommand} for more information.
 */
function cliToArray(cliCommand) {
    const lines = cliCommand.split('\n')
        .map(s => s.trim()).map(cliToArrayOne)
        .filter(a => a && a.length);
    const result = [];
    let currentCommand = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line[line.length - 1] !== '\\') {
            currentCommand = currentCommand.concat(line);
            result.push(currentCommand);
            currentCommand = [];
        }
        else {
            currentCommand = currentCommand.concat(line.slice(0, line.length - 1));
        }
    }
    return result;
}
/**
 * Makes sure that given {@link ExecuteCommand}, in whatever syntax, is transformed to the form `string[][]` that is compatible with {@link call}
 */
function asCommand(c) {
    if (typeof c === 'string') {
        return asCommand([c]);
    }
    if (!c[0]) {
        return [];
    }
    if (typeof c[0] === 'string') {
        return flat(c.map((subCommand) => cliToArray(subCommand)));
    }
    return c;
}

function blobToUint8Array(blob) {
    return new Promise(resolve => {
        const fileReader = new FileReader();
        fileReader.onload = event => {
            const result = event.target.result;
            resolve(new Uint8Array(result));
        };
        fileReader.readAsArrayBuffer(blob);
    });
}
function blobToString(blb) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            const text = e.srcElement.result;
            resolve(text);
        });
        reader.readAsText(blb);
    });
}
function isInputFile(file) {
    return !!file.content;
}
function isOutputFile(file) {
    return !!file.blob;
}
function uint8ArrayToString(arr, charset = 'utf-8') {
    return new TextDecoder(charset).decode(arr);
}
/**
 * Read files as string. Useful when files contains plain text like in the output file info.txt of `convert logo: -format '%[pixel:p{0,0}]' info:info.txt`
 */
async function readFileAsText(file) {
    if (isInputFile(file)) {
        return uint8ArrayToString(file.content);
    }
    if (isOutputFile(file)) {
        return await blobToString(file.blob);
    }
}
async function isImage(file) {
    const { exitCode } = await execute$$1({ inputFiles: [await asInputFile(file)], commands: `identify ${file.name}` });
    return exitCode === 0;
}
/**
 * Builds a new {@link MagickInputFile} by fetching the content of given url and optionally naming the file using given name
 * or extracting the file name from the url otherwise.
 */
async function buildInputFile(url, name = getFileName(url)) {
    const fetchedSourceImage = await fetch(url);
    const arrayBuffer = await fetchedSourceImage.arrayBuffer();
    const content = new Uint8Array(arrayBuffer);
    return { name, content };
}
function uint8ArrayToBlob(arr) {
    return new Blob([arr]);
}
async function outputFileToInputFile(file, name = file.name) {
    return {
        name,
        content: await blobToUint8Array(file.blob),
    };
}
function inputFileToOutputFile(file, name = file.name) {
    return {
        name,
        blob: uint8ArrayToBlob(file.content),
    };
}
async function asInputFile(f, name = f.name) {
    let inputFile;
    if (isOutputFile(f)) {
        inputFile = await outputFileToInputFile(f);
    }
    else {
        inputFile = f;
    }
    inputFile.name = name;
    return inputFile;
}
async function asOutputFile(f, name = f.name) {
    let outputFile;
    if (isInputFile(f)) {
        outputFile = inputFileToOutputFile(f);
    }
    else {
        outputFile = f;
    }
    outputFile.name = name;
    return outputFile;
}
function getFileName(url) {
    try {
        return decodeURIComponent(new URL(url).pathname.split('/').pop());
    }
    catch (error) {
        const s = `http://foo.com/${url}`;
        try {
            return decodeURIComponent(new URL(s).pathname.split('/').pop());
        }
        catch (error) {
            return url;
        }
    }
}
function getFileNameExtension(filePathOrUrl) {
    const s = getFileName(filePathOrUrl);
    return s.substring(s.lastIndexOf('.') + 1, s.length);
}

// utilities related to HTML (img) elements
/**
 * Will load given html img element src with the inline image content.
 * @param image the image to be loaded
 * @param el the html image element in which to load the image
 * @param forceBrowserSupport if true and the image extension is not supported by browsers, it will convert the image to png
 * and return that src so it can be shown in browsers
 */
async function loadImageElement$$1(image, el, forceBrowserSupport = false) {
    el.src = await buildImageSrc$$1(image, forceBrowserSupport);
}
/**
 * Return a string with the inline image content, suitable to be used to assign to an html img src attribute. See {@link loadImageElement}.
 * @param forceBrowserSupport if true and the image extension is not supported by browsers, it will convert the image to png
 * and return that src so it can be shown in browsers
 */
async function buildImageSrc$$1(image, forceBrowserSupport = false) {
    let img = image;
    const extension = getFileNameExtension(image.name);
    if (!extension || forceBrowserSupport && browserSupportedImageExtensions.indexOf(extension) === -1) {
        const { outputFiles } = await execute$$1({ inputFiles: [await asInputFile(image)], commands: `convert ${image.name} output.png` });
        outputFiles[0].name = image.name;
        img = outputFiles[0];
    }
    const outputFile = await asOutputFile(img);
    return URL.createObjectURL(outputFile.blob);
}
/**
 * Build `MagickInputFile[]` from given HTMLInputElement of type=file that user may used to select several files
 */
async function getInputFilesFromHtmlInputElement$$1(el) {
    const files = await inputFileToUint8Array(el);
    return files.map(f => ({ name: f.file.name, content: f.content }));
}
const browserSupportedImageExtensions = ['gif', 'png', 'jpg', 'webp'];
function inputFileFiles(el) {
    const files = [];
    for (let i = 0; i < el.files.length; i++) {
        const file = el.files.item(i);
        files.push(file);
    }
    return files;
}
async function inputFileToUint8Array(el) {
    return Promise.all(inputFileFiles(el).map(async (file) => {
        const content = await new Promise(resolve => {
            const reader = new FileReader();
            reader.addEventListener('loadend', e => {
                resolve(new Uint8Array(reader.result));
            });
            reader.readAsArrayBuffer(file);
        });
        return { file, content };
    }));
}

async function getPixelColor$$1(img, x, y) {
    const file = await executeAndReturnOutputFile$$1({ inputFiles: [await asInputFile(img)], commands: `convert ${img.name} -format '%[pixel:p{${x},${y}}]' info:info.txt` });
    return await readFileAsText(file);
}

let builtInImages;
const builtInImageNames$$1 = ['rose:', 'logo:', 'wizard:', 'granite:', 'netscape:'];
/**
 * Gets ImageMagick built-in images like `rose:`, `logo:`, etc in the form of {@link MagickInputFile}s
 */
async function getBuiltInImages$$1() {
    if (!builtInImages) {
        builtInImages = await pMap_1(builtInImageNames$$1, async (name) => {
            const info = await extractInfo$$1(name);
            const { outputFiles } = await execute$$1({ commands: `convert ${name} ${`output1.${info[0].image.format.toLowerCase()}`}` });
            outputFiles[0].name = name;
            return await asInputFile(outputFiles[0]);
        });
    }
    return builtInImages;
}
/**
 * shortcut of {@link getBuiltInImages} to get a single image by name
 */
async function getBuiltInImage$$1(name) {
    const images = await getBuiltInImages$$1();
    return images.find(f => f.name === name);
}

/**
 * Compare the two images and return true if they are equal visually. Optionally, a margin of error can be provided using `fuzz`
 */
async function compare$$1(img1, img2, fuzz = 0.015) {
    const identical = await compareNumber$$1(img1, img2);
    return identical <= fuzz;
}
async function compareNumber$$1(img1, img2) {
    const imgs = [];
    let name1;
    let name2;
    if (typeof img1 !== 'string') {
        const inputFile = await asInputFile(img1);
        imgs.push(inputFile);
        name1 = inputFile.name;
    }
    else {
        name1 = img1;
    }
    if (typeof img2 !== 'string') {
        const inputFile = await asInputFile(img2);
        imgs.push(inputFile);
        name2 = inputFile.name;
    }
    else {
        name2 = img2;
    }
    const result = await Call(imgs, ['convert', name1, name2, '-resize', '256x256^!', '-metric', 'RMSE', '-format', '%[distortion]', '-compare', 'info:info.txt']);
    const n = await blobToString(result[0].blob);
    return parseFloat(n);
}

/**
 * Execute `convert $IMG info.json` to extract image metadata. Returns the parsed info.json file contents
 * @param img could be a string in case you want to extract information about built in images like `rose:`
 */
async function extractInfo$$1(img) {
    // TODO: support several input images - we are already returning an array
    let name;
    let imgs;
    if (typeof img !== 'string') {
        imgs = [await asInputFile(img)];
        name = imgs[0].name;
    }
    else {
        name = img;
        imgs = [];
    }
    const processedFiles = await Call(imgs, ['convert', name, 'info.json']);
    try {
        return JSON.parse(await blobToString(processedFiles[0].blob));
    }
    catch (ex) {
        return [{ error: ex }];
    }
}

async function getConfigureFolders$$1() {
    const result = await execute$$1(`convert -debug configure rose: info:`);
    const contains = `Searching for configure file:`;
    const folders = result.stderr
        .filter(line => line.includes(contains))
        .map(line => line.substring(line.indexOf(contains) + contains.length, line.length))
        .map(s => s.replace(/\/\//g, '/'))
        .map(s => s.substring(0, s.lastIndexOf('/')))
        .map(s => s.replace(/"/g, '').trim());
    return folders;
}
// has some heuristic information regarding features (not) supported by wasm-imagemagick, for example, image formats
// heads up - all images spec/assets/to_rotate.* where converted using gimp unless explicitly saying otherwise
/**
 * list of image formats that are known to be supported by wasm-imagemagick. See `spec/formatSpec.ts`
 */
const knownSupportedReadWriteImageFormats$$1 = [
    'jpg', 'png',
    'psd',
    'tiff', 'xcf', 'gif', 'bmp', 'tga', 'miff', 'ico', 'dcm', 'xpm', 'pcx',
    //  'pix', // gives error
    'fits',
    // 'djvu', // read only support
    'ppm',
    'pgm',
    'pfm',
    'mng',
    'hdr',
    'dds',
    'otb',
    'txt',
];

/**
 * Execute first command in given config.
 */
async function executeOne$$1(configOrCommand) {
    const config = asExecuteConfig$$1(configOrCommand);
    let result = {
        stderr: [],
        stdout: [],
        outputFiles: [],
        exitCode: 1,
    };
    try {
        config.inputFiles = config.inputFiles || [];
        const command = asCommand(config.commands)[0];
        const t0 = performance.now();
        executeListeners.forEach(listener => listener.beforeExecute({ command, took: performance.now() - t0, id: t0 }));
        result = await call(config.inputFiles, command.map(c => c + ''));
        executeListeners.forEach(listener => listener.afterExecute({ command, took: performance.now() - t0, id: t0 }));
        if (result.exitCode) {
            return Object.assign({}, result, { errors: ['exit code: ' + result.exitCode + ' stderr: ' + result.stderr.join('\n')] });
        }
        return Object.assign({}, result, { errors: [undefined] });
    }
    catch (error) {
        return Object.assign({}, result, { errors: [error + ', exit code: ' + result.exitCode + ', stderr: ' + result.stderr.join('\n')] });
    }
}
function isExecuteCommand$$1(arg) {
    return !!arg.commands;
}
/**
 * Transform  `configOrCommand: ExecuteConfig | ExecuteCommand` to a valid ExecuteConfig object
 */
function asExecuteConfig$$1(arg) {
    if (isExecuteCommand$$1(arg)) {
        return arg;
    }
    return {
        inputFiles: [],
        commands: arg,
    };
}
/**
 * `execute()` shortcut that useful for commands that return only one output file or when only one particular output file is relevant.
 * @param outputFileName optionally user can give the desired output file name
 * @returns If `outputFileName` is given the file with that name, the first output file otherwise or undefined
 * if no file match, or no output files where generated (like in an error).
 */
async function executeAndReturnOutputFile$$1(configOrCommand, outputFileName) {
    const config = asExecuteConfig$$1(configOrCommand);
    const result = await execute$$1(config);
    return outputFileName ? result.outputFiles.find(f => f.name === outputFileName) : (result.outputFiles.length && result.outputFiles[0] || undefined);
}
const executeListeners = [];
function addExecuteListener$$1(l) {
    executeListeners.push(l);
}
/**
 * Execute all commands in given config serially in order. Output files from a command become available as
 * input files in next commands. In the following example we execute two commands. Notice how the second one uses `image2.png` which was the output file of the first one:
 *
 * ```ts
 * const { outputFiles, exitCode, stderr} = await execute({
 *   inputFiles: [await buildInputFile('fn.png', 'image1.png')],
 *   commands: `
 *     convert image1.png -bordercolor #ffee44 -background #eeff55 +polaroid image2.png
 *     convert image2.png -fill #997711 -tint 55 image3.jpg
 * `
 * })
 * if (exitCode) {
 *   alert(`There was an error with the command: ${stderr.join('\n')}`)
 * }
 * else {
 *   await loadImageElement(outputFiles.find(f => f.name==='image3.jpg'), document.getElementById('outputImage'))
 * }
 * ```
 *
 * See {@link ExecuteCommand} for different command syntax supported.
 *
 * See {@link ExecuteResult} for details on the object returned
 */
async function execute$$1(configOrCommand) {
    const config = asExecuteConfig$$1(configOrCommand);
    config.inputFiles = config.inputFiles || [];
    const allOutputFiles = {};
    const allInputFiles = {};
    config.inputFiles.forEach(f => {
        allInputFiles[f.name] = f;
    });
    let allErrors = [];
    const results = [];
    let allStdout = [];
    let allStderr = [];
    async function mapper(c) {
        const thisConfig = {
            inputFiles: values(allInputFiles),
            commands: [c],
        };
        const result = await executeOne$$1(thisConfig);
        results.push(result);
        allErrors = allErrors.concat(result.errors || []);
        allStdout = allStdout.concat(result.stdout || []);
        allStderr = allStderr.concat(result.stderr || []);
        await pMap_1(result.outputFiles, async (f) => {
            allOutputFiles[f.name] = f;
            const inputFile = await asInputFile(f);
            allInputFiles[inputFile.name] = inputFile;
        });
    }
    const commands = asCommand(config.commands);
    await pMap_1(commands, mapper, { concurrency: 1 });
    const resultWithError = results.find(r => r.exitCode !== 0);
    return {
        outputFiles: values(allOutputFiles),
        errors: allErrors,
        results,
        stdout: allStdout,
        stderr: allStderr,
        exitCode: resultWithError ? resultWithError.exitCode : 0,
    };
}

class ImageHomeImpl {
    constructor() {
        this.images = {};
        this.builtInImagesAdded = false;
    }
    get(name) {
        return this.images[name];
    }
    remove(names) {
        const result = [];
        Object.keys(this.images).forEach(name => {
            if (names.indexOf(name) !== -1) {
                result.push(this.images[name]);
                delete this.images[name];
            }
        });
        return result;
    }
    async getAll() {
        return await Promise.all(values(this.images));
    }
    register(file, name = file.name) {
        const promise = asInputFile(file);
        this.images[name] = promise;
        this.images[name].then(() => {
            promise.resolved = true;
        });
        return promise;
    }
    isRegistered(name, andReady = true) {
        return this.images[name] && (andReady && this.images[name].resolved);
    }
    async addBuiltInImages() {
        if (!this.builtInImagesAdded) {
            await pMap_1(await getBuiltInImages$$1(), img => this.register(img));
            this.builtInImagesAdded = true;
        }
    }
}
function createImageHome$$1() { return new ImageHomeImpl(); }

class ExecutionContextImpl {
    constructor(imageHome = createImageHome$$1()) {
        this.imageHome = imageHome;
    }
    async execute(configOrCommands) {
        const config = asExecuteConfig$$1(configOrCommands);
        config.inputFiles.forEach(f => {
            this.imageHome.register(f);
        });
        const inputFiles = await this.imageHome.getAll();
        const result = await execute$$1(Object.assign({}, config, { inputFiles }));
        result.outputFiles.forEach(f => {
            this.imageHome.register(f);
        });
        return result;
    }
    addFiles(files) {
        files.forEach(f => this.imageHome.register(f));
    }
    async getAllFiles() {
        return await this.imageHome.getAll();
    }
    async getFile(name) {
        return await this.imageHome.get(name);
    }
    async addBuiltInImages() {
        return this.imageHome.addBuiltInImages();
    }
    removeFiles(names) {
        return this.imageHome.remove(names);
    }
    static create(inheritFrom) {
        if (inheritFrom && !inheritFrom.imageHome) {
            throw new Error('Dont know how to inherit from other ExecutionContext implementation than this one');
        }
        return new ExecutionContextImpl(inheritFrom && inheritFrom.imageHome);
    }
}
function newExecutionContext$$1(inheritFrom) {
    return ExecutionContextImpl.create(inheritFrom);
}

/**
 * {@link call} shortcut that only returns the output files.
 */
async function Call(inputFiles, command) {
    const result = await call(inputFiles, command);
    return result.outputFiles;
}
/**
 * Low level execution function. All the other functions like [execute](https://github.com/KnicKnic/WASM-ImageMagick/tree/master/apidocs#execute)
 * ends up calling this one. It accept only one command and only in the form of array of strings.
 */
function call(inputFiles, command) {
    const request = {
        files: inputFiles,
        args: command,
        requestNumber: magickWorkerPromisesKey,
    };
    const promise = CreatePromiseEvent();
    magickWorkerPromises[magickWorkerPromisesKey] = promise;
    magickWorker.postMessage(request);
    magickWorkerPromisesKey++;
    return promise;
}
function CreatePromiseEvent() {
    let resolver;
    let rejecter;
    const emptyPromise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
    });
    emptyPromise.resolve = resolver;
    emptyPromise.reject = rejecter;
    return emptyPromise;
}
const magickWorker = new Worker('magick.js');
const magickWorkerPromises = {};
let magickWorkerPromisesKey = 1;
// handle responses as they stream in after being outputFiles by image magick
magickWorker.onmessage = e => {
    const response = e.data;
    const promise = magickWorkerPromises[response.requestNumber];
    delete magickWorkerPromises[response.requestNumber];
    const result = {
        outputFiles: response.outputFiles,
        stdout: response.stdout,
        stderr: response.stderr,
        exitCode: response.exitCode || 0,
    };
    promise.resolve(result);
};

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMAlign;
(function (IMAlign) {
    IMAlign["Center"] = "Center";
    IMAlign["End"] = "End";
    IMAlign["Left"] = "Left";
    IMAlign["Middle"] = "Middle";
    IMAlign["Right"] = "Right";
    IMAlign["Start"] = "Start";
})(IMAlign || (IMAlign = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMAlpha;
(function (IMAlpha) {
    IMAlpha["Activate"] = "Activate";
    IMAlpha["Associate"] = "Associate";
    IMAlpha["Background"] = "Background";
    IMAlpha["Copy"] = "Copy";
    IMAlpha["Deactivate"] = "Deactivate";
    IMAlpha["Discrete"] = "Discrete";
    IMAlpha["Disassociate"] = "Disassociate";
    IMAlpha["Extract"] = "Extract";
    IMAlpha["Off"] = "Off";
    IMAlpha["On"] = "On";
    IMAlpha["Opaque"] = "Opaque";
    IMAlpha["Remove"] = "Remove";
    IMAlpha["Set"] = "Set";
    IMAlpha["Shape"] = "Shape";
    IMAlpha["Transparent"] = "Transparent";
})(IMAlpha || (IMAlpha = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMAutoThreshold;
(function (IMAutoThreshold) {
    IMAutoThreshold["Kapur"] = "Kapur";
    IMAutoThreshold["OTSU"] = "OTSU";
    IMAutoThreshold["Triangle"] = "Triangle";
})(IMAutoThreshold || (IMAutoThreshold = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMBoolean;
(function (IMBoolean) {
    IMBoolean["False"] = "False";
    IMBoolean["True"] = "True";
    IMBoolean["0_"] = "0";
    IMBoolean["1_"] = "1";
})(IMBoolean || (IMBoolean = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMCache;
(function (IMCache) {
    IMCache["Disk"] = "Disk";
    IMCache["Distributed"] = "Distributed";
    IMCache["Map"] = "Map";
    IMCache["Memory"] = "Memory";
    IMCache["Ping"] = "Ping";
})(IMCache || (IMCache = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMChannel;
(function (IMChannel) {
    IMChannel["All"] = "All";
    IMChannel["Sync"] = "Sync";
    IMChannel["Default"] = "Default";
    IMChannel["A"] = "A";
    IMChannel["Alpha"] = "Alpha";
    IMChannel["Black"] = "Black";
    IMChannel["B"] = "B";
    IMChannel["Blue"] = "Blue";
    IMChannel["C"] = "C";
    IMChannel["Chroma"] = "Chroma";
    IMChannel["Cyan"] = "Cyan";
    IMChannel["Gray"] = "Gray";
    IMChannel["G"] = "G";
    IMChannel["Green"] = "Green";
    IMChannel["H"] = "H";
    IMChannel["Hue"] = "Hue";
    IMChannel["K"] = "K";
    IMChannel["L"] = "L";
    IMChannel["Lightness"] = "Lightness";
    IMChannel["Luminance"] = "Luminance";
    IMChannel["M"] = "M";
    IMChannel["Magenta"] = "Magenta";
    IMChannel["Meta"] = "Meta";
    IMChannel["R"] = "R";
    IMChannel["Red"] = "Red";
    IMChannel["S"] = "S";
    IMChannel["Saturation"] = "Saturation";
    IMChannel["Y"] = "Y";
    IMChannel["Yellow"] = "Yellow";
    IMChannel["0_"] = "0";
    IMChannel["1_"] = "1";
    IMChannel["2_"] = "2";
    IMChannel["3_"] = "3";
    IMChannel["4_"] = "4";
    IMChannel["5_"] = "5";
    IMChannel["6_"] = "6";
    IMChannel["7_"] = "7";
    IMChannel["8_"] = "8";
    IMChannel["9_"] = "9";
    IMChannel["10_"] = "10";
    IMChannel["11_"] = "11";
    IMChannel["12_"] = "12";
    IMChannel["13_"] = "13";
    IMChannel["14_"] = "14";
    IMChannel["15_"] = "15";
    IMChannel["16_"] = "16";
    IMChannel["17_"] = "17";
    IMChannel["18_"] = "18";
    IMChannel["19_"] = "19";
    IMChannel["20_"] = "20";
    IMChannel["21_"] = "21";
    IMChannel["22_"] = "22";
    IMChannel["23_"] = "23";
    IMChannel["24_"] = "24";
    IMChannel["25_"] = "25";
    IMChannel["26_"] = "26";
    IMChannel["27_"] = "27";
    IMChannel["28_"] = "28";
    IMChannel["29_"] = "29";
    IMChannel["30_"] = "30";
    IMChannel["31_"] = "31";
})(IMChannel || (IMChannel = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMClass;
(function (IMClass) {
    IMClass["DirectClass"] = "DirectClass";
    IMClass["PseudoClass"] = "PseudoClass";
})(IMClass || (IMClass = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMClipPath;
(function (IMClipPath) {
    IMClipPath["ObjectBoundingBox"] = "ObjectBoundingBox";
    IMClipPath["UserSpace"] = "UserSpace";
    IMClipPath["UserSpaceOnUse"] = "UserSpaceOnUse";
})(IMClipPath || (IMClipPath = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMColorspace;
(function (IMColorspace) {
    IMColorspace["CIELab"] = "CIELab";
    IMColorspace["CMY"] = "CMY";
    IMColorspace["CMYK"] = "CMYK";
    IMColorspace["Gray"] = "Gray";
    IMColorspace["HCL"] = "HCL";
    IMColorspace["HCLp"] = "HCLp";
    IMColorspace["HSB"] = "HSB";
    IMColorspace["HSI"] = "HSI";
    IMColorspace["HSL"] = "HSL";
    IMColorspace["HSV"] = "HSV";
    IMColorspace["HWB"] = "HWB";
    IMColorspace["Lab"] = "Lab";
    IMColorspace["LCH"] = "LCH";
    IMColorspace["LCHab"] = "LCHab";
    IMColorspace["LCHuv"] = "LCHuv";
    IMColorspace["LinearGray"] = "LinearGray";
    IMColorspace["LMS"] = "LMS";
    IMColorspace["Log"] = "Log";
    IMColorspace["Luv"] = "Luv";
    IMColorspace["OHTA"] = "OHTA";
    IMColorspace["Rec601YCbCr"] = "Rec601YCbCr";
    IMColorspace["Rec709YCbCr"] = "Rec709YCbCr";
    IMColorspace["RGB"] = "RGB";
    IMColorspace["scRGB"] = "scRGB";
    IMColorspace["sRGB"] = "sRGB";
    IMColorspace["Transparent"] = "Transparent";
    IMColorspace["xyY"] = "xyY";
    IMColorspace["XYZ"] = "XYZ";
    IMColorspace["YCbCr"] = "YCbCr";
    IMColorspace["YDbDr"] = "YDbDr";
    IMColorspace["YCC"] = "YCC";
    IMColorspace["YIQ"] = "YIQ";
    IMColorspace["YPbPr"] = "YPbPr";
    IMColorspace["YUV"] = "YUV";
})(IMColorspace || (IMColorspace = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMCommand;
(function (IMCommand) {
    IMCommand["-alpha"] = "-alpha";
    IMCommand["+background"] = "+background";
    IMCommand["-background"] = "-background";
    IMCommand["+format"] = "+format";
    IMCommand["-format"] = "-format";
    IMCommand["-quiet"] = "-quiet";
    IMCommand["+quiet"] = "+quiet";
    IMCommand["-regard-warnings"] = "-regard-warnings";
    IMCommand["+regard-warnings"] = "+regard-warnings";
    IMCommand["+repage"] = "+repage";
    IMCommand["-repage"] = "-repage";
    IMCommand["+size"] = "+size";
    IMCommand["-size"] = "-size";
    IMCommand["+virtual-pixel"] = "+virtual-pixel";
    IMCommand["-virtual-pixel"] = "-virtual-pixel";
    IMCommand["-blur"] = "-blur";
    IMCommand["-resize"] = "-resize";
    IMCommand["-adaptive-blur"] = "-adaptive-blur";
    IMCommand["-adaptive-resize"] = "-adaptive-resize";
    IMCommand["-adaptive-sharpen"] = "-adaptive-sharpen";
    IMCommand["-adjoin"] = "-adjoin";
    IMCommand["+adjoin"] = "+adjoin";
    IMCommand["+mattecolor"] = "+mattecolor";
    IMCommand["-mattecolor"] = "-mattecolor";
    IMCommand["-annotate"] = "-annotate";
    IMCommand["-antialias"] = "-antialias";
    IMCommand["+antialias"] = "+antialias";
    IMCommand["-append"] = "-append";
    IMCommand["+append"] = "+append";
    IMCommand["+attenuate"] = "+attenuate";
    IMCommand["-attenuate"] = "-attenuate";
    IMCommand["+authenticate"] = "+authenticate";
    IMCommand["-authenticate"] = "-authenticate";
    IMCommand["-auto-gamma"] = "-auto-gamma";
    IMCommand["-auto-level"] = "-auto-level";
    IMCommand["-auto-orient"] = "-auto-orient";
    IMCommand["-auto-threshold"] = "-auto-threshold";
    IMCommand["+backdrop"] = "+backdrop";
    IMCommand["-backdrop"] = "-backdrop";
    IMCommand["-bench"] = "-bench";
    IMCommand["+bias"] = "+bias";
    IMCommand["-bias"] = "-bias";
    IMCommand["-black-point-compensation"] = "-black-point-compensation";
    IMCommand["+black-point-compensation"] = "+black-point-compensation";
    IMCommand["-black-threshold"] = "-black-threshold";
    IMCommand["+blend"] = "+blend";
    IMCommand["-blend"] = "-blend";
    IMCommand["+blue-primary"] = "+blue-primary";
    IMCommand["-blue-primary"] = "-blue-primary";
    IMCommand["-blue-shift"] = "-blue-shift";
    IMCommand["+blue-shift"] = "+blue-shift";
    IMCommand["-border"] = "-border";
    IMCommand["+bordercolor"] = "+bordercolor";
    IMCommand["-bordercolor"] = "-bordercolor";
    IMCommand["+borderwidth"] = "+borderwidth";
    IMCommand["-borderwidth"] = "-borderwidth";
    IMCommand["-brightness-contrast"] = "-brightness-contrast";
    IMCommand["+cache"] = "+cache";
    IMCommand["-cache"] = "-cache";
    IMCommand["+caption"] = "+caption";
    IMCommand["-caption"] = "-caption";
    IMCommand["-cdl"] = "-cdl";
    IMCommand["+channel"] = "+channel";
    IMCommand["-channel"] = "-channel";
    IMCommand["-channel-fx"] = "-channel-fx";
    IMCommand["-charcoal"] = "-charcoal";
    IMCommand["-chop"] = "-chop";
    IMCommand["-clamp"] = "-clamp";
    IMCommand["-clip"] = "-clip";
    IMCommand["+clip"] = "+clip";
    IMCommand["+clip-mask"] = "+clip-mask";
    IMCommand["-clip-mask"] = "-clip-mask";
    IMCommand["-clip-path"] = "-clip-path";
    IMCommand["+clip-path"] = "+clip-path";
    IMCommand["+clone"] = "+clone";
    IMCommand["-clone"] = "-clone";
    IMCommand["-clut"] = "-clut";
    IMCommand["-coalesce"] = "-coalesce";
    IMCommand["-colorize"] = "-colorize";
    IMCommand["+colormap"] = "+colormap";
    IMCommand["-colormap"] = "-colormap";
    IMCommand["-color-matrix"] = "-color-matrix";
    IMCommand["-colors"] = "-colors";
    IMCommand["+colorspace"] = "+colorspace";
    IMCommand["-colorspace"] = "-colorspace";
    IMCommand["-combine"] = "-combine";
    IMCommand["+combine"] = "+combine";
    IMCommand["+comment"] = "+comment";
    IMCommand["-comment"] = "-comment";
    IMCommand["-compare"] = "-compare";
    IMCommand["-complex"] = "-complex";
    IMCommand["+compose"] = "+compose";
    IMCommand["-compose"] = "-compose";
    IMCommand["-composite"] = "-composite";
    IMCommand["+compress"] = "+compress";
    IMCommand["-compress"] = "-compress";
    IMCommand["-concurrent"] = "-concurrent";
    IMCommand["-connected-components"] = "-connected-components";
    IMCommand["-contrast-stretch"] = "-contrast-stretch";
    IMCommand["-convolve"] = "-convolve";
    IMCommand["-copy"] = "-copy";
    IMCommand["-crop"] = "-crop";
    IMCommand["-cycle"] = "-cycle";
    IMCommand["+debug"] = "+debug";
    IMCommand["-debug"] = "-debug";
    IMCommand["-decipher"] = "-decipher";
    IMCommand["-define"] = "-define";
    IMCommand["+define"] = "+define";
    IMCommand["+delay"] = "+delay";
    IMCommand["-delay"] = "-delay";
    IMCommand["+delete"] = "+delete";
    IMCommand["-delete"] = "-delete";
    IMCommand["+density"] = "+density";
    IMCommand["-density"] = "-density";
    IMCommand["+depth"] = "+depth";
    IMCommand["-depth"] = "-depth";
    IMCommand["+descend"] = "+descend";
    IMCommand["-descend"] = "-descend";
    IMCommand["+deskew"] = "+deskew";
    IMCommand["-deskew"] = "-deskew";
    IMCommand["-despeckle"] = "-despeckle";
    IMCommand["+direction"] = "+direction";
    IMCommand["-direction"] = "-direction";
    IMCommand["+displace"] = "+displace";
    IMCommand["-displace"] = "-displace";
    IMCommand["-display"] = "-display";
    IMCommand["+display"] = "+display";
    IMCommand["+dispose"] = "+dispose";
    IMCommand["-dispose"] = "-dispose";
    IMCommand["+dissimilarity-threshold"] = "+dissimilarity-threshold";
    IMCommand["-dissimilarity-threshold"] = "-dissimilarity-threshold";
    IMCommand["+dissolve"] = "+dissolve";
    IMCommand["-dissolve"] = "-dissolve";
    IMCommand["-distort"] = "-distort";
    IMCommand["+distort"] = "+distort";
    IMCommand["+dither"] = "+dither";
    IMCommand["-dither"] = "-dither";
    IMCommand["-draw"] = "-draw";
    IMCommand["+duplicate"] = "+duplicate";
    IMCommand["-duplicate"] = "-duplicate";
    IMCommand["-duration"] = "-duration";
    IMCommand["+duration"] = "+duration";
    IMCommand["-edge"] = "-edge";
    IMCommand["-emboss"] = "-emboss";
    IMCommand["-encipher"] = "-encipher";
    IMCommand["+encoding"] = "+encoding";
    IMCommand["-encoding"] = "-encoding";
    IMCommand["+endian"] = "+endian";
    IMCommand["-endian"] = "-endian";
    IMCommand["-enhance"] = "-enhance";
    IMCommand["-equalize"] = "-equalize";
    IMCommand["-evaluate"] = "-evaluate";
    IMCommand["-evaluate-sequence"] = "-evaluate-sequence";
    IMCommand["-exit"] = "-exit";
    IMCommand["-extent"] = "-extent";
    IMCommand["+extract"] = "+extract";
    IMCommand["-extract"] = "-extract";
    IMCommand["-family"] = "-family";
    IMCommand["+features"] = "+features";
    IMCommand["-features"] = "-features";
    IMCommand["-fft"] = "-fft";
    IMCommand["+fft"] = "+fft";
    IMCommand["+fill"] = "+fill";
    IMCommand["-fill"] = "-fill";
    IMCommand["+filter"] = "+filter";
    IMCommand["-filter"] = "-filter";
    IMCommand["-flatten"] = "-flatten";
    IMCommand["-flip"] = "-flip";
    IMCommand["-floodfill"] = "-floodfill";
    IMCommand["+floodfill"] = "+floodfill";
    IMCommand["-flop"] = "-flop";
    IMCommand["+font"] = "+font";
    IMCommand["-font"] = "-font";
    IMCommand["+foreground"] = "+foreground";
    IMCommand["-foreground"] = "-foreground";
    IMCommand["-frame"] = "-frame";
    IMCommand["-function"] = "-function";
    IMCommand["+fuzz"] = "+fuzz";
    IMCommand["-fuzz"] = "-fuzz";
    IMCommand["-fx"] = "-fx";
    IMCommand["-gamma"] = "-gamma";
    IMCommand["+gamma"] = "+gamma";
    IMCommand["-gaussian-blur"] = "-gaussian-blur";
    IMCommand["+geometry"] = "+geometry";
    IMCommand["-geometry"] = "-geometry";
    IMCommand["+gravity"] = "+gravity";
    IMCommand["-gravity"] = "-gravity";
    IMCommand["-grayscale"] = "-grayscale";
    IMCommand["+green-primary"] = "+green-primary";
    IMCommand["-green-primary"] = "-green-primary";
    IMCommand["-hald-clut"] = "-hald-clut";
    IMCommand["+highlight-color"] = "+highlight-color";
    IMCommand["-highlight-color"] = "-highlight-color";
    IMCommand["+iconGeometry"] = "+iconGeometry";
    IMCommand["-iconGeometry"] = "-iconGeometry";
    IMCommand["-iconic"] = "-iconic";
    IMCommand["+iconic"] = "+iconic";
    IMCommand["-identify"] = "-identify";
    IMCommand["-ift"] = "-ift";
    IMCommand["+ift"] = "+ift";
    IMCommand["-immutable"] = "-immutable";
    IMCommand["+immutable"] = "+immutable";
    IMCommand["-implode"] = "-implode";
    IMCommand["+insert"] = "+insert";
    IMCommand["-insert"] = "-insert";
    IMCommand["+intensity"] = "+intensity";
    IMCommand["-intensity"] = "-intensity";
    IMCommand["+intent"] = "+intent";
    IMCommand["-intent"] = "-intent";
    IMCommand["+interlace"] = "+interlace";
    IMCommand["-interlace"] = "-interlace";
    IMCommand["+interline-spacing"] = "+interline-spacing";
    IMCommand["-interline-spacing"] = "-interline-spacing";
    IMCommand["+interpolate"] = "+interpolate";
    IMCommand["-interpolate"] = "-interpolate";
    IMCommand["-interpolative-resize"] = "-interpolative-resize";
    IMCommand["+interword-spacing"] = "+interword-spacing";
    IMCommand["-interword-spacing"] = "-interword-spacing";
    IMCommand["+kerning"] = "+kerning";
    IMCommand["-kerning"] = "-kerning";
    IMCommand["-kuwahara"] = "-kuwahara";
    IMCommand["+label"] = "+label";
    IMCommand["-label"] = "-label";
    IMCommand["-lat"] = "-lat";
    IMCommand["-layers"] = "-layers";
    IMCommand["-level"] = "-level";
    IMCommand["+level"] = "+level";
    IMCommand["-level-colors"] = "-level-colors";
    IMCommand["+level-colors"] = "+level-colors";
    IMCommand["-limit"] = "-limit";
    IMCommand["-linear-stretch"] = "-linear-stretch";
    IMCommand["-liquid-rescale"] = "-liquid-rescale";
    IMCommand["-list"] = "-list";
    IMCommand["-local-contrast"] = "-local-contrast";
    IMCommand["+log"] = "+log";
    IMCommand["-log"] = "-log";
    IMCommand["+loop"] = "+loop";
    IMCommand["-loop"] = "-loop";
    IMCommand["+lowlight-color"] = "+lowlight-color";
    IMCommand["-lowlight-color"] = "-lowlight-color";
    IMCommand["-magnify"] = "-magnify";
    IMCommand["+mask"] = "+mask";
    IMCommand["-mask"] = "-mask";
    IMCommand["+metric"] = "+metric";
    IMCommand["-metric"] = "-metric";
    IMCommand["+mode"] = "+mode";
    IMCommand["-modulate"] = "-modulate";
    IMCommand["-moments"] = "-moments";
    IMCommand["+moments"] = "+moments";
    IMCommand["-monitor"] = "-monitor";
    IMCommand["+monitor"] = "+monitor";
    IMCommand["+monochrome"] = "+monochrome";
    IMCommand["-monochrome"] = "-monochrome";
    IMCommand["-morph"] = "-morph";
    IMCommand["-morphology"] = "-morphology";
    IMCommand["-mosaic"] = "-mosaic";
    IMCommand["-motion-blur"] = "-motion-blur";
    IMCommand["+name"] = "+name";
    IMCommand["-name"] = "-name";
    IMCommand["+negate"] = "+negate";
    IMCommand["-negate"] = "-negate";
    IMCommand["-noise"] = "-noise";
    IMCommand["+noise"] = "+noise";
    IMCommand["-noop"] = "-noop";
    IMCommand["-normalize"] = "-normalize";
    IMCommand["-opaque"] = "-opaque";
    IMCommand["+opaque"] = "+opaque";
    IMCommand["-ordered-dither"] = "-ordered-dither";
    IMCommand["+orient"] = "+orient";
    IMCommand["-orient"] = "-orient";
    IMCommand["+page"] = "+page";
    IMCommand["-page"] = "-page";
    IMCommand["-paint"] = "-paint";
    IMCommand["+path"] = "+path";
    IMCommand["-path"] = "-path";
    IMCommand["+pause"] = "+pause";
    IMCommand["-pause"] = "-pause";
    IMCommand["-ping"] = "-ping";
    IMCommand["+ping"] = "+ping";
    IMCommand["+pointsize"] = "+pointsize";
    IMCommand["-pointsize"] = "-pointsize";
    IMCommand["+polaroid"] = "+polaroid";
    IMCommand["-polaroid"] = "-polaroid";
    IMCommand["-poly"] = "-poly";
    IMCommand["-posterize"] = "-posterize";
    IMCommand["+precision"] = "+precision";
    IMCommand["-precision"] = "-precision";
    IMCommand["-preview"] = "-preview";
    IMCommand["-print"] = "-print";
    IMCommand["-process"] = "-process";
    IMCommand["+profile"] = "+profile";
    IMCommand["-profile"] = "-profile";
    IMCommand["+quality"] = "+quality";
    IMCommand["-quality"] = "-quality";
    IMCommand["+quantize"] = "+quantize";
    IMCommand["-quantize"] = "-quantize";
    IMCommand["-raise"] = "-raise";
    IMCommand["+raise"] = "+raise";
    IMCommand["-random-threshold"] = "-random-threshold";
    IMCommand["-range-threshold"] = "-range-threshold";
    IMCommand["-read"] = "-read";
    IMCommand["+read-mask"] = "+read-mask";
    IMCommand["-read-mask"] = "-read-mask";
    IMCommand["+red-primary"] = "+red-primary";
    IMCommand["-red-primary"] = "-red-primary";
    IMCommand["+region"] = "+region";
    IMCommand["-region"] = "-region";
    IMCommand["+remap"] = "+remap";
    IMCommand["-remap"] = "-remap";
    IMCommand["+remote"] = "+remote";
    IMCommand["-remote"] = "-remote";
    IMCommand["-render"] = "-render";
    IMCommand["+render"] = "+render";
    IMCommand["-resample"] = "-resample";
    IMCommand["-respect-parenthesis"] = "-respect-parenthesis";
    IMCommand["+respect-parenthesis"] = "+respect-parenthesis";
    IMCommand["-reverse"] = "-reverse";
    IMCommand["-roll"] = "-roll";
    IMCommand["-rotate"] = "-rotate";
    IMCommand["-rotational-blur"] = "-rotational-blur";
    IMCommand["-sample"] = "-sample";
    IMCommand["+sampling-factor"] = "+sampling-factor";
    IMCommand["-sampling-factor"] = "-sampling-factor";
    IMCommand["-scale"] = "-scale";
    IMCommand["+scene"] = "+scene";
    IMCommand["-scene"] = "-scene";
    IMCommand["+scenes"] = "+scenes";
    IMCommand["-scenes"] = "-scenes";
    IMCommand["+screen"] = "+screen";
    IMCommand["-screen"] = "-screen";
    IMCommand["-script"] = "-script";
    IMCommand["+seed"] = "+seed";
    IMCommand["-seed"] = "-seed";
    IMCommand["-segment"] = "-segment";
    IMCommand["-selective-blur"] = "-selective-blur";
    IMCommand["-separate"] = "-separate";
    IMCommand["-sepia-tone"] = "-sepia-tone";
    IMCommand["+set"] = "+set";
    IMCommand["-set"] = "-set";
    IMCommand["-shade"] = "-shade";
    IMCommand["-shadow"] = "-shadow";
    IMCommand["+shared-memory"] = "+shared-memory";
    IMCommand["-shared-memory"] = "-shared-memory";
    IMCommand["-sharpen"] = "-sharpen";
    IMCommand["-shave"] = "-shave";
    IMCommand["-shear"] = "-shear";
    IMCommand["-sigmoidal-contrast"] = "-sigmoidal-contrast";
    IMCommand["+sigmoidal-contrast"] = "+sigmoidal-contrast";
    IMCommand["+silent"] = "+silent";
    IMCommand["-silent"] = "-silent";
    IMCommand["+similarity-threshold"] = "+similarity-threshold";
    IMCommand["-similarity-threshold"] = "-similarity-threshold";
    IMCommand["-sketch"] = "-sketch";
    IMCommand["-smush"] = "-smush";
    IMCommand["+smush"] = "+smush";
    IMCommand["+snaps"] = "+snaps";
    IMCommand["-snaps"] = "-snaps";
    IMCommand["-solarize"] = "-solarize";
    IMCommand["-sparse-color"] = "-sparse-color";
    IMCommand["-splice"] = "-splice";
    IMCommand["-spread"] = "-spread";
    IMCommand["-statistic"] = "-statistic";
    IMCommand["+stegano"] = "+stegano";
    IMCommand["-stegano"] = "-stegano";
    IMCommand["-stereo"] = "-stereo";
    IMCommand["-stretch"] = "-stretch";
    IMCommand["-strip"] = "-strip";
    IMCommand["+stroke"] = "+stroke";
    IMCommand["-stroke"] = "-stroke";
    IMCommand["-strokewidth"] = "-strokewidth";
    IMCommand["+strokewidth"] = "+strokewidth";
    IMCommand["+style"] = "+style";
    IMCommand["-style"] = "-style";
    IMCommand["-subimage"] = "-subimage";
    IMCommand["-subimage-search"] = "-subimage-search";
    IMCommand["+subimage-search"] = "+subimage-search";
    IMCommand["+swap"] = "+swap";
    IMCommand["-swap"] = "-swap";
    IMCommand["-swirl"] = "-swirl";
    IMCommand["-synchronize"] = "-synchronize";
    IMCommand["+synchronize"] = "+synchronize";
    IMCommand["-taint"] = "-taint";
    IMCommand["+taint"] = "+taint";
    IMCommand["+text-font"] = "+text-font";
    IMCommand["-text-font"] = "-text-font";
    IMCommand["+texture"] = "+texture";
    IMCommand["-texture"] = "-texture";
    IMCommand["+threshold"] = "+threshold";
    IMCommand["-threshold"] = "-threshold";
    IMCommand["-thumbnail"] = "-thumbnail";
    IMCommand["+tile"] = "+tile";
    IMCommand["-tile"] = "-tile";
    IMCommand["+tile-offset"] = "+tile-offset";
    IMCommand["-tile-offset"] = "-tile-offset";
    IMCommand["-tint"] = "-tint";
    IMCommand["+tint"] = "+tint";
    IMCommand["+title"] = "+title";
    IMCommand["-title"] = "-title";
    IMCommand["-transparent"] = "-transparent";
    IMCommand["+transparent"] = "+transparent";
    IMCommand["+transparent-color"] = "+transparent-color";
    IMCommand["-transparent-color"] = "-transparent-color";
    IMCommand["-transpose"] = "-transpose";
    IMCommand["-transverse"] = "-transverse";
    IMCommand["-treedepth"] = "-treedepth";
    IMCommand["-trim"] = "-trim";
    IMCommand["+type"] = "+type";
    IMCommand["-type"] = "-type";
    IMCommand["+undercolor"] = "+undercolor";
    IMCommand["-undercolor"] = "-undercolor";
    IMCommand["-unique"] = "-unique";
    IMCommand["+unique"] = "+unique";
    IMCommand["-unique-colors"] = "-unique-colors";
    IMCommand["+units"] = "+units";
    IMCommand["-units"] = "-units";
    IMCommand["-unsharp"] = "-unsharp";
    IMCommand["+update"] = "+update";
    IMCommand["-update"] = "-update";
    IMCommand["+use-pixmap"] = "+use-pixmap";
    IMCommand["-use-pixmap"] = "-use-pixmap";
    IMCommand["-verbose"] = "-verbose";
    IMCommand["+verbose"] = "+verbose";
    IMCommand["-version"] = "-version";
    IMCommand["+view"] = "+view";
    IMCommand["-view"] = "-view";
    IMCommand["-vignette"] = "-vignette";
    IMCommand["+visual"] = "+visual";
    IMCommand["-visual"] = "-visual";
    IMCommand["+watermark"] = "+watermark";
    IMCommand["-watermark"] = "-watermark";
    IMCommand["-wave"] = "-wave";
    IMCommand["-wavelet-denoise"] = "-wavelet-denoise";
    IMCommand["-weight"] = "-weight";
    IMCommand["+white-point"] = "+white-point";
    IMCommand["-white-point"] = "-white-point";
    IMCommand["-white-threshold"] = "-white-threshold";
    IMCommand["+window"] = "+window";
    IMCommand["-window"] = "-window";
    IMCommand["+window-group"] = "+window-group";
    IMCommand["-window-group"] = "-window-group";
    IMCommand["-write"] = "-write";
    IMCommand["+write"] = "+write";
    IMCommand["+write-mask"] = "+write-mask";
    IMCommand["-write-mask"] = "-write-mask";
})(IMCommand || (IMCommand = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMCompliance;
(function (IMCompliance) {
    IMCompliance["CSS"] = "CSS";
    IMCompliance["MVG"] = "MVG";
    IMCompliance["No"] = "No";
    IMCompliance["SVG"] = "SVG";
    IMCompliance["X11"] = "X11";
    IMCompliance["XPM"] = "XPM";
})(IMCompliance || (IMCompliance = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMComplex;
(function (IMComplex) {
    IMComplex["Add"] = "Add";
    IMComplex["Conjugate"] = "Conjugate";
    IMComplex["Divide"] = "Divide";
    IMComplex["MagnitudePhase"] = "MagnitudePhase";
    IMComplex["Multiply"] = "Multiply";
    IMComplex["RealImaginary"] = "RealImaginary";
    IMComplex["Subtract"] = "Subtract";
})(IMComplex || (IMComplex = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMCompose;
(function (IMCompose) {
    IMCompose["Atop"] = "Atop";
    IMCompose["Blend"] = "Blend";
    IMCompose["Blur"] = "Blur";
    IMCompose["Bumpmap"] = "Bumpmap";
    IMCompose["ChangeMask"] = "ChangeMask";
    IMCompose["Clear"] = "Clear";
    IMCompose["ColorBurn"] = "ColorBurn";
    IMCompose["ColorDodge"] = "ColorDodge";
    IMCompose["Colorize"] = "Colorize";
    IMCompose["CopyAlpha"] = "CopyAlpha";
    IMCompose["CopyBlack"] = "CopyBlack";
    IMCompose["CopyBlue"] = "CopyBlue";
    IMCompose["CopyCyan"] = "CopyCyan";
    IMCompose["CopyGreen"] = "CopyGreen";
    IMCompose["Copy"] = "Copy";
    IMCompose["CopyMagenta"] = "CopyMagenta";
    IMCompose["CopyRed"] = "CopyRed";
    IMCompose["CopyYellow"] = "CopyYellow";
    IMCompose["Darken"] = "Darken";
    IMCompose["DarkenIntensity"] = "DarkenIntensity";
    IMCompose["DivideDst"] = "DivideDst";
    IMCompose["DivideSrc"] = "DivideSrc";
    IMCompose["Dst"] = "Dst";
    IMCompose["Difference"] = "Difference";
    IMCompose["Displace"] = "Displace";
    IMCompose["Dissolve"] = "Dissolve";
    IMCompose["Distort"] = "Distort";
    IMCompose["DstAtop"] = "DstAtop";
    IMCompose["DstIn"] = "DstIn";
    IMCompose["DstOut"] = "DstOut";
    IMCompose["DstOver"] = "DstOver";
    IMCompose["Exclusion"] = "Exclusion";
    IMCompose["HardLight"] = "HardLight";
    IMCompose["HardMix"] = "HardMix";
    IMCompose["Hue"] = "Hue";
    IMCompose["In"] = "In";
    IMCompose["Intensity"] = "Intensity";
    IMCompose["Lighten"] = "Lighten";
    IMCompose["LightenIntensity"] = "LightenIntensity";
    IMCompose["LinearBurn"] = "LinearBurn";
    IMCompose["LinearDodge"] = "LinearDodge";
    IMCompose["LinearLight"] = "LinearLight";
    IMCompose["Luminize"] = "Luminize";
    IMCompose["Mathematics"] = "Mathematics";
    IMCompose["MinusDst"] = "MinusDst";
    IMCompose["MinusSrc"] = "MinusSrc";
    IMCompose["Modulate"] = "Modulate";
    IMCompose["ModulusAdd"] = "ModulusAdd";
    IMCompose["ModulusSubtract"] = "ModulusSubtract";
    IMCompose["Multiply"] = "Multiply";
    IMCompose["None"] = "None";
    IMCompose["Out"] = "Out";
    IMCompose["Overlay"] = "Overlay";
    IMCompose["Over"] = "Over";
    IMCompose["PegtopLight"] = "PegtopLight";
    IMCompose["PinLight"] = "PinLight";
    IMCompose["Plus"] = "Plus";
    IMCompose["Replace"] = "Replace";
    IMCompose["Saturate"] = "Saturate";
    IMCompose["Screen"] = "Screen";
    IMCompose["SoftLight"] = "SoftLight";
    IMCompose["Src"] = "Src";
    IMCompose["SrcAtop"] = "SrcAtop";
    IMCompose["SrcIn"] = "SrcIn";
    IMCompose["SrcOut"] = "SrcOut";
    IMCompose["SrcOver"] = "SrcOver";
    IMCompose["Stereo"] = "Stereo";
    IMCompose["VividLight"] = "VividLight";
    IMCompose["Xor"] = "Xor";
})(IMCompose || (IMCompose = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMCompress;
(function (IMCompress) {
    IMCompress["B44A"] = "B44A";
    IMCompress["B44"] = "B44";
    IMCompress["BZip"] = "BZip";
    IMCompress["DXT1"] = "DXT1";
    IMCompress["DXT3"] = "DXT3";
    IMCompress["DXT5"] = "DXT5";
    IMCompress["Fax"] = "Fax";
    IMCompress["Group4"] = "Group4";
    IMCompress["JBIG1"] = "JBIG1";
    IMCompress["JBIG2"] = "JBIG2";
    IMCompress["JPEG2000"] = "JPEG2000";
    IMCompress["JPEG"] = "JPEG";
    IMCompress["LosslessJPEG"] = "LosslessJPEG";
    IMCompress["Lossless"] = "Lossless";
    IMCompress["LZMA"] = "LZMA";
    IMCompress["LZW"] = "LZW";
    IMCompress["None"] = "None";
    IMCompress["Piz"] = "Piz";
    IMCompress["Pxr24"] = "Pxr24";
    IMCompress["RLE"] = "RLE";
    IMCompress["RunlengthEncoded"] = "RunlengthEncoded";
    IMCompress["WebP"] = "WebP";
    IMCompress["ZipS"] = "ZipS";
    IMCompress["Zip"] = "Zip";
    IMCompress["Zstd"] = "Zstd";
})(IMCompress || (IMCompress = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDataType;
(function (IMDataType) {
    IMDataType["Byte"] = "Byte";
    IMDataType["Long"] = "Long";
    IMDataType["Short"] = "Short";
    IMDataType["String"] = "String";
})(IMDataType || (IMDataType = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDebug;
(function (IMDebug) {
    IMDebug["All"] = "All";
    IMDebug["Accelerate"] = "Accelerate";
    IMDebug["Annotate"] = "Annotate";
    IMDebug["Blob"] = "Blob";
    IMDebug["Cache"] = "Cache";
    IMDebug["Coder"] = "Coder";
    IMDebug["Command"] = "Command";
    IMDebug["Configure"] = "Configure";
    IMDebug["Deprecate"] = "Deprecate";
    IMDebug["Draw"] = "Draw";
    IMDebug["Exception"] = "Exception";
    IMDebug["Locale"] = "Locale";
    IMDebug["Module"] = "Module";
    IMDebug["None"] = "None";
    IMDebug["Pixel"] = "Pixel";
    IMDebug["Policy"] = "Policy";
    IMDebug["Resource"] = "Resource";
    IMDebug["Trace"] = "Trace";
    IMDebug["Transform"] = "Transform";
    IMDebug["User"] = "User";
    IMDebug["Wand"] = "Wand";
    IMDebug["X11"] = "X11";
})(IMDebug || (IMDebug = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDecoration;
(function (IMDecoration) {
    IMDecoration["LineThrough"] = "LineThrough";
    IMDecoration["None"] = "None";
    IMDecoration["Overline"] = "Overline";
    IMDecoration["Underline"] = "Underline";
})(IMDecoration || (IMDecoration = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDirection;
(function (IMDirection) {
    IMDirection["right-to-left"] = "right-to-left";
    IMDirection["left-to-right"] = "left-to-right";
})(IMDirection || (IMDirection = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDispose;
(function (IMDispose) {
    IMDispose["Undefined"] = "Undefined";
    IMDispose["Background"] = "Background";
    IMDispose["None"] = "None";
    IMDispose["Previous"] = "Previous";
    IMDispose["0_"] = "0";
    IMDispose["1_"] = "1";
    IMDispose["2_"] = "2";
    IMDispose["3_"] = "3";
})(IMDispose || (IMDispose = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDistort;
(function (IMDistort) {
    IMDistort["Affine"] = "Affine";
    IMDistort["AffineProjection"] = "AffineProjection";
    IMDistort["ScaleRotateTranslate"] = "ScaleRotateTranslate";
    IMDistort["SRT"] = "SRT";
    IMDistort["Perspective"] = "Perspective";
    IMDistort["PerspectiveProjection"] = "PerspectiveProjection";
    IMDistort["BilinearForward"] = "BilinearForward";
    IMDistort["BilinearReverse"] = "BilinearReverse";
    IMDistort["Polynomial"] = "Polynomial";
    IMDistort["Arc"] = "Arc";
    IMDistort["Polar"] = "Polar";
    IMDistort["DePolar"] = "DePolar";
    IMDistort["Barrel"] = "Barrel";
    IMDistort["BarrelInverse"] = "BarrelInverse";
    IMDistort["Shepards"] = "Shepards";
    IMDistort["Resize"] = "Resize";
})(IMDistort || (IMDistort = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMDither;
(function (IMDither) {
    IMDither["None"] = "None";
    IMDither["FloydSteinberg"] = "FloydSteinberg";
    IMDither["Riemersma"] = "Riemersma";
})(IMDither || (IMDither = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMEndian;
(function (IMEndian) {
    IMEndian["LSB"] = "LSB";
    IMEndian["MSB"] = "MSB";
})(IMEndian || (IMEndian = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMEvaluate;
(function (IMEvaluate) {
    IMEvaluate["Abs"] = "Abs";
    IMEvaluate["Add"] = "Add";
    IMEvaluate["AddModulus"] = "AddModulus";
    IMEvaluate["And"] = "And";
    IMEvaluate["Cos"] = "Cos";
    IMEvaluate["Cosine"] = "Cosine";
    IMEvaluate["Divide"] = "Divide";
    IMEvaluate["Exp"] = "Exp";
    IMEvaluate["Exponential"] = "Exponential";
    IMEvaluate["GaussianNoise"] = "GaussianNoise";
    IMEvaluate["ImpulseNoise"] = "ImpulseNoise";
    IMEvaluate["LaplacianNoise"] = "LaplacianNoise";
    IMEvaluate["LeftShift"] = "LeftShift";
    IMEvaluate["Log"] = "Log";
    IMEvaluate["Max"] = "Max";
    IMEvaluate["Mean"] = "Mean";
    IMEvaluate["Median"] = "Median";
    IMEvaluate["Min"] = "Min";
    IMEvaluate["MultiplicativeNoise"] = "MultiplicativeNoise";
    IMEvaluate["Multiply"] = "Multiply";
    IMEvaluate["Or"] = "Or";
    IMEvaluate["PoissonNoise"] = "PoissonNoise";
    IMEvaluate["Pow"] = "Pow";
    IMEvaluate["RightShift"] = "RightShift";
    IMEvaluate["RMS"] = "RMS";
    IMEvaluate["RootMeanSquare"] = "RootMeanSquare";
    IMEvaluate["Set"] = "Set";
    IMEvaluate["Sin"] = "Sin";
    IMEvaluate["Sine"] = "Sine";
    IMEvaluate["Subtract"] = "Subtract";
    IMEvaluate["Sum"] = "Sum";
    IMEvaluate["Threshold"] = "Threshold";
    IMEvaluate["ThresholdBlack"] = "ThresholdBlack";
    IMEvaluate["ThresholdWhite"] = "ThresholdWhite";
    IMEvaluate["UniformNoise"] = "UniformNoise";
    IMEvaluate["Xor"] = "Xor";
})(IMEvaluate || (IMEvaluate = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMFillRule;
(function (IMFillRule) {
    IMFillRule["Evenodd"] = "Evenodd";
    IMFillRule["NonZero"] = "NonZero";
})(IMFillRule || (IMFillRule = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMFilter;
(function (IMFilter) {
    IMFilter["Bartlett"] = "Bartlett";
    IMFilter["Blackman"] = "Blackman";
    IMFilter["Bohman"] = "Bohman";
    IMFilter["Box"] = "Box";
    IMFilter["Catrom"] = "Catrom";
    IMFilter["Cosine"] = "Cosine";
    IMFilter["Cubic"] = "Cubic";
    IMFilter["Gaussian"] = "Gaussian";
    IMFilter["Hamming"] = "Hamming";
    IMFilter["Hann"] = "Hann";
    IMFilter["Hermite"] = "Hermite";
    IMFilter["Jinc"] = "Jinc";
    IMFilter["Kaiser"] = "Kaiser";
    IMFilter["Lagrange"] = "Lagrange";
    IMFilter["Lanczos"] = "Lanczos";
    IMFilter["Lanczos2"] = "Lanczos2";
    IMFilter["Lanczos2Sharp"] = "Lanczos2Sharp";
    IMFilter["LanczosRadius"] = "LanczosRadius";
    IMFilter["LanczosSharp"] = "LanczosSharp";
    IMFilter["Mitchell"] = "Mitchell";
    IMFilter["Parzen"] = "Parzen";
    IMFilter["Point"] = "Point";
    IMFilter["Quadratic"] = "Quadratic";
    IMFilter["Robidoux"] = "Robidoux";
    IMFilter["RobidouxSharp"] = "RobidouxSharp";
    IMFilter["Sinc"] = "Sinc";
    IMFilter["SincFast"] = "SincFast";
    IMFilter["Spline"] = "Spline";
    IMFilter["CubicSpline"] = "CubicSpline";
    IMFilter["Triangle"] = "Triangle";
    IMFilter["Welch"] = "Welch";
})(IMFilter || (IMFilter = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMFunction;
(function (IMFunction) {
    IMFunction["Polynomial"] = "Polynomial";
    IMFunction["Sinusoid"] = "Sinusoid";
    IMFunction["ArcSin"] = "ArcSin";
    IMFunction["ArcTan"] = "ArcTan";
})(IMFunction || (IMFunction = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMGradient;
(function (IMGradient) {
    IMGradient["Linear"] = "Linear";
    IMGradient["Radial"] = "Radial";
})(IMGradient || (IMGradient = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMGravity;
(function (IMGravity) {
    IMGravity["None"] = "None";
    IMGravity["Center"] = "Center";
    IMGravity["East"] = "East";
    IMGravity["Forget"] = "Forget";
    IMGravity["NorthEast"] = "NorthEast";
    IMGravity["North"] = "North";
    IMGravity["NorthWest"] = "NorthWest";
    IMGravity["SouthEast"] = "SouthEast";
    IMGravity["South"] = "South";
    IMGravity["SouthWest"] = "SouthWest";
    IMGravity["West"] = "West";
})(IMGravity || (IMGravity = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMIntensity;
(function (IMIntensity) {
    IMIntensity["Average"] = "Average";
    IMIntensity["Brightness"] = "Brightness";
    IMIntensity["Lightness"] = "Lightness";
    IMIntensity["Mean"] = "Mean";
    IMIntensity["MS"] = "MS";
    IMIntensity["Rec601Luma"] = "Rec601Luma";
    IMIntensity["Rec601Luminance"] = "Rec601Luminance";
    IMIntensity["Rec709Luma"] = "Rec709Luma";
    IMIntensity["Rec709Luminance"] = "Rec709Luminance";
    IMIntensity["RMS"] = "RMS";
})(IMIntensity || (IMIntensity = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMIntent;
(function (IMIntent) {
    IMIntent["Absolute"] = "Absolute";
    IMIntent["Perceptual"] = "Perceptual";
    IMIntent["Relative"] = "Relative";
    IMIntent["Saturation"] = "Saturation";
})(IMIntent || (IMIntent = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMInterlace;
(function (IMInterlace) {
    IMInterlace["Line"] = "Line";
    IMInterlace["None"] = "None";
    IMInterlace["Plane"] = "Plane";
    IMInterlace["Partition"] = "Partition";
    IMInterlace["GIF"] = "GIF";
    IMInterlace["JPEG"] = "JPEG";
    IMInterlace["PNG"] = "PNG";
})(IMInterlace || (IMInterlace = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMInterpolate;
(function (IMInterpolate) {
    IMInterpolate["Average"] = "Average";
    IMInterpolate["Average4"] = "Average4";
    IMInterpolate["Average9"] = "Average9";
    IMInterpolate["Average16"] = "Average16";
    IMInterpolate["Background"] = "Background";
    IMInterpolate["Bilinear"] = "Bilinear";
    IMInterpolate["Blend"] = "Blend";
    IMInterpolate["Catrom"] = "Catrom";
    IMInterpolate["Integer"] = "Integer";
    IMInterpolate["Mesh"] = "Mesh";
    IMInterpolate["Nearest"] = "Nearest";
    IMInterpolate["Spline"] = "Spline";
})(IMInterpolate || (IMInterpolate = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMKernel;
(function (IMKernel) {
    IMKernel["Unity"] = "Unity";
    IMKernel["Gaussian"] = "Gaussian";
    IMKernel["DoG"] = "DoG";
    IMKernel["LoG"] = "LoG";
    IMKernel["Blur"] = "Blur";
    IMKernel["Comet"] = "Comet";
    IMKernel["Binomial"] = "Binomial";
    IMKernel["Laplacian"] = "Laplacian";
    IMKernel["Sobel"] = "Sobel";
    IMKernel["FreiChen"] = "FreiChen";
    IMKernel["Roberts"] = "Roberts";
    IMKernel["Prewitt"] = "Prewitt";
    IMKernel["Compass"] = "Compass";
    IMKernel["Kirsch"] = "Kirsch";
    IMKernel["Diamond"] = "Diamond";
    IMKernel["Square"] = "Square";
    IMKernel["Rectangle"] = "Rectangle";
    IMKernel["Disk"] = "Disk";
    IMKernel["Octagon"] = "Octagon";
    IMKernel["Plus"] = "Plus";
    IMKernel["Cross"] = "Cross";
    IMKernel["Ring"] = "Ring";
    IMKernel["Peaks"] = "Peaks";
    IMKernel["Edges"] = "Edges";
    IMKernel["Corners"] = "Corners";
    IMKernel["Diagonals"] = "Diagonals";
    IMKernel["LineEnds"] = "LineEnds";
    IMKernel["LineJunctions"] = "LineJunctions";
    IMKernel["Ridges"] = "Ridges";
    IMKernel["ConvexHull"] = "ConvexHull";
    IMKernel["ThinSe"] = "ThinSe";
    IMKernel["Skeleton"] = "Skeleton";
    IMKernel["Chebyshev"] = "Chebyshev";
    IMKernel["Manhattan"] = "Manhattan";
    IMKernel["Octagonal"] = "Octagonal";
    IMKernel["Euclidean"] = "Euclidean";
})(IMKernel || (IMKernel = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMLayers;
(function (IMLayers) {
    IMLayers["Coalesce"] = "Coalesce";
    IMLayers["CompareAny"] = "CompareAny";
    IMLayers["CompareClear"] = "CompareClear";
    IMLayers["CompareOverlay"] = "CompareOverlay";
    IMLayers["Dispose"] = "Dispose";
    IMLayers["Optimize"] = "Optimize";
    IMLayers["OptimizeFrame"] = "OptimizeFrame";
    IMLayers["OptimizePlus"] = "OptimizePlus";
    IMLayers["OptimizeTransparency"] = "OptimizeTransparency";
    IMLayers["RemoveDups"] = "RemoveDups";
    IMLayers["RemoveZero"] = "RemoveZero";
    IMLayers["Composite"] = "Composite";
    IMLayers["Merge"] = "Merge";
    IMLayers["Flatten"] = "Flatten";
    IMLayers["Mosaic"] = "Mosaic";
    IMLayers["TrimBounds"] = "TrimBounds";
})(IMLayers || (IMLayers = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMLineCap;
(function (IMLineCap) {
    IMLineCap["Butt"] = "Butt";
    IMLineCap["Round"] = "Round";
    IMLineCap["Square"] = "Square";
})(IMLineCap || (IMLineCap = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMLineJoin;
(function (IMLineJoin) {
    IMLineJoin["Bevel"] = "Bevel";
    IMLineJoin["Miter"] = "Miter";
    IMLineJoin["Round"] = "Round";
})(IMLineJoin || (IMLineJoin = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMList;
(function (IMList) {
    IMList["Align"] = "Align";
    IMList["Alpha"] = "Alpha";
    IMList["AutoThreshold"] = "AutoThreshold";
    IMList["Boolean"] = "Boolean";
    IMList["Cache"] = "Cache";
    IMList["Channel"] = "Channel";
    IMList["Class"] = "Class";
    IMList["CLI"] = "CLI";
    IMList["ClipPath"] = "ClipPath";
    IMList["Coder"] = "Coder";
    IMList["Color"] = "Color";
    IMList["Colorspace"] = "Colorspace";
    IMList["Command"] = "Command";
    IMList["Compliance"] = "Compliance";
    IMList["Complex"] = "Complex";
    IMList["Compose"] = "Compose";
    IMList["Compress"] = "Compress";
    IMList["Configure"] = "Configure";
    IMList["DataType"] = "DataType";
    IMList["Debug"] = "Debug";
    IMList["Decoration"] = "Decoration";
    IMList["Delegate"] = "Delegate";
    IMList["Direction"] = "Direction";
    IMList["Dispose"] = "Dispose";
    IMList["Distort"] = "Distort";
    IMList["Dither"] = "Dither";
    IMList["Endian"] = "Endian";
    IMList["Evaluate"] = "Evaluate";
    IMList["FillRule"] = "FillRule";
    IMList["Filter"] = "Filter";
    IMList["Font"] = "Font";
    IMList["Format"] = "Format";
    IMList["Function"] = "Function";
    IMList["Gradient"] = "Gradient";
    IMList["Gravity"] = "Gravity";
    IMList["Intensity"] = "Intensity";
    IMList["Intent"] = "Intent";
    IMList["Interlace"] = "Interlace";
    IMList["Interpolate"] = "Interpolate";
    IMList["Kernel"] = "Kernel";
    IMList["Layers"] = "Layers";
    IMList["LineCap"] = "LineCap";
    IMList["LineJoin"] = "LineJoin";
    IMList["List"] = "List";
    IMList["Locale"] = "Locale";
    IMList["LogEvent"] = "LogEvent";
    IMList["Log"] = "Log";
    IMList["Magic"] = "Magic";
    IMList["Method"] = "Method";
    IMList["Metric"] = "Metric";
    IMList["Mime"] = "Mime";
    IMList["Mode"] = "Mode";
    IMList["Morphology"] = "Morphology";
    IMList["Module"] = "Module";
    IMList["Noise"] = "Noise";
    IMList["Orientation"] = "Orientation";
    IMList["PixelChannel"] = "PixelChannel";
    IMList["PixelIntensity"] = "PixelIntensity";
    IMList["PixelMask"] = "PixelMask";
    IMList["PixelTrait"] = "PixelTrait";
    IMList["Policy"] = "Policy";
    IMList["PolicyDomain"] = "PolicyDomain";
    IMList["PolicyRights"] = "PolicyRights";
    IMList["Preview"] = "Preview";
    IMList["Primitive"] = "Primitive";
    IMList["QuantumFormat"] = "QuantumFormat";
    IMList["Resource"] = "Resource";
    IMList["SparseColor"] = "SparseColor";
    IMList["Statistic"] = "Statistic";
    IMList["Storage"] = "Storage";
    IMList["Stretch"] = "Stretch";
    IMList["Style"] = "Style";
    IMList["Threshold"] = "Threshold";
    IMList["Tool"] = "Tool";
    IMList["Type"] = "Type";
    IMList["Units"] = "Units";
    IMList["Validate"] = "Validate";
    IMList["VirtualPixel"] = "VirtualPixel";
    IMList["Weight"] = "Weight";
})(IMList || (IMList = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMLogEvent;
(function (IMLogEvent) {
    IMLogEvent["All"] = "All";
    IMLogEvent["Accelerate"] = "Accelerate";
    IMLogEvent["Annotate"] = "Annotate";
    IMLogEvent["Blob"] = "Blob";
    IMLogEvent["Cache"] = "Cache";
    IMLogEvent["Coder"] = "Coder";
    IMLogEvent["Command"] = "Command";
    IMLogEvent["Configure"] = "Configure";
    IMLogEvent["Deprecate"] = "Deprecate";
    IMLogEvent["Draw"] = "Draw";
    IMLogEvent["Exception"] = "Exception";
    IMLogEvent["Locale"] = "Locale";
    IMLogEvent["Module"] = "Module";
    IMLogEvent["None"] = "None";
    IMLogEvent["Pixel"] = "Pixel";
    IMLogEvent["Policy"] = "Policy";
    IMLogEvent["Resource"] = "Resource";
    IMLogEvent["Trace"] = "Trace";
    IMLogEvent["Transform"] = "Transform";
    IMLogEvent["User"] = "User";
    IMLogEvent["Wand"] = "Wand";
    IMLogEvent["X11"] = "X11";
})(IMLogEvent || (IMLogEvent = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMLog;
(function (IMLog) {
    IMLog["Path: /etc/ImageMagick-7/log.xml"] = "Path: /etc/ImageMagick-7/log.xml";
    IMLog["Console        Generations     Limit  Format"] = "Console        Generations     Limit  Format";
    IMLog["-------------------------------------------------------------------------------"] = "-------------------------------------------------------------------------------";
    IMLog["Magick-%g.log            3      2000   %t %r %u %v %d %c[%p]: %m/%f/%l/%d\n  %e"] = "Magick-%g.log            3      2000   %t %r %u %v %d %c[%p]: %m/%f/%l/%d\n  %e";
    IMLog["Path: [built-in]"] = "Path: [built-in]";
    IMLog["Magick-%g.log            0         0   %t %r %u %v %d %c[%p]: %m/%f/%l/%d\n  %e"] = "Magick-%g.log            0         0   %t %r %u %v %d %c[%p]: %m/%f/%l/%d\n  %e";
})(IMLog || (IMLog = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMMethod;
(function (IMMethod) {
    IMMethod["FillToBorder"] = "FillToBorder";
    IMMethod["Floodfill"] = "Floodfill";
    IMMethod["Point"] = "Point";
    IMMethod["Replace"] = "Replace";
    IMMethod["Reset"] = "Reset";
})(IMMethod || (IMMethod = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMMetric;
(function (IMMetric) {
    IMMetric["AE"] = "AE";
    IMMetric["DSSIM"] = "DSSIM";
    IMMetric["Fuzz"] = "Fuzz";
    IMMetric["MAE"] = "MAE";
    IMMetric["MEPP"] = "MEPP";
    IMMetric["MSE"] = "MSE";
    IMMetric["NCC"] = "NCC";
    IMMetric["PAE"] = "PAE";
    IMMetric["PHASH"] = "PHASH";
    IMMetric["PSNR"] = "PSNR";
    IMMetric["RMSE"] = "RMSE";
    IMMetric["SSIM"] = "SSIM";
})(IMMetric || (IMMetric = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMMode;
(function (IMMode) {
    IMMode["Concatenate"] = "Concatenate";
    IMMode["Frame"] = "Frame";
    IMMode["Unframe"] = "Unframe";
})(IMMode || (IMMode = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMMorphology;
(function (IMMorphology) {
    IMMorphology["Correlate"] = "Correlate";
    IMMorphology["Convolve"] = "Convolve";
    IMMorphology["Dilate"] = "Dilate";
    IMMorphology["Erode"] = "Erode";
    IMMorphology["Close"] = "Close";
    IMMorphology["Open"] = "Open";
    IMMorphology["DilateIntensity"] = "DilateIntensity";
    IMMorphology["ErodeIntensity"] = "ErodeIntensity";
    IMMorphology["CloseIntensity"] = "CloseIntensity";
    IMMorphology["OpenIntensity"] = "OpenIntensity";
    IMMorphology["DilateI"] = "DilateI";
    IMMorphology["ErodeI"] = "ErodeI";
    IMMorphology["CloseI"] = "CloseI";
    IMMorphology["OpenI"] = "OpenI";
    IMMorphology["Smooth"] = "Smooth";
    IMMorphology["EdgeOut"] = "EdgeOut";
    IMMorphology["EdgeIn"] = "EdgeIn";
    IMMorphology["Edge"] = "Edge";
    IMMorphology["TopHat"] = "TopHat";
    IMMorphology["BottomHat"] = "BottomHat";
    IMMorphology["Hmt"] = "Hmt";
    IMMorphology["HitNMiss"] = "HitNMiss";
    IMMorphology["HitAndMiss"] = "HitAndMiss";
    IMMorphology["Thinning"] = "Thinning";
    IMMorphology["Thicken"] = "Thicken";
    IMMorphology["Distance"] = "Distance";
    IMMorphology["IterativeDistance"] = "IterativeDistance";
})(IMMorphology || (IMMorphology = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMModule;
(function (IMModule) {
    IMModule["Path: /usr/lib/ImageMagick-7.0.8/modules-Q16HDRI/coders"] = "Path: /usr/lib/ImageMagick-7.0.8/modules-Q16HDRI/coders";
    IMModule["Image Coder"] = "Image Coder";
    IMModule["-------------------------------------------------------------------------------"] = "-------------------------------------------------------------------------------";
    IMModule["aai"] = "aai";
    IMModule["art"] = "art";
    IMModule["avs"] = "avs";
    IMModule["bgr"] = "bgr";
    IMModule["bmp"] = "bmp";
    IMModule["braille"] = "braille";
    IMModule["cals"] = "cals";
    IMModule["caption"] = "caption";
    IMModule["cin"] = "cin";
    IMModule["cip"] = "cip";
    IMModule["clip"] = "clip";
    IMModule["cmyk"] = "cmyk";
    IMModule["cut"] = "cut";
    IMModule["dcm"] = "dcm";
    IMModule["dds"] = "dds";
    IMModule["debug"] = "debug";
    IMModule["dib"] = "dib";
    IMModule["dng"] = "dng";
    IMModule["dot"] = "dot";
    IMModule["dpx"] = "dpx";
    IMModule["ept"] = "ept";
    IMModule["exr"] = "exr";
    IMModule["fax"] = "fax";
    IMModule["fits"] = "fits";
    IMModule["gif"] = "gif";
    IMModule["gradient"] = "gradient";
    IMModule["gray"] = "gray";
    IMModule["hald"] = "hald";
    IMModule["hdr"] = "hdr";
    IMModule["heic"] = "heic";
    IMModule["histogram"] = "histogram";
    IMModule["hrz"] = "hrz";
    IMModule["html"] = "html";
    IMModule["icon"] = "icon";
    IMModule["info"] = "info";
    IMModule["inline"] = "inline";
    IMModule["ipl"] = "ipl";
    IMModule["jbig"] = "jbig";
    IMModule["jnx"] = "jnx";
    IMModule["jp2"] = "jp2";
    IMModule["jpeg"] = "jpeg";
    IMModule["json"] = "json";
    IMModule["label"] = "label";
    IMModule["mac"] = "mac";
    IMModule["magick"] = "magick";
    IMModule["map"] = "map";
    IMModule["mask"] = "mask";
    IMModule["mat"] = "mat";
    IMModule["matte"] = "matte";
    IMModule["meta"] = "meta";
    IMModule["miff"] = "miff";
    IMModule["mono"] = "mono";
    IMModule["mpc"] = "mpc";
    IMModule["mpeg"] = "mpeg";
    IMModule["mpr"] = "mpr";
    IMModule["msl"] = "msl";
    IMModule["mtv"] = "mtv";
    IMModule["mvg"] = "mvg";
    IMModule["null"] = "null";
    IMModule["otb"] = "otb";
    IMModule["palm"] = "palm";
    IMModule["pango"] = "pango";
    IMModule["pattern"] = "pattern";
    IMModule["pcd"] = "pcd";
    IMModule["pcl"] = "pcl";
    IMModule["pcx"] = "pcx";
    IMModule["pdb"] = "pdb";
    IMModule["pdf"] = "pdf";
    IMModule["pes"] = "pes";
    IMModule["pgx"] = "pgx";
    IMModule["pict"] = "pict";
    IMModule["pix"] = "pix";
    IMModule["plasma"] = "plasma";
    IMModule["png"] = "png";
    IMModule["pnm"] = "pnm";
    IMModule["ps"] = "ps";
    IMModule["ps2"] = "ps2";
    IMModule["ps3"] = "ps3";
    IMModule["psd"] = "psd";
    IMModule["pwp"] = "pwp";
    IMModule["raw"] = "raw";
    IMModule["rgb"] = "rgb";
    IMModule["rgf"] = "rgf";
    IMModule["rla"] = "rla";
    IMModule["rle"] = "rle";
    IMModule["scr"] = "scr";
    IMModule["sct"] = "sct";
    IMModule["sfw"] = "sfw";
    IMModule["sgi"] = "sgi";
    IMModule["sixel"] = "sixel";
    IMModule["stegano"] = "stegano";
    IMModule["sun"] = "sun";
    IMModule["svg"] = "svg";
    IMModule["tga"] = "tga";
    IMModule["thumbnail"] = "thumbnail";
    IMModule["tiff"] = "tiff";
    IMModule["tile"] = "tile";
    IMModule["tim"] = "tim";
    IMModule["ttf"] = "ttf";
    IMModule["txt"] = "txt";
    IMModule["uil"] = "uil";
    IMModule["url"] = "url";
    IMModule["uyvy"] = "uyvy";
    IMModule["vicar"] = "vicar";
    IMModule["vid"] = "vid";
    IMModule["viff"] = "viff";
    IMModule["vips"] = "vips";
    IMModule["wbmp"] = "wbmp";
    IMModule["webp"] = "webp";
    IMModule["wmf"] = "wmf";
    IMModule["wpg"] = "wpg";
    IMModule["x"] = "x";
    IMModule["xbm"] = "xbm";
    IMModule["xc"] = "xc";
    IMModule["xcf"] = "xcf";
    IMModule["xpm"] = "xpm";
    IMModule["xps"] = "xps";
    IMModule["xtrn"] = "xtrn";
    IMModule["xwd"] = "xwd";
    IMModule["ycbcr"] = "ycbcr";
    IMModule["yuv"] = "yuv";
    IMModule["Path: /usr/lib/ImageMagick-7.0.8/modules-Q16HDRI/filters"] = "Path: /usr/lib/ImageMagick-7.0.8/modules-Q16HDRI/filters";
    IMModule["Image Filter"] = "Image Filter";
    IMModule["analyze"] = "analyze";
})(IMModule || (IMModule = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMNoise;
(function (IMNoise) {
    IMNoise["Gaussian"] = "Gaussian";
    IMNoise["Impulse"] = "Impulse";
    IMNoise["Laplacian"] = "Laplacian";
    IMNoise["Multiplicative"] = "Multiplicative";
    IMNoise["Poisson"] = "Poisson";
    IMNoise["Random"] = "Random";
    IMNoise["Uniform"] = "Uniform";
})(IMNoise || (IMNoise = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMOrientation;
(function (IMOrientation) {
    IMOrientation["TopLeft"] = "TopLeft";
    IMOrientation["TopRight"] = "TopRight";
    IMOrientation["BottomRight"] = "BottomRight";
    IMOrientation["BottomLeft"] = "BottomLeft";
    IMOrientation["LeftTop"] = "LeftTop";
    IMOrientation["RightTop"] = "RightTop";
    IMOrientation["RightBottom"] = "RightBottom";
    IMOrientation["LeftBottom"] = "LeftBottom";
})(IMOrientation || (IMOrientation = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPixelChannel;
(function (IMPixelChannel) {
    IMPixelChannel["Undefined"] = "Undefined";
    IMPixelChannel["A"] = "A";
    IMPixelChannel["Alpha"] = "Alpha";
    IMPixelChannel["B"] = "B";
    IMPixelChannel["Bk"] = "Bk";
    IMPixelChannel["Black"] = "Black";
    IMPixelChannel["Blue"] = "Blue";
    IMPixelChannel["Cb"] = "Cb";
    IMPixelChannel["Composite"] = "Composite";
    IMPixelChannel["CompositeMask"] = "CompositeMask";
    IMPixelChannel["C"] = "C";
    IMPixelChannel["Cr"] = "Cr";
    IMPixelChannel["Cyan"] = "Cyan";
    IMPixelChannel["Gray"] = "Gray";
    IMPixelChannel["G"] = "G";
    IMPixelChannel["Green"] = "Green";
    IMPixelChannel["Index"] = "Index";
    IMPixelChannel["Intensity"] = "Intensity";
    IMPixelChannel["K"] = "K";
    IMPixelChannel["M"] = "M";
    IMPixelChannel["Magenta"] = "Magenta";
    IMPixelChannel["Meta"] = "Meta";
    IMPixelChannel["O"] = "O";
    IMPixelChannel["R"] = "R";
    IMPixelChannel["ReadMask"] = "ReadMask";
    IMPixelChannel["Red"] = "Red";
    IMPixelChannel["Sync"] = "Sync";
    IMPixelChannel["WriteMask"] = "WriteMask";
    IMPixelChannel["Y"] = "Y";
    IMPixelChannel["Yellow"] = "Yellow";
})(IMPixelChannel || (IMPixelChannel = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPixelIntensity;
(function (IMPixelIntensity) {
    IMPixelIntensity["Average"] = "Average";
    IMPixelIntensity["Brightness"] = "Brightness";
    IMPixelIntensity["Lightness"] = "Lightness";
    IMPixelIntensity["Mean"] = "Mean";
    IMPixelIntensity["MS"] = "MS";
    IMPixelIntensity["Rec601Luma"] = "Rec601Luma";
    IMPixelIntensity["Rec601Luminance"] = "Rec601Luminance";
    IMPixelIntensity["Rec709Luma"] = "Rec709Luma";
    IMPixelIntensity["Rec709Luminance"] = "Rec709Luminance";
    IMPixelIntensity["RMS"] = "RMS";
})(IMPixelIntensity || (IMPixelIntensity = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPixelMask;
(function (IMPixelMask) {
    IMPixelMask["R"] = "R";
    IMPixelMask["Read"] = "Read";
    IMPixelMask["W"] = "W";
    IMPixelMask["Write"] = "Write";
})(IMPixelMask || (IMPixelMask = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPixelTrait;
(function (IMPixelTrait) {
    IMPixelTrait["Blend"] = "Blend";
    IMPixelTrait["Copy"] = "Copy";
    IMPixelTrait["Update"] = "Update";
})(IMPixelTrait || (IMPixelTrait = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPolicyDomain;
(function (IMPolicyDomain) {
    IMPolicyDomain["Cache"] = "Cache";
    IMPolicyDomain["Coder"] = "Coder";
    IMPolicyDomain["Delegate"] = "Delegate";
    IMPolicyDomain["Filter"] = "Filter";
    IMPolicyDomain["Module"] = "Module";
    IMPolicyDomain["Path"] = "Path";
    IMPolicyDomain["Resource"] = "Resource";
    IMPolicyDomain["System"] = "System";
})(IMPolicyDomain || (IMPolicyDomain = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPolicyRights;
(function (IMPolicyRights) {
    IMPolicyRights["All"] = "All";
    IMPolicyRights["Execute"] = "Execute";
    IMPolicyRights["None"] = "None";
    IMPolicyRights["Read"] = "Read";
    IMPolicyRights["Write"] = "Write";
})(IMPolicyRights || (IMPolicyRights = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPreview;
(function (IMPreview) {
    IMPreview["AddNoise"] = "AddNoise";
    IMPreview["Blur"] = "Blur";
    IMPreview["Brightness"] = "Brightness";
    IMPreview["Charcoal"] = "Charcoal";
    IMPreview["Despeckle"] = "Despeckle";
    IMPreview["Dull"] = "Dull";
    IMPreview["EdgeDetect"] = "EdgeDetect";
    IMPreview["Gamma"] = "Gamma";
    IMPreview["Grayscale"] = "Grayscale";
    IMPreview["Hue"] = "Hue";
    IMPreview["Implode"] = "Implode";
    IMPreview["JPEG"] = "JPEG";
    IMPreview["OilPaint"] = "OilPaint";
    IMPreview["Quantize"] = "Quantize";
    IMPreview["Raise"] = "Raise";
    IMPreview["ReduceNoise"] = "ReduceNoise";
    IMPreview["Roll"] = "Roll";
    IMPreview["Rotate"] = "Rotate";
    IMPreview["Saturation"] = "Saturation";
    IMPreview["Segment"] = "Segment";
    IMPreview["Shade"] = "Shade";
    IMPreview["Sharpen"] = "Sharpen";
    IMPreview["Shear"] = "Shear";
    IMPreview["Solarize"] = "Solarize";
    IMPreview["Spiff"] = "Spiff";
    IMPreview["Spread"] = "Spread";
    IMPreview["Swirl"] = "Swirl";
    IMPreview["Threshold"] = "Threshold";
    IMPreview["Wave"] = "Wave";
})(IMPreview || (IMPreview = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMPrimitive;
(function (IMPrimitive) {
    IMPrimitive["Alpha"] = "Alpha";
    IMPrimitive["Arc"] = "Arc";
    IMPrimitive["Bezier"] = "Bezier";
    IMPrimitive["Circle"] = "Circle";
    IMPrimitive["Color"] = "Color";
    IMPrimitive["Ellipse"] = "Ellipse";
    IMPrimitive["Image"] = "Image";
    IMPrimitive["Line"] = "Line";
    IMPrimitive["Matte"] = "Matte";
    IMPrimitive["Path"] = "Path";
    IMPrimitive["Point"] = "Point";
    IMPrimitive["Polygon"] = "Polygon";
    IMPrimitive["Polyline"] = "Polyline";
    IMPrimitive["Rectangle"] = "Rectangle";
    IMPrimitive["RoundRectangle"] = "RoundRectangle";
    IMPrimitive["Text"] = "Text";
})(IMPrimitive || (IMPrimitive = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMQuantumFormat;
(function (IMQuantumFormat) {
    IMQuantumFormat["FloatingPoint"] = "FloatingPoint";
    IMQuantumFormat["Signed"] = "Signed";
    IMQuantumFormat["Unsigned"] = "Unsigned";
})(IMQuantumFormat || (IMQuantumFormat = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMSparseColor;
(function (IMSparseColor) {
    IMSparseColor["Barycentric"] = "Barycentric";
    IMSparseColor["Bilinear"] = "Bilinear";
    IMSparseColor["Inverse"] = "Inverse";
    IMSparseColor["Shepards"] = "Shepards";
    IMSparseColor["Voronoi"] = "Voronoi";
    IMSparseColor["Manhattan"] = "Manhattan";
})(IMSparseColor || (IMSparseColor = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMStatistic;
(function (IMStatistic) {
    IMStatistic["Gradient"] = "Gradient";
    IMStatistic["Maximum"] = "Maximum";
    IMStatistic["Mean"] = "Mean";
    IMStatistic["Median"] = "Median";
    IMStatistic["Minimum"] = "Minimum";
    IMStatistic["Mode"] = "Mode";
    IMStatistic["NonPeak"] = "NonPeak";
    IMStatistic["RootMeanSquare"] = "RootMeanSquare";
    IMStatistic["RMS"] = "RMS";
    IMStatistic["StandardDeviation"] = "StandardDeviation";
})(IMStatistic || (IMStatistic = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMStorage;
(function (IMStorage) {
    IMStorage["Char"] = "Char";
    IMStorage["Double"] = "Double";
    IMStorage["Float"] = "Float";
    IMStorage["Long"] = "Long";
    IMStorage["LongLong"] = "LongLong";
    IMStorage["Quantum"] = "Quantum";
    IMStorage["Short"] = "Short";
})(IMStorage || (IMStorage = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMStretch;
(function (IMStretch) {
    IMStretch["Any"] = "Any";
    IMStretch["Condensed"] = "Condensed";
    IMStretch["Expanded"] = "Expanded";
    IMStretch["ExtraCondensed"] = "ExtraCondensed";
    IMStretch["ExtraExpanded"] = "ExtraExpanded";
    IMStretch["Normal"] = "Normal";
    IMStretch["SemiCondensed"] = "SemiCondensed";
    IMStretch["SemiExpanded"] = "SemiExpanded";
    IMStretch["UltraCondensed"] = "UltraCondensed";
    IMStretch["UltraExpanded"] = "UltraExpanded";
})(IMStretch || (IMStretch = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMStyle;
(function (IMStyle) {
    IMStyle["Any"] = "Any";
    IMStyle["Bold"] = "Bold";
    IMStyle["Italic"] = "Italic";
    IMStyle["Normal"] = "Normal";
    IMStyle["Oblique"] = "Oblique";
})(IMStyle || (IMStyle = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMTool;
(function (IMTool) {
    IMTool["animate"] = "animate";
    IMTool["compare"] = "compare";
    IMTool["composite"] = "composite";
    IMTool["conjure"] = "conjure";
    IMTool["convert"] = "convert";
    IMTool["display"] = "display";
    IMTool["identify"] = "identify";
    IMTool["import"] = "import";
    IMTool["mogrify"] = "mogrify";
    IMTool["montage"] = "montage";
    IMTool["stream"] = "stream";
})(IMTool || (IMTool = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMType;
(function (IMType) {
    IMType["Bilevel"] = "Bilevel";
    IMType["ColorSeparation"] = "ColorSeparation";
    IMType["ColorSeparationAlpha"] = "ColorSeparationAlpha";
    IMType["ColorSeparationMatte"] = "ColorSeparationMatte";
    IMType["Grayscale"] = "Grayscale";
    IMType["GrayscaleAlpha"] = "GrayscaleAlpha";
    IMType["GrayscaleMatte"] = "GrayscaleMatte";
    IMType["Optimize"] = "Optimize";
    IMType["Palette"] = "Palette";
    IMType["PaletteBilevelAlpha"] = "PaletteBilevelAlpha";
    IMType["PaletteBilevelMatte"] = "PaletteBilevelMatte";
    IMType["PaletteAlpha"] = "PaletteAlpha";
    IMType["PaletteMatte"] = "PaletteMatte";
    IMType["TrueColorAlpha"] = "TrueColorAlpha";
    IMType["TrueColorMatte"] = "TrueColorMatte";
    IMType["TrueColor"] = "TrueColor";
})(IMType || (IMType = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMUnits;
(function (IMUnits) {
    IMUnits["PixelsPerInch"] = "PixelsPerInch";
    IMUnits["PixelsPerCentimeter"] = "PixelsPerCentimeter";
    IMUnits["1_"] = "1";
    IMUnits["2_"] = "2";
    IMUnits["3_"] = "3";
})(IMUnits || (IMUnits = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMValidate;
(function (IMValidate) {
    IMValidate["All"] = "All";
    IMValidate["Colorspace"] = "Colorspace";
    IMValidate["Compare"] = "Compare";
    IMValidate["Composite"] = "Composite";
    IMValidate["Convert"] = "Convert";
    IMValidate["FormatsDisk"] = "FormatsDisk";
    IMValidate["FormatsMap"] = "FormatsMap";
    IMValidate["FormatsMemory"] = "FormatsMemory";
    IMValidate["Identify"] = "Identify";
    IMValidate["ImportExport"] = "ImportExport";
    IMValidate["Montage"] = "Montage";
    IMValidate["Stream"] = "Stream";
    IMValidate["None"] = "None";
})(IMValidate || (IMValidate = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMVirtualPixel;
(function (IMVirtualPixel) {
    IMVirtualPixel["Background"] = "Background";
    IMVirtualPixel["Black"] = "Black";
    IMVirtualPixel["CheckerTile"] = "CheckerTile";
    IMVirtualPixel["Dither"] = "Dither";
    IMVirtualPixel["Edge"] = "Edge";
    IMVirtualPixel["Gray"] = "Gray";
    IMVirtualPixel["HorizontalTile"] = "HorizontalTile";
    IMVirtualPixel["HorizontalTileEdge"] = "HorizontalTileEdge";
    IMVirtualPixel["Mirror"] = "Mirror";
    IMVirtualPixel["None"] = "None";
    IMVirtualPixel["Random"] = "Random";
    IMVirtualPixel["Tile"] = "Tile";
    IMVirtualPixel["Transparent"] = "Transparent";
    IMVirtualPixel["VerticalTile"] = "VerticalTile";
    IMVirtualPixel["VerticalTileEdge"] = "VerticalTileEdge";
    IMVirtualPixel["White"] = "White";
})(IMVirtualPixel || (IMVirtualPixel = {}));

/* auto-generated file using command `npx ts-node scripts/generateImEnums.ts` */
var IMWeight;
(function (IMWeight) {
    IMWeight["Thin"] = "Thin";
    IMWeight["ExtraLight"] = "ExtraLight";
    IMWeight["UltraLight"] = "UltraLight";
    IMWeight["Normal"] = "Normal";
    IMWeight["Regular"] = "Regular";
    IMWeight["Medium"] = "Medium";
    IMWeight["DemiBold"] = "DemiBold";
    IMWeight["SemiBold"] = "SemiBold";
    IMWeight["Bold"] = "Bold";
    IMWeight["ExtraBold"] = "ExtraBold";
    IMWeight["UltraBold"] = "UltraBold";
    IMWeight["Heavy"] = "Heavy";
    IMWeight["Black"] = "Black";
})(IMWeight || (IMWeight = {}));

export { executeOne$$1 as executeOne, isExecuteCommand$$1 as isExecuteCommand, asExecuteConfig$$1 as asExecuteConfig, executeAndReturnOutputFile$$1 as executeAndReturnOutputFile, addExecuteListener$$1 as addExecuteListener, execute$$1 as execute, createImageHome$$1 as createImageHome, newExecutionContext$$1 as newExecutionContext, Call, call, arrayToCli, cliToArray, asCommand, blobToString, isInputFile, isOutputFile, readFileAsText, isImage, buildInputFile, asInputFile, asOutputFile, getFileName, getFileNameExtension, loadImageElement$$1 as loadImageElement, buildImageSrc$$1 as buildImageSrc, getInputFilesFromHtmlInputElement$$1 as getInputFilesFromHtmlInputElement, getPixelColor$$1 as getPixelColor, builtInImageNames$$1 as builtInImageNames, getBuiltInImages$$1 as getBuiltInImages, getBuiltInImage$$1 as getBuiltInImage, compare$$1 as compare, compareNumber$$1 as compareNumber, extractInfo$$1 as extractInfo, getConfigureFolders$$1 as getConfigureFolders, knownSupportedReadWriteImageFormats$$1 as knownSupportedReadWriteImageFormats, IMAlign, IMAlpha, IMAutoThreshold, IMBoolean, IMCache, IMChannel, IMClass, IMClipPath, IMColorspace, IMCommand, IMCompliance, IMComplex, IMCompose, IMCompress, IMDataType, IMDebug, IMDecoration, IMDirection, IMDispose, IMDistort, IMDither, IMEndian, IMEvaluate, IMFillRule, IMFilter, IMFunction, IMGradient, IMGravity, IMIntensity, IMIntent, IMInterlace, IMInterpolate, IMKernel, IMLayers, IMLineCap, IMLineJoin, IMList, IMLogEvent, IMLog, IMMethod, IMMetric, IMMode, IMMorphology, IMModule, IMNoise, IMOrientation, IMPixelChannel, IMPixelIntensity, IMPixelMask, IMPixelTrait, IMPolicyDomain, IMPolicyRights, IMPreview, IMPrimitive, IMQuantumFormat, IMSparseColor, IMStatistic, IMStorage, IMStretch, IMStyle, IMTool, IMType, IMUnits, IMValidate, IMVirtualPixel, IMWeight };
//# sourceMappingURL=wasm-imagemagick.esm-es2018.js.map
