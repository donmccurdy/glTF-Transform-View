import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl';
import { Subject } from './Subject';
import { NULL_TEXTURE } from '../ImageProvider';

/** @internal */
export class TextureSubject extends Subject<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;

	constructor(documentView: DocumentViewImpl, def: TextureDef) {
		super(documentView, def, NULL_TEXTURE, documentView.texturePool);
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		const image = def.getImage() as ArrayBuffer;
		if (image !== this._image) {
			this._image = image;
			if (this.value !== NULL_TEXTURE) {
				this.pool.releaseBase(this.value);
			}
			this.value = this.pool.requestBase(this._documentView.imageProvider.get(def));
		}
	}

	dispose() {
		super.dispose();
	}
}
