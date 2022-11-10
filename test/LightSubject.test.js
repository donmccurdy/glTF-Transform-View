import test from 'tape';
import { Document } from '@gltf-transform/core';
import { Light as LightDef, LightsPunctual } from '@gltf-transform/extensions';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';

const imageProvider = new NullImageProvider();

test('LightSubject | point', async t => {
	const document = new Document();
	const lightExt = document.createExtension(LightsPunctual);
	const lightDef = lightExt.createLight('MyLight')
		.setColor([1, 0, 0])
		.setIntensity(2000)
		.setRange(100)
		.setType(LightDef.Type.POINT);
	const nodeDef = document.createNode('Node')
		.setExtension('KHR_lights_punctual', lightDef)

	const documentView = new DocumentView(document, {imageProvider});
	const node = documentView.view(nodeDef);
	const light = node.children[0];

	t.equals(light.name, 'MyLight', 'node → light → name');
	t.equals(light.type, 'PointLight', 'node → light → type');
	t.equals(light.intensity, 2000, 'node → light → intensity');
	t.equals(light.distance, 100, 'node → light → range');
	t.deepEqual(light.color.toArray(), [1, 0, 0], 'node → light → color');
	t.end();
});

test('LightSubject | spot', async t => {
	const document = new Document();
	const lightExt = document.createExtension(LightsPunctual);
	const lightDef = lightExt.createLight('MyLight')
		.setColor([1, 1, 0])
		.setIntensity(2000)
		.setRange(null)
		.setInnerConeAngle(Math.PI / 4)
		.setOuterConeAngle(Math.PI / 2)
		.setType(LightDef.Type.SPOT);
	const nodeDef = document.createNode('Node')
		.setExtension('KHR_lights_punctual', lightDef)

	const documentView = new DocumentView(document, {imageProvider});
	const node = documentView.view(nodeDef);
	const light = node.children[0];

	// TODO(bug): Weird warning on this one???
	t.equals(light.name, 'MyLight', 'node → light → name');
	t.equals(light.type, 'SpotLight', 'node → light → type');
	t.equals(light.intensity, 2000, 'node → light → intensity');
	t.equals(light.distance, 0, 'node → light → range');
	t.equals(light.angle, Math.PI / 2, 'node → light → angle');
	t.equals(light.penumbra, 1.0 - (Math.PI / 4) / (Math.PI / 2), 'node → light → penumbra');
	t.deepEqual(light.color.toArray(), [1, 1, 0], 'node → light → color');
	t.end();
});

test('LightSubject | directional', async t => {
	const document = new Document();
	const lightExt = document.createExtension(LightsPunctual);
	const lightDef = lightExt.createLight('MyLight')
		.setColor([1, 1, 1])
		.setIntensity(1.5)
		.setType(LightDef.Type.DIRECTIONAL);
	const nodeDef = document.createNode('Node')
		.setExtension('KHR_lights_punctual', lightDef)

	const documentView = new DocumentView(document, {imageProvider});
	const node = documentView.view(nodeDef);
	const light = node.children[0];

	t.equals(light.name, 'MyLight', 'node → light → name');
	t.equals(light.type, 'DirectionalLight', 'node → light → type');
	t.equals(light.intensity, 1.5, 'node → light → intensity');
	t.deepEqual(light.color.toArray(), [1, 1, 1], 'node → light → color');
	t.end();
});
