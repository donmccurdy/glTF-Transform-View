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
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		const image = def.getImage() as ArrayBuffer;
		if (image !== this._image) {
			this._image = image;
			// TODO(cleanup): Consolidate?
			this.disposeValue(this.value);
			this.value = pool.request(this._context.imageProvider.get(def));
		}

		return this.publishAll(); // TODO(perf)
	}

	public disposeValue(target: Texture): void {
		pool.release(target);
	}

	public dispose() {
		super.dispose();
	}
}
