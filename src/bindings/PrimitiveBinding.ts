import { BufferAttribute, BufferGeometry, Line, LineLoop, LineSegments, Material, Mesh, MeshStandardMaterial, Points, SkinnedMesh } from 'three';
import { Accessor as AccessorDef, GLTF, Material as MaterialDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { RefMapObserver, RefObserver } from '../observers';
import { Binding } from './Binding';
import { MaterialMap, VariantMaterial } from '../maps';
import { pool } from '../ObjectPool';

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

type MeshLike = Mesh | SkinnedMesh | Points | Line | LineSegments | LineLoop;

export class PrimitiveBinding extends Binding<PrimitiveDef, MeshLike> {
	protected material = new RefObserver<MaterialDef, VariantMaterial>('material', this._context)
		.map(this._context.materialMap, () => MaterialMap.createParams(this.source));
	protected indices = new RefObserver<AccessorDef, BufferAttribute>('indices', this._context);
	protected attributes = new RefMapObserver<AccessorDef, BufferAttribute>('attributes', this._context);

	public constructor(context: UpdateContext, source: PrimitiveDef) {
		super(
			context,
			source,
			PrimitiveBinding.createTarget(source, pool.request(new BufferGeometry()), DEFAULT_MATERIAL),
		);

		this.material.subscribe((material) => {
			console.log('prim::material::subscribe::event');
			(this.value.material = material as Material);
		});
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

		// Order is important here:
		//  (1) Attributes must update before material params.
		//  (2) Material params must update before material.
		//  (3) Mode can safely come last, but that's non-obvious.

		this.indices.update(source.getIndices());
		this.attributes.update(source.listSemantics(), source.listAttributes());
		this.material.update(source.getMaterial());

		if (source.getMode() !== getObject3DMode(target)) {
			// TODO(bug): If mode changes, material subscription needs to flush...
			this.material.notify(); // ... surely the RefObserver could handle this?
			this.next(PrimitiveBinding.createTarget(source, target.geometry, target.material as Material));
			console.log('mode has changed!');
			this.material.notify(); // ... surely the RefObserver could handle this?
			this.disposeTarget(target);
		}

		return this;
	}

	private static createTarget(source: PrimitiveDef, geometry: BufferGeometry, material: Material): MeshLike {
		switch (source.getMode()) {
			case PrimitiveDef.Mode.TRIANGLES:
			case PrimitiveDef.Mode.TRIANGLE_FAN:
			case PrimitiveDef.Mode.TRIANGLE_STRIP:
				// TODO(feat): Support SkinnedMesh.
				// TODO(feat): Support triangle fan and triangle strip.
				return pool.request(new Mesh(geometry, material));
			case PrimitiveDef.Mode.LINES:
				return pool.request(new LineSegments(geometry, material));
			case PrimitiveDef.Mode.LINE_LOOP:
				return pool.request(new LineLoop(geometry, material));
			case PrimitiveDef.Mode.LINE_STRIP:
				return pool.request(new Line(geometry, material));
			case PrimitiveDef.Mode.POINTS:
				return pool.request(new Points(geometry, material));
			default:
				throw new Error(`Unexpected primitive mode: ${source.getMode()}`);
		}
	}

	public disposeTarget(_target: MeshLike): void {
		pool.release(_target);
		// geometry and material are reused.
	}

	public dispose() {
		if (this.value) {
			pool.release(this.value.geometry).dispose();
		}
		this.material.dispose();
		this.indices.dispose();
		this.attributes.dispose();
		super.dispose();
	}
}

/** Returns equivalent GL mode enum for the given THREE.Object3D type. */
function getObject3DMode(mesh: MeshLike): GLTF.MeshPrimitiveMode {
	switch (mesh.type) {
		case 'Mesh':
		case 'SkinnedMesh':
			// TODO(feat): Support triangle fan and triangle strip.
			return PrimitiveDef.Mode.TRIANGLES;
		case 'LineSegments':
			return PrimitiveDef.Mode.LINES;
		case 'LineLoop':
			return PrimitiveDef.Mode.LINE_LOOP;
		case 'Line':
			return PrimitiveDef.Mode.LINE_STRIP;
		case 'Points':
			return PrimitiveDef.Mode.POINTS;
		default:
			throw new Error(`Unexpected type: ${mesh.type}`);
	}
}