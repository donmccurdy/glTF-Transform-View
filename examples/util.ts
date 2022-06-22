import { PMREMGenerator, REVISION, Texture, WebGLRenderer } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const TRANSCODER_PATH = `https://unpkg.com/three@0.${REVISION}.x/examples/js/libs/basis/`;

// Use a single KTX2Loader instance to pool Web Workers.
export function createKTX2Loader() {
	const renderer = new WebGLRenderer();
	const loader = new KTX2Loader()
		.detectSupport(renderer)
		.setTranscoderPath(TRANSCODER_PATH);
	renderer.dispose();
	return loader;
}

export function createEnvironment(renderer: WebGLRenderer): Promise<Texture> {
	const pmremGenerator = new PMREMGenerator(renderer);
	pmremGenerator.compileEquirectangularShader();

	return new Promise((resolve, reject) => {
		new RGBELoader()
			.load( './royal_esplanade_1k.hdr', ( texture ) => {
				const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
				texture.dispose();
				pmremGenerator.dispose();
				resolve(envMap);
			}, undefined, reject );
	}) as Promise<Texture>;
}
