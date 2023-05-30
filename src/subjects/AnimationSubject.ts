import { AnimationClip, KeyframeTrack } from 'three';
import { Animation as AnimationDef, AnimationChannel as AnimationChannelDef } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl';
import { Subject } from './Subject';
import { ValuePool } from '../pools';
import { RefListObserver } from '../observers';

/** @internal */
export class AnimationSubject extends Subject<AnimationDef, AnimationClip> {
	protected channels = new RefListObserver<AnimationChannelDef, KeyframeTrack>('channels', this._documentView);

	constructor(documentView: DocumentViewImpl, def: AnimationDef) {
		super(
			documentView,
			def,
			AnimationSubject.createValue(def, documentView.animationPool),
			documentView.animationPool,
		);

		this.channels.subscribe((channels) => {
			this.value.tracks = channels;
			this.value.resetDuration();
			this.publishAll();
		});
	}

	private static createValue(def: AnimationDef, pool: ValuePool<AnimationClip>) {
		return pool.requestBase(new AnimationClip(def.getName(), 0, []));
	}

	update() {
		const def = this.def;

		this.channels.update(def.listChannels());
	}
}
