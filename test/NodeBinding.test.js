import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';

test('NodeBinding', t => {
	const document = new Document();
	const nodeDef1 = document.createNode('Node1')
		.setTranslation([0, 2, 0])
		.setRotation([0, 0, .707, .707])
		.setScale([0.5, 0.5, 0.5])
		.addChild(document.createNode('Node2').setTranslation([5, 0, 0]));

	const renderer = new GLTFRenderer(document);
	const node1 = renderer.render(nodeDef1);

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
