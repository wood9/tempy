"use strict";

const fs = require("fs");
const path = require("path");
const uniqueString = require("unique-string");
const tempDir = require("temp-dir");
const isStream = require("is-stream");
const rmfr = require("rmfr");
const stream = require("stream");
const { promisify } = require("util");

const pipeline = promisify(stream.pipeline);
const { writeFile } = fs.promises;

const getPath = (prefix = "") => path.join(tempDir, prefix + uniqueString());

const writeStream = async (filePath, data) => pipeline(data, fs.createWriteStream(filePath));

const createTask = (tempyFunction, { extraArguments = 0 } = {}) => async (...arguments_) => {
	const [callback, options] = arguments_.slice(extraArguments);
	const result = await tempyFunction(...arguments_.slice(0, extraArguments), options);
	const returnValue = await callback(result);
	await rmfr(result);

	return returnValue;
};

module.exports.file = options => {
	options = {
		...options
	};

	if (options.name) {
		if (options.extension !== undefined && options.extension !== null) {
			throw new Error("The `name` and `extension` options are mutually exclusive");
		}

		return path.join(module.exports.directory(), options.name);
	}

	return (
		getPath() +
		(options.extension === undefined || options.extension === null ? "" : "." + options.extension.replace(/^\./, ""))
	);
};

module.exports.file.task = createTask(module.exports.file);

module.exports.directory = ({ prefix = "" } = {}) => {
	const directory = getPath(prefix);
	fs.mkdirSync(directory);
	return directory;
};

module.exports.directory.task = createTask(module.exports.directory);

module.exports.write = async (data, options) => {
	const filename = module.exports.file(options);
	const write = isStream(data) ? writeStream : writeFile;
	await write(filename, data);
	return filename;
};

module.exports.write.task = createTask(module.exports.write, { extraArguments: 1 });

module.exports.writeSync = (data, options) => {
	const filename = module.exports.file(options);
	fs.writeFileSync(filename, data);
	return filename;
};

Object.defineProperty(module.exports, "root", {
	get() {
		return tempDir;
	}
});
