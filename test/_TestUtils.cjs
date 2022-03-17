require('source-map-support').install();

global.Blob = class Blob {
	constructor (data, options) {
		this.data = data;
		this.options = options;
	}
};

global.URL = class URL {
	static nextID = 1;
	static createObjectURL(object) {
		return `mock/url/${this.nextID++}`;
	}
	static revokeObjectURL() {}
};

global.document = {
	createElement: (tagName) => {
		return {tagName};
	}
};
