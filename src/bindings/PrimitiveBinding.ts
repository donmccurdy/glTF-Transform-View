import { BufferAttribute, BufferGeometry, Line, LineLoop, LineSegments, Material, Mesh, MeshStandardMaterial, Points, SkinnedMesh } from 'three';
import { Accessor as AccessorDef, GLTF, Material as MaterialDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';
import type { MaterialBinding } from './MaterialBinding';
import { MapObserver, Observer } from '../observers';
import type { AccessorBinding } from './AccessorBinding';
import { MaterialMap } from '../maps';
import { MeshLike } from '../utils';

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

export class PrimitiveBinding extends Binding<PrimitiveDef, MeshLike> {
	protected material = new Observer<MaterialDef, MaterialBinding, Material>('material', this._context);
	protected indices = new Observer<AccessorDef, AccessorBinding, BufferAttribute>('indices', this._context);
	protected attributes = new MapObserver<AccessorDef, AccessorBinding, BufferAttribute>('attributes', this._context);

	public constructor(context: UpdateContext, def: PrimitiveDef) {
		super(
			context,
			def,
			PrimitiveBinding.createValue(def, pool.request(new BufferGeometry()), DEFAULT_MATERIAL),
		);

		this.material.subscribe((material) => {
			this.value.material = material!;
			this.publishAll();
		});
		this.indices.subscribe((indices) => {
			this.value.geometry.setIndex(indices);
			this.publishAll();
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

	public update(): this {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		// Order is important here:
		//  (1) Attributes must update before material params.
		//  (2) Material params must update before material.
		//  (3) Mode can safely come last, but that's non-obvious.

		this.indices.updateSource(def.getIndices());
		this.attributes.updateSourceMap(def.listSemantics(), def.listAttributes());
		this.material.updateSource(def.getMaterial());

		if (def.getMode() !== getObject3DMode(value)) {
			const materialParams = MaterialMap.createParams(def) as unknown as Record<string, unknown>;
			this.material.updateParams(materialParams);
		}

		return this.publishAll(); // TODO(perf)
	}

	private static createValue(source: PrimitiveDef, geometry: BufferGeometry, material: Material): MeshLike {
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

	public disposeValue(_target: MeshLike): void {
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