import { BufferAttribute, BufferGeometry, Material, Mesh, MeshStandardMaterial } from 'three';
import { Accessor as AccessorDef, Material as MaterialDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyMapObserver, PropertyObserver } from '../observers';
import { Binding } from './Binding';

// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
const DEFAULT_MATERIAL = new MeshStandardMaterial({color: 0xFFFFFF, roughness: 1.0, metalness: 1.0});

function semanticToAttributeName(semantic: string): string {
	switch (semantic) {
		case 'POSITION': return 'position';
		case 'NORMAL': return 'normal';
		case 'TANGENT': return 'tangent';
		case 'COLOR_0': return 'color';
		case 'JOINTS_0': return 'skinIndex';
		case 'WEIGHTS_0': return 'skinWeight';
		case 'TEXCOORD_0': return 'uv';
		case 'TEXCOORD_1': return 'uv2';
		default: return '_' + semantic.toLowerCase();
	}
}

export class PrimitiveBinding extends Binding<PrimitiveDef, Mesh> {
	protected material = new PropertyObserver<MaterialDef, Material>(this._context);
	protected indices = new PropertyObserver<AccessorDef, BufferAttribute>(this._context);
	protected attributes = new PropertyMapObserver<AccessorDef, BufferAttribute>(this._context);

	public constructor(context: UpdateContext, source: PrimitiveDef) {
		super(context, source, new Mesh(new BufferGeometry(), DEFAULT_MATERIAL));

		this.material.subscribe((material) => (this.value.material = material || DEFAULT_MATERIAL));
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

		this.material.update(source.getMaterial());
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
