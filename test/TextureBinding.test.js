import test from 'tape';
import { Document } from '@gltf-transform/core';
import { GLTFRenderer } from '../dist/render.modern.js';

test('TextureBinding', t => {
	const document = new Document();
	const textureDef = document.createTexture()
		.setImage(new Uint8Array(0))
		.setMimeType('image/png');
	const renderer = new GLTFRenderer(document);
	const textures = renderer.findTargets(textureDef);
	t.equals(textures.length, 1, 'renders texture');
	t.end();
});
