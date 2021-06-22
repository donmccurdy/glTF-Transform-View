import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';

export class TextureBinding extends Binding<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;
	private _imageEl: HTMLImageElement | null = null;
	private _imageURL = '';

	public constructor(context: UpdateContext, source: TextureDef) {
		super(context, source, new Texture());
		this.value.flipY = false;
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		// TODO(bug): "THREE.WebGLRenderer: Texture marked for update but image is incomplete"
		// TODO(bug): ^x18 (!)
		if (source.getImage() !== this._image) {
			this._image = source.getImage() as ArrayBuffer;
			const blob = new Blob([this._image], {type: source.getMimeType()});
			this._imageURL = URL.createObjectURL(blob);
			this._imageEl = document.createElement('img');
			this._imageEl.src = this._imageURL;
			target.image = this._imageEl;
			target.needsUpdate = true;
		}

		return this;
	}

	public disposeTarget(target: Texture): void {
		target.dispose();
	}

	public dispose() {
		super.dispose();
	}
}