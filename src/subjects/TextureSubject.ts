import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';
import { NULL_TEXTURE } from '../ImageProvider';

export class TextureSubject extends Subject<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;

	constructor(context: UpdateContext, def: TextureDef) {
		super(context, def, NULL_TEXTURE, context.texturePool);
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
			this.value = this.pool.requestBase(this._context.imageProvider.get(def));
		}
	}

	dispose() {
		super.dispose();
	}
}
