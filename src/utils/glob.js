const { glob } = require('glob');

const findFilesByPattern = async (pattern, options) => {
    const defaultOptions = {
        cwd: process.cwd(),
        nodir: true,
        dot: true,
    };
    const globOptions = { ...defaultOptions, ...options };
    return glob(pattern, globOptions);
};

module.exports = {
    findFilesByPattern,
};