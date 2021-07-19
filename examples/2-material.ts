import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, UnsignedByteType, WebGLRenderer, sRGBEncoding, TorusKnotBufferGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Document, Material } from '@gltf-transform/core';
import { DocumentRenderer } from '../dist/render.modern.js';
import { createMaterialPane } from './material-pane';
import { createStatsPane } from './stats-pane.js';

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
camera.position.set(-4, 1.2, 5.4);
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
	const primTemplate = new TorusKnotBufferGeometry(1, 0.4, 100, 16);
	const indicesArray = primTemplate.index.array as Uint16Array;
	const positionArray = primTemplate.attributes.position.array as Float32Array;
	const normalArray = primTemplate.attributes.normal.array as Float32Array;
	const texcoordArray = primTemplate.attributes.uv.array as Float32Array;
	const prim = doc.createPrimitive()
		.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indicesArray))
		.setAttribute('POSITION', doc.createAccessor('p').setType('VEC3').setArray(positionArray))
		.setAttribute('NORMAL', doc.createAccessor('n').setType('VEC3').setArray(normalArray))
		.setAttribute('TEXCOORD_0', doc.createAccessor('t').setType('VEC2').setArray(texcoordArray))
		.setMaterial(material);
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode().setMesh(mesh);
	doc.createScene().addChild(node);
	return doc;
})();

const documentRenderer = new DocumentRenderer(doc);
const model = documentRenderer.toObject3D();
scene.add(model);

//

const pane = createMaterialPane(doc, material);
const updateStats = createStatsPane(renderer, pane);

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