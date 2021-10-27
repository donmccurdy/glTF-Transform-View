import { REVISION, WebGLRenderer } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

const TRANSCODER_PATH = `https://unpkg.com/three@0.${REVISION}.x/examples/js/libs/basis/`;
export const KTX2_LOADER = (() => {
	const renderer = new WebGLRenderer();
	const loader = new KTX2Loader()
		.detectSupport(renderer)
		.setTranscoderPath(TRANSCODER_PATH);
	renderer.dispose();
	return loader;
})();
