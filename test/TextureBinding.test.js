import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';

test('TextureBinding', t => {
	const document = new Document();
	const textureDef = document.createTexture()
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtension({textureExtras: true});
	const renderer = new GLTFRenderer(document);
	const texture = renderer.render(textureDef);
	t.ok(texture, 'texture');
	t.notOk(texture.flipY, 'texture → flipY');
	t.end();
});
