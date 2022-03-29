import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';

test('TextureBinding', t => {
	const document = new Document();
	const textureDef = document.createTexture()
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtension({textureExtras: true});
	const documentView = new DocumentView(document);
	const texture = documentView.view(textureDef);
	t.ok(texture, 'texture');
	t.notOk(texture.flipY, 'texture → flipY');
	t.end();
});
