import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, UnsignedByteType, WebGLRenderer, sRGBEncoding } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Document, Material } from '@gltf-transform/core';
import { DocumentRenderer } from '../dist/render.modern.js';
import { createMaterialPane } from './material-pane';

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

window.addEventListener('resize', onWindowResize);

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

const doc = (() => {
	const doc = new Document();
	material = doc.createMaterial('Material');
	const prim = doc.createPrimitive()
		.setAttribute('POSITION', doc.createAccessor('p').setType('VEC3').setArray(new Float32Array([
			0, 0, 0,
			1, 0, 0,
			0, 1, 0,
			1, 1, 0,
			0, 1, 0,
			1, 0, 0,
		])))
		.setAttribute('NORMAL', doc.createAccessor('p').setType('VEC3').setArray(new Float32Array([
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
		])))
		.setMaterial(material);
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode().setMesh(mesh).setTranslation([-0.5, -0.5, 0]);
	doc.createScene().addChild(node);
	return doc;
})();

const documentRenderer = new DocumentRenderer(doc);
const model = documentRenderer.toObject3D();
scene.add(model);

//

const pane = createMaterialPane(doc, material);

let needsUpdate = false;
pane.on('change', () => (needsUpdate = true));

//

animate();

//

function animate() {
	requestAnimationFrame(animate);

	if (needsUpdate) {
		console.time('DocumentRenderer::update');
		documentRenderer.update(material);
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