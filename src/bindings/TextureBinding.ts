import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';
import { NULL_TEXTURE } from '../ImageProvider';

export class TextureBinding extends Binding<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;

	public constructor(context: UpdateContext, source: TextureDef) {
		super(context, source, pool.request(NULL_TEXTURE));
	}

	public update(): this {
		const source = this.source;

		const image = source.getImage() as ArrayBuffer;
		if (image !== this._image) {
			this._image = image;
			this.disposeTarget(this.value);
			this.next(pool.request(this._context.imageProvider.get(source)));
		}

		return this;
	}

	public disposeTarget(target: Texture): void {
		pool.release(target);
	}

	public dispose() {
		super.dispose();
	}
}
