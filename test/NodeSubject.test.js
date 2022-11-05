import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';

test('NodeSubject', t => {
	const document = new Document();
	const nodeDef1 = document.createNode('Node1')
		.setTranslation([0, 2, 0])
		.setRotation([0, 0, .707, .707])
		.setScale([0.5, 0.5, 0.5])
		.addChild(document.createNode('Node2').setTranslation([5, 0, 0]));

	const documentView = new DocumentView(document);
	const node1 = documentView.view(nodeDef1);

	t.equals(node1.name, 'Node1', 'node1 → name');
	t.equals(node1.children.length, 1, 'node1 → children');
	t.deepEquals(node1.position.toArray(), [0, 2, 0], 'node1 → position');
	t.deepEquals(node1.quaternion.toArray(), [0, 0, .707, .707], 'node1 → quaternion');
	t.deepEquals(node1.scale.toArray(), [0.5, 0.5, 0.5], 'node1 → scale');

	const node2 = node1.children[0];
	t.equals(node2.name, 'Node2', 'node2 → name');
	t.equals(node2.children.length, 0, 'node2 → children');
	t.deepEquals(node2.position.toArray(), [5, 0, 0], 'node2 → position');
	t.deepEquals(node2.quaternion.toArray(), [0, 0, 0, 1], 'node2 → quaternion');
	t.deepEquals(node2.scale.toArray(), [1, 1, 1], 'node2 → scale');

	nodeDef1
		.setName('RenamedNode')
		.setTranslation([0, 0, 0,]);

	t.equals(node1.name, 'RenamedNode', 'node1 → name');
	t.deepEquals(node1.position.toArray(), [0, 0, 0], 'node1 → position');

	t.end();
});

test('NodeSubject | update in place', t => {
	const document = new Document();
	const meshDef = document.createMesh().setName('Mesh.v1')
	const nodeDef1 = document.createNode('Node1').setMesh(meshDef);
	const nodeDef2 = document.createNode('Node2').setMesh(meshDef).addChild(nodeDef1);
	const sceneDef = document.createScene().addChild(nodeDef2);

	const documentView = new DocumentView(document);
	const scene = documentView.view(sceneDef);
	const node1 = documentView.view(nodeDef1);
	const node2 = documentView.view(nodeDef2);
	const mesh = node1.children[0];

	t.ok(scene, 'scene ok');
	t.ok(node1, 'node1 ok');
	t.ok(node2, 'node2 ok');
	t.ok(mesh, 'mesh ok');

	t.equals(scene.children[0], node2, 'node2 view');
	t.equals(scene.children[0].children[0], node1, 'node1 view');
	t.equals(scene.children[0].children[0].children[0], mesh, 'mesh view');

	nodeDef1.setScale([2, 2, 2]);
	nodeDef2.setScale([3, 3, 3]);

	t.equals(scene.children[0], node2, 'node2 view after update');
	t.equals(scene.children[0].children[0], node1, 'node1 view after update');
	t.equals(scene.children[0].children[0].children[0], mesh, 'mesh view');

	t.deepEquals(node1.scale.toArray([]), [2, 2, 2], 'node1 scale');
	t.deepEquals(node2.scale.toArray([]), [3, 3, 3], 'node2 scale');

	t.ok(node1.children.some((o) => o.name === 'Mesh.v1'), 'node1.mesh.name');
	t.ok(node2.children.some((o) => o.name === 'Mesh.v1'), 'node2.mesh.name');
	meshDef.setName('Mesh.v2');
	t.ok(node1.children.some((o) => o.name === 'Mesh.v2'), 'node1.mesh.name');
	t.ok(node2.children.some((o) => o.name === 'Mesh.v2'), 'node2.mesh.name');

	t.end();
});
