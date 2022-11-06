import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';

const imageProvider = new NullImageProvider();

test('MeshSubject', async t => {
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
		.addPrimitive(primDef);

	const documentView = await new DocumentView().init(document, {imageProvider});
	const mesh = documentView.view(meshDef);

	t.equals(mesh.name, 'MyMesh', 'mesh → name');

	meshDef.setName('MyMeshRenamed');
	t.equals(mesh.name, 'MyMeshRenamed', 'mesh → name (2)');

	t.equals(mesh.children[0].type, 'Mesh', 'mesh → prim (initial)');

	meshDef.removePrimitive(primDef);
	t.equals(mesh.children.length, 0, 'mesh → prim (remove)');

	meshDef.addPrimitive(primDef);
	t.equals(mesh.children.length, 1, 'mesh → prim (add)');

	t.end();
});
