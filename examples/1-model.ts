import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, UnsignedByteType, WebGLRenderer, sRGBEncoding } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTF, Material, WebIO } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';
import {Pane} from 'tweakpane';
import * as TweakpanePluginThumbnailList from 'tweakpane-plugin-thumbnail-list';
import { createStatsPane } from './stats-pane.js';
import { createMaterialPane } from './material-pane.js';

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
	.load( '../assets/royal_esplanade_1k.hdr', ( texture ) => {
		const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
		scene.background = envMap;
		scene.environment = envMap;

		texture.dispose();
		pmremGenerator.dispose();
	} );

//

let material: Material;
let needsUpdate = false;
let modelRenderer: GLTFRenderer;

const pane = new Pane({title: 'DamagedHelmet.glb'});
pane.registerPlugin(TweakpanePluginThumbnailList);
const updateStats = createStatsPane(renderer, pane);



const io = new WebIO();
io.read('../assets/DamagedHelmet.glb').then(async (doc) => {
	console.time('GLTFRenderer::init');
	modelRenderer = new GLTFRenderer(doc);
	console.timeEnd('GLTFRenderer::init');

	window['doc'] = doc;
	const modelDef = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
	const model = window['model'] = modelRenderer.render(modelDef);

	scene.add(model);
	animate();

	// GUI.

	material = doc.getRoot().listMaterials().pop();
	const materialFolder = createMaterialPane(pane, doc, material);
	materialFolder.on('change', () => (needsUpdate = true));

	const prim = doc.getRoot().listMeshes().pop().listPrimitives().pop();
	const primFolder = pane.addFolder({title: 'Primitive'});
	primFolder.addInput({mode: 4}, 'mode', {
		options: {
			POINTS: 0,
			LINES: 1,
			TRIANGLES: 4,
		}
	}).on('change', (ev) => {
		prim.setMode(ev.value as GLTF.MeshPrimitiveMode);
		modelRenderer.update(prim);
	});
});

//

function animate() {
	requestAnimationFrame(animate);

	if (needsUpdate) {
		console.time('GLTFRenderer::update');
		modelRenderer.update(material);
		console.timeEnd('GLTFRenderer::update');

		needsUpdate = false;
	}

	render();
	updateStats();
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
