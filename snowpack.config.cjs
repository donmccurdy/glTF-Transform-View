// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	exclude: [
		'**/node_modules/**/*',
		'**/.git/**/*',
		'**/src/**/*', // watch dist/, not src/.
	]
};
