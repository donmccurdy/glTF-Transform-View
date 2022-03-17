import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer, NullImageProvider } from '../dist/render.modern.js';

test('MaterialBinding', t => {
	const document = new Document();
	const texDef1 = document.createTexture('Tex1')
		.setMimeType('image/png')
		.setImage(new Uint8Array(0));
	const texDef2 = document.createTexture('Tex2')
		.setMimeType('image/png')
		.setImage(new Uint8Array(0));
	const materialDef = document.createMaterial('Material')
		.setBaseColorTexture(texDef1)
		.setEmissiveTexture(texDef2);
	const primDef = document.createPrimitive().setMaterial(materialDef);
	const meshDef = document.createMesh('Mesh').addPrimitive(primDef);
	const nodeDef = document.createNode('Node').setMesh(meshDef);
	const sceneDef = document.createScene('Scene').addChild(nodeDef);

	const renderer = new GLTFRenderer(document).setImageProvider(new NullImageProvider());
	const scene = renderer.render(sceneDef);
	let mesh = scene.children[0].children[0].children[0];
	let material = mesh.material;

	t.equals(material.name, 'Material', 'material.name → Material');
	t.equals(material.type, 'MeshStandardMaterial', 'material.type → MeshStandardMaterial');
	t.ok(material.map, 'material.map → ok');
	t.ok(material.emissiveMap, 'material.emissiveMap → ok');

	texDef1.dispose();
	renderer.update(materialDef);
	mesh = scene.children[0].children[0].children[0];
	material = mesh.material;

	t.notOk(material.map, 'material.map → null');
	t.ok(material.emissiveMap, 'material.emissiveMap → ok');
	t.end();
});
