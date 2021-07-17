import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, UnsignedByteType, WebGLRenderer, sRGBEncoding } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { WebIO } from '@gltf-transform/core';
import { MaterialsClearcoat, MaterialsUnlit } from '@gltf-transform/extensions';
import { DocumentRenderer } from './dist/render.modern.js';

const renderer = new WebGLRenderer({antialias: true});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const containerEl = document.querySelector('#container');
containerEl.appendChild(renderer.domElement);

const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const scene = new Scene();

const light1 = new AmbientLight();
const light2 = new DirectionalLight();
light2.position.set(1, 2, 3);
scene.add(light1, light2);

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
camera.position.set(-1.8, 0.6, 2.7);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', render);
controls.minDistance = 2;
controls.maxDistance = 10;
controls.target.set(0, 0, - 0.2);
controls.update();

window.addEventListener( 'resize', onWindowResize );

//

new RGBELoader()
	.setDataType( UnsignedByteType )
	.load( 'assets/royal_esplanade_1k.hdr', ( texture ) => {
		const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
		scene.background = envMap;
		scene.environment = envMap;

		texture.dispose();
		pmremGenerator.dispose();
	} );

//

let mat;
let needsUpdate = false;
let documentRenderer;

const io = new WebIO();
io.read('./assets/DamagedHelmet.glb').then(async (doc) => {
	console.time('DocumentRenderer::init');
	documentRenderer = new DocumentRenderer(doc);
	console.timeEnd('DocumentRenderer::init');

	window.doc = doc;
	window.model = documentRenderer.toObject3D();

	scene.add(model);
	animate();

	// GUI - Testing.
	const params = {
		baseColor: 0x808080,
		alpha: 1,
		alphaMode: 'OPAQUE',
		emissive: 0x000000,
		roughness: 1,
		metalness: 1,
		clearcoat: 0,
		model: 'STANDARD'
	};
	const pane = new Tweakpane.Pane({title: 'DamagedHelmet.glb'});
	mat = doc.getRoot().listMaterials().pop();
	pane.addInput(params, 'baseColor', {view: 'color'})
		.on('change', () => mat.setBaseColorHex(params.baseColor));
	pane.addInput(params, 'alpha', {min: 0, max: 1})
		.on('change', () => mat.setAlpha(params.alpha));
	pane.addInput(params, 'alphaMode', {options: {opaque: 'OPAQUE', blend: 'BLEND', mask: 'MASK'}})
		.on('change', () => mat.setAlphaMode(params.alphaMode));
	pane.addInput(params, 'emissive', {view: 'color'})
		.on('change', () => mat.setEmissiveHex(params.emissive));
	pane.addInput(params, 'roughness', {min: 0, max: 1})
		.on('change', () => mat.setRoughnessFactor(params.roughness));
	pane.addInput(params, 'metalness', {min: 0, max: 1})
		.on('change', () => mat.setMetallicFactor(params.metalness));
	pane.addInput(params, 'clearcoat', {min: 0, max: 1})
		.on('change', () => {
			let clearcoat = mat.getExtension('KHR_materials_clearcoat');
			if (params.clearcoat > 0) {
				if (!clearcoat) {
					clearcoat = doc.createExtension(MaterialsClearcoat).createClearcoat();
					mat.setExtension('KHR_materials_clearcoat', clearcoat);
				}
				clearcoat.setClearcoatFactor(params.clearcoat);
			} else {
				if (clearcoat) clearcoat.dispose();
			}
		});
	pane.addInput(params, 'model', {options: {standard: 'STANDARD', unlit: 'UNLIT'}})
		.on('change', () => {
			mat.listExtensions().forEach((ext) => ext.dispose());
			switch (params.model) {
				case 'UNLIT':
					mat.setExtension(
						'KHR_materials_unlit',
						doc.createExtension(MaterialsUnlit).createUnlit()
					);
					break;
			}
		});
	pane.on('change', () => (needsUpdate = true));
});

//

function animate() {
	requestAnimationFrame(animate);

	if (needsUpdate) {
		console.time('DocumentRenderer::update');
		// documentRenderer.updateAll();
		documentRenderer.update(mat);
		console.timeEnd('DocumentRenderer::update');
		needsUpdate = false;
	}

	render();
}

function render() {
	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}
