import test from 'tape';
import { Document, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';
import { MaterialsClearcoat, MaterialsUnlit } from '@gltf-transform/extensions';

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

	const documentView = new DocumentView(document);
	const scene = documentView.view(sceneDef);
	let mesh = scene.children[0].children[0].children[0];
	let material = mesh.material;

	t.equals(material.name, 'Material', 'material.name → Material');
	t.equals(material.type, 'MeshStandardMaterial', 'material.type → MeshStandardMaterial');
	t.ok(material.map, 'material.map → ok');
	t.ok(material.emissiveMap, 'material.emissiveMap → ok');

	texDef1.dispose();
	mesh = scene.children[0].children[0].children[0];
	material = mesh.material;

	t.notOk(material.map, 'material.map → null');
	t.ok(material.emissiveMap, 'material.emissiveMap → ok');
	t.end();
});

test('MaterialBinding | extensions', t => {
	const document = new Document();
	const unlitExtension = document.createExtension(MaterialsUnlit);
	const clearcoatExtension = document.createExtension(MaterialsClearcoat);

	const materialDef = document.createMaterial('Material')
	const documentView = new DocumentView(document);
	let material = documentView.view(materialDef);

	t.equals(material.type, 'MeshStandardMaterial', 'MeshStandardMaterial');

	materialDef.setExtension('KHR_materials_unlit', unlitExtension.createUnlit());
	material = documentView.view(materialDef);

	t.equals(material.type, 'MeshBasicMaterial', 'MeshBasicMaterial');

	materialDef.setExtension('KHR_materials_unlit', null);
	material = documentView.view(materialDef);

	t.equals(material.type, 'MeshStandardMaterial', 'MeshStandardMaterial');

	materialDef.setExtension('KHR_materials_clearcoat', clearcoatExtension.createClearcoat());
	material = documentView.view(materialDef);

	t.equals(material.type, 'MeshPhysicalMaterial', 'MeshPhysicalMaterial');

	t.end();
});

test('MaterialBinding | dispose', t => {
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
	const meshPrimDef = document.createPrimitive()
		.setMode(PrimitiveDef.Mode.TRIANGLES)
		.setMaterial(materialDef);
	const pointsPrimDef = document.createPrimitive()
		.setMode(PrimitiveDef.Mode.POINTS)
		.setMaterial(materialDef);
	const meshDef = document.createMesh('Mesh')
		.addPrimitive(meshPrimDef)
		.addPrimitive(pointsPrimDef);
	const sceneDef = document.createScene('Scene').addChild(
		document.createNode('Node').setMesh(meshDef)
	);

	const documentView = new DocumentView(document);
	const scene = documentView.view(sceneDef);
	const [mesh, points] = scene.getObjectByName('Mesh').children;
	const meshMaterial = mesh.material;
	const pointsMaterial = points.material;

	const disposed = new Set();
	meshMaterial.addEventListener('dispose', () => disposed.add(meshMaterial));
	pointsMaterial.addEventListener('dispose', () => disposed.add(pointsMaterial));

	t.equals(disposed.size, 0, 'initial values');
	t.equals(meshMaterial.type, 'MeshStandardMaterial', 'creates MeshStandardMaterial');
	t.equals(pointsMaterial.type, 'PointsMaterial', 'creates PointsMaterial');

	meshPrimDef.setMaterial(null);
	documentView.gc();

	t.equals(disposed.size, 1, 'dispose count (1/3)');
	t.ok(disposed.has(meshMaterial), 'dispose MeshStandardMaterial');

	pointsPrimDef.setMode(PrimitiveDef.Mode.LINES);
	documentView.gc();

	t.equals(disposed.size, 2, 'dispose count (2/3)');
	t.ok(disposed.has(pointsMaterial), 'dispose PointsMaterial');

	const [_, lines] = scene.getObjectByName('Mesh').children;
	const lineMaterial = lines.material;
	lineMaterial.addEventListener('dispose', () => disposed.add(lineMaterial));

	t.equals(lineMaterial.type, 'LineBasicMaterial', 'creates LineBasicMaterial');

	materialDef.dispose();
	documentView.gc();

	t.equals(disposed.size, 3, 'dispose count (3/3)');
	t.ok(disposed.has(pointsMaterial), 'dispose LineBasicMaterial');

	t.end();
});

test('MaterialBinding | texture memory', t => {
	const document = new Document();
	const clearcoatExtension = document.createExtension(MaterialsClearcoat);
	const texDef1 = document.createTexture('Tex1')
		.setMimeType('image/png')
		.setImage(new Uint8Array(0));
	const texDef2 = document.createTexture('Tex2')
		.setMimeType('image/png')
		.setImage(new Uint8Array(0));
	const materialDef = document.createMaterial('Material')
		.setBaseColorTexture(texDef1)
		.setEmissiveTexture(texDef2);

	const documentView = new DocumentView(document);
	let material = documentView.view(materialDef);
	const {map, emissiveMap} = material;

	t.equals(material.type, 'MeshStandardMaterial', 'original material');
	t.ok(map.source === emissiveMap.source, 'map.source === emissiveMap.source');

	let baseVersion = map.version;
	t.equals(map.version, baseVersion, 'map.version');
	t.equals(emissiveMap.version, baseVersion, 'emissiveMap.version');

	materialDef.setExtension('KHR_materials_clearcoat', clearcoatExtension.createClearcoat());
	material = documentView.view(materialDef);

	t.equals(material.type, 'MeshPhysicalMaterial', 'new material');
	t.ok(map.source === emissiveMap.source, 'map.source === emissiveMap.source');
	t.equals(map.version, baseVersion, 'map.version');
	t.equals(emissiveMap.version, baseVersion, 'emissiveMap.version');

	t.end();
});
