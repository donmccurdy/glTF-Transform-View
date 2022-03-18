import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';

test('SceneBinding', t => {
	const document = new Document();
	let nodeDef;
	const sceneDef = document.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild(nodeDef = document.createNode('Node2'))
		.addChild(document.createNode('Node3'));

	const renderer = new GLTFRenderer(document);
	const scene = renderer.render(sceneDef);

	t.equals(scene.name, 'MyScene', 'scene → name');
	sceneDef.setName('MySceneRenamed');
	t.equals(scene.name, 'MySceneRenamed', 'scene → name (renamed)');
	t.equals(scene.children.length, 3, 'scene → children → 3');

	nodeDef.dispose();
	t.equals(scene.children.length, 2, 'scene → children → 2');

	t.end();
});
