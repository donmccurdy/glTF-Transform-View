import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { NULL_TEXTURE } from '../ImageProvider';

export class TextureBinding extends Binding<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;

	public constructor(context: UpdateContext, source: TextureDef) {
		super(context, source, context.texturePool.requestBase(NULL_TEXTURE), context.texturePool);
	}

	public update(): this {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		const image = def.getImage() as ArrayBuffer;
		if (image !== this._image) {
			this._image = image;
			// TODO(cleanup): Consolidate?
			this.pool.releaseBase(this.value);
			this.value = this.pool.requestBase(this._context.imageProvider.get(def));
		}

		return this.publishAll(); // TODO(perf)
	}

	public dispose() {
		super.dispose();
	}
}
