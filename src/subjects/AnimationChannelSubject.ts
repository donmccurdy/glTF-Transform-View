import { BufferAttribute, InterpolateDiscrete, InterpolateLinear, InterpolationModes, KeyframeTrack, NumberKeyframeTrack, Object3D, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { Accessor as AccessorDef, AnimationChannel as AnimationChannelDef, AnimationSampler as AnimationSamplerDef, GLTF, Node, TypedArray } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl';
import { Subject } from './Subject';
import { ValuePool } from '../pools';
import { RefObserver } from '../observers';
import { GLTFCubicSplineInterpolant, GLTFCubicSplineQuaternionInterpolant } from '../utils/GLTFCubicSplineInterpolant';

// TODO(impl): a channel may result in multiple keyframe tracks for multi-primitive meshes with morph targets.

const { TRANSLATION, SCALE, ROTATION, WEIGHTS } = AnimationChannelDef.TargetPath;
const { LINEAR, STEP, CUBICSPLINE } = AnimationSamplerDef.Interpolation;

/** @internal */
export class AnimationChannelSubject extends Subject<AnimationChannelDef, KeyframeTrack[]> {
	protected input = new RefObserver<AccessorDef, BufferAttribute>('samplerInput', this._documentView);
	protected output = new RefObserver<AccessorDef, BufferAttribute>('samplerOutput', this._documentView);
	protected targetNode = new RefObserver<Node, Object3D>('targetNode', this._documentView);

	constructor(documentView: DocumentViewImpl, def: AnimationChannelDef) {
		super(documentView, def, [], documentView.animationChannelPool);

		const onChange = () => {
			this.pool.releaseBase(this.value);
			this.value = AnimationChannelSubject.createValue(this.def, this.pool);
			this.publishAll();
		};

		this.input.subscribe(onChange);
		this.output.subscribe(onChange);
		this.targetNode.subscribe(onChange);
	}

	private static createValue(def: AnimationChannelDef, pool: ValuePool<KeyframeTrack[]>) {
		const sampler = def.getSampler();
		if (!sampler) return [];

		const TypedKeyframeTrack = createTrackConstructor(def);
		const values = pool.requestBase([new TypedKeyframeTrack(
			createTrackName(def),
			createTimesArray(sampler),
			createValuesArray(sampler),
			createTrackInterpolation(def) as InterpolationModes
		)]);
		if (sampler.getInterpolation() === CUBICSPLINE) {
			for (const value of values) {
				setInterpolantFactory(value);
			}
		}
		return values;
	}

	update() {
		const def = this.def;
		let value = this.value;

		const samplerDef = def.getSampler();
		if (samplerDef && inferTrackInterpolation(value) !== samplerDef.getInterpolation()) {
			this.pool.releaseBase(value);
			this.value = value = AnimationChannelSubject.createValue(def, this.pool);
		}

		const sampler = def.getSampler();
		this.input.update(sampler ? sampler.getInput() : null);
		this.output.update(sampler ? sampler.getOutput() : null);
		this.targetNode.update(def.getTargetNode());
	}

	dispose() {
		this.input.dispose();
		this.output.dispose();
		this.targetNode.dispose();
		super.dispose();
	}
}

function createTimesArray(sampler: AnimationSamplerDef | null): TypedArray | number[] {
	// TODO(cleanup): Array cannot be empty.
	if (!sampler) return [];
	const input = sampler.getInput();
	if (!input) return [];
	return input.getArray() || []; // TODO(impl): normalization
}

function createValuesArray(sampler: AnimationSamplerDef | null): TypedArray | number[] {
	// TODO(cleanup): Array cannot be empty.
	if (!sampler) return [];
	const output = sampler.getOutput();
	if (!output) return [];
	return output.getArray() || []; // TODO(impl): normalization
}

function inferTrackPath(track: KeyframeTrack): string {
	if (track.name.endsWith('.position')) {
		return TRANSLATION;
	} else if (track.name.endsWith('.scale')) {
		return SCALE;
	} else if (track.name.endsWith('.quaternion')) {
		return ROTATION;
	}  else if (track.name.endsWith('.morphTargetInfluences')) {
		return WEIGHTS;
	}
	throw new Error(`Unexpected track name, "${track.name}".`);
}

function createTrackConstructor(def: AnimationChannelDef): typeof KeyframeTrack {
	switch (def.getTargetPath()) {
		case TRANSLATION:
		case SCALE:
			return VectorKeyframeTrack;
		case ROTATION:
			return QuaternionKeyframeTrack;
		case WEIGHTS:
			return NumberKeyframeTrack;
		default:
			throw new Error(`Unexpected channel target path, "${def.getTargetPath()}".`);
	}
}

function inferTrackInterpolation(track: KeyframeTrack): GLTF.AnimationSamplerInterpolation {
	switch (track.getInterpolation()) {
		case InterpolateLinear:
			return LINEAR;
		case InterpolateDiscrete:
			return STEP;
		case null:
		case undefined:
			return CUBICSPLINE;
		default:
			throw new Error(`Unexpected interpolant, "${track.getInterpolation()}".`);
	}
}

function createTrackInterpolation(def: AnimationChannelDef): InterpolationModes | null {
	const sampler = def.getSampler();
	if (!sampler) return InterpolateLinear;

	switch (sampler.getInterpolation()) {
		case LINEAR:
			return InterpolateLinear;
		case STEP:
			return InterpolateDiscrete;
		case CUBICSPLINE:
			return null;
		default:
			throw new Error(`Unexpected interpolant, "${sampler.getInterpolation()}".`);
	}
}

function createTrackName(def: AnimationChannelDef): string {
	// TODO(bug): Resolve name of mesh primitive(s), not node, for weights.
	let name = def.getTargetNode()!.getName();

	switch (def.getTargetPath()!) {
		case TRANSLATION:
			name += '.position';
			break;
		case SCALE:
			name += '.scale';
			break;
		case ROTATION:
			name += '.quaternion';
			break;
		case WEIGHTS:
			name += '.morphTargetInfluences';
			break;
		default:
			throw new Error(`Unexpected target path, "${def.getTargetPath()!}".`);
	}
	return name;
}

function setInterpolantFactory(track: KeyframeTrack) {
	track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline(this: any,  result: number[] ) {

		const self = (this as any) as KeyframeTrack;

		const interpolantType = ( this instanceof QuaternionKeyframeTrack )
			? GLTFCubicSplineQuaternionInterpolant
			: GLTFCubicSplineInterpolant;

		return new interpolantType( this.times, this.values, this.getValueSize() / 3, result );

	} as any;

	// Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.
	(track.createInterpolant as any).isInterpolantFactoryMethodGLTFCubicSpline = true;
}

/*********************************/
/********** INTERPOLATION ********/
/*********************************/

