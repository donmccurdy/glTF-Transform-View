import test from 'tape';
import { LinearEncoding, sRGBEncoding } from 'three';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';

const imageProvider = new NullImageProvider();

test('TextureBinding', async t => {
	const document = new Document();
	const textureDef = document.createTexture('MyTexture')
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtras({textureExtras: true});
	const materialDef = document.createMaterial()
		.setBaseColorTexture(textureDef)
		.setMetallicRoughnessTexture(textureDef);

	const documentView = await new DocumentView().init(document, {imageProvider});
	const texture = documentView.view(textureDef);
	const material = documentView.view(materialDef);
	const {map, metalnessMap, roughnessMap} = material;

	t.ok(texture, 'texture');
	t.equals(map.encoding, sRGBEncoding, 'sRGB');
	t.equals(roughnessMap.encoding, LinearEncoding, 'Linear-sRGB');
	t.equals(metalnessMap.encoding, LinearEncoding, 'Linear-sRGB');
	t.ok(map.source === metalnessMap.source, 'map.source === metalnessMap.source');
	t.ok(metalnessMap === roughnessMap, 'metalnessMap === roughnessMap');
	t.notOk(texture.flipY || map.flipY || roughnessMap.flipY || metalnessMap.flipY, 'flipY=false');

	const disposed = new Set();
	texture.addEventListener('dispose', () => disposed.add(texture));
	map.addEventListener('dispose', () => disposed.add(map));
	metalnessMap.addEventListener('dispose', () => disposed.add(metalnessMap));
	roughnessMap.addEventListener('dispose', () => disposed.add(roughnessMap));

	materialDef.setBaseColorTexture(null);
	documentView.gc();

	t.equals(disposed.size, 1, 'dispose count (1/3)');
	t.ok(disposed.has(map), 'dispose map');

	materialDef.dispose();
	documentView.gc();

	t.equals(disposed.size, 2, 'dispose count (2/3)');
	t.ok(disposed.has(map), 'dispose roughnessMap, metalnessMap');

	textureDef.dispose();
	documentView.gc();

	t.equals(disposed.size, 3, 'dispose count (3/3)');
	t.ok(disposed.has(texture), 'dispose roughnessMap, metalnessMap');

	t.end();
});
