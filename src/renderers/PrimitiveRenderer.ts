import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import { Accessor as AccessorDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyMapObserver, PropertyObserver } from '../observers';
import { semanticToAttributeName } from '../utils';
import { Renderer } from './Renderer';

const DEFAULT_MATERIAL = new MeshStandardMaterial({color: 0x808080, roughness: 1.0, metalness: 0.0});

export class PrimitiveRenderer extends Renderer<PrimitiveDef, Mesh> {
	protected indices = new PropertyObserver<AccessorDef, BufferAttribute>(this._context);
	protected attributes = new PropertyMapObserver<AccessorDef, BufferAttribute>(this._context);

	public constructor(context: UpdateContext, source: PrimitiveDef) {
		super(context, source, new Mesh(new BufferGeometry(), DEFAULT_MATERIAL));

		this.indices.subscribe((indices) => this.value.geometry.setIndex(indices));
		this.attributes.subscribe(({key, value}) => {
			if (value) this.value.geometry.setAttribute(semanticToAttributeName(key), value);
			if (!value) this.value.geometry.deleteAttribute(semanticToAttributeName(key));
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.indices.update(source.getIndices());
		this.attributes.update(source.listSemantics(), source.listAttributes());

		return this;
	}

	public disposeTarget(target: Mesh): void {
		target.geometry.dispose();
	}

	public dispose() {
		this.indices.dispose();
		this.attributes.dispose();
		super.dispose();
	}
}