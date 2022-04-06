import { BufferAttribute, BufferGeometry, Line, LineLoop, LineSegments, Material, Mesh, MeshStandardMaterial, Points, SkinnedMesh } from 'three';
import { Accessor as AccessorDef, GLTF, Material as MaterialDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';
import { RefMapObserver, RefObserver } from '../observers';
import { MeshLike } from '../constants';
import { MaterialParams, MaterialPool, ValuePool } from '../pools';

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

/** @internal */
export class PrimitiveSubject extends Subject<PrimitiveDef, MeshLike> {
	protected material = new RefObserver<MaterialDef, Material, MaterialParams>('material', this._context)
		.setParamsFn(() => MaterialPool.createParams(this.def));
	protected indices = new RefObserver<AccessorDef, BufferAttribute>('indices', this._context);
	protected attributes = new RefMapObserver<AccessorDef, BufferAttribute>('attributes', this._context);

	constructor(context: UpdateContext, def: PrimitiveDef) {
		super(
			context,
			def,
			PrimitiveSubject.createValue(def, new BufferGeometry(), DEFAULT_MATERIAL, context.primitivePool),
			context.primitivePool,
		);

		this.material.subscribe((material) => {
			if (this.value.material !== material) {
				this.value.material = material!;
				this.publishAll();
			}
		});
		this.indices.subscribe((index) => {
			if (this.value.geometry.index !== index) {
				this.value.geometry.setIndex(index);
				this.publishAll();
			}
		});
		this.attributes.subscribe((nextAttributes, prevAttributes) => {
			for (const key in prevAttributes) {
				this.value.geometry.deleteAttribute(semanticToAttributeName(key));
			}
			for (const key in nextAttributes) {
				this.value.geometry.setAttribute(semanticToAttributeName(key), nextAttributes[key]);
			}
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		let value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		// Order is important here:
		//  (1) Attributes must update before material params.
		//  (2) Material params must update before material.
		//  (3) Mode can safely come last, but that's non-obvious.

		this.indices.update(def.getIndices());
		this.attributes.update(def.listSemantics(), def.listAttributes());
		this.material.update(def.getMaterial());

		if (def.getMode() !== getObject3DMode(value)) {
			this.pool.releaseBase(value);
			this.value = value = PrimitiveSubject.createValue(def, value.geometry, value.material, this.pool);
			this.material.invalidate();
		}
	}

	private static createValue(def: PrimitiveDef, geometry: BufferGeometry, material: Material, pool: ValuePool<MeshLike>): MeshLike {
		switch (def.getMode()) {
			case PrimitiveDef.Mode.TRIANGLES:
			case PrimitiveDef.Mode.TRIANGLE_FAN:
			case PrimitiveDef.Mode.TRIANGLE_STRIP:
				// TODO(feat): Support SkinnedMesh.
				// TODO(feat): Support triangle fan and triangle strip.
				return pool.requestBase(new Mesh(geometry, material));
			case PrimitiveDef.Mode.LINES:
				return pool.requestBase(new LineSegments(geometry, material));
			case PrimitiveDef.Mode.LINE_LOOP:
				return pool.requestBase(new LineLoop(geometry, material));
			case PrimitiveDef.Mode.LINE_STRIP:
				return pool.requestBase(new Line(geometry, material));
			case PrimitiveDef.Mode.POINTS:
				return pool.requestBase(new Points(geometry, material));
			default:
				throw new Error(`Unexpected primitive mode: ${def.getMode()}`);
		}
	}

	dispose() {
		this.value.geometry.dispose();
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