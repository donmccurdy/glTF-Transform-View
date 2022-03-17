import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';

test('MeshBinding', t => {
	const document = new Document();
	const position = document.createAccessor()
		.setType('VEC3')
		.setArray(new Float32Array([
			0, 0, 0,
			0, 0, 1,
			0, 1, 1,
			0, 1, 0,
			0, 0, 0,
		]));
	const primDef = document.createPrimitive()
		.setAttribute('POSITION', position);
	const meshDef = document.createMesh()
		.setName('MyMesh')
		.addPrimitive(primDef)
	const nodeDef = document.createNode()
		.setName('MyNode')
		.setMesh(meshDef);
	const sceneDef = document.createScene('MyScene')
		.addChild(nodeDef);

	const renderer = new GLTFRenderer(document);
	const scene = renderer.render(sceneDef);

	t.equals(scene.name, 'MyScene');
	t.equals(scene.children[0].name, 'MyNode', 'scene → node');
	t.equals(scene.children[0].children[0].name, 'MyMesh', 'scene → node → mesh');
	t.equals(scene.children[0].children[0].children[0].type, 'Mesh', 'scene → node → mesh → prim');

	meshDef.setName('MyMeshRenamed');
	renderer.update(sceneDef);
	t.equals(scene.children[0].children[0].name, 'MyMeshRenamed', 'rename mesh');

	meshDef.removePrimitive(primDef);
	renderer.update(sceneDef);
	t.equals(scene.children[0].children[0].children.length, 0, 'remove prim');

	meshDef.addPrimitive(primDef);
	renderer.update(sceneDef);
	t.equals(scene.children[0].children[0].children.length, 1, 'add prim');

	t.end();
});
