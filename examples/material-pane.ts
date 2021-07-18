import { Document, Material } from '@gltf-transform/core';
import { MaterialsClearcoat, MaterialsIOR, MaterialsSheen, MaterialsSpecular, MaterialsTransmission, MaterialsVolume } from '@gltf-transform/extensions';
import Tweakpane from 'tweakpane';

export function createMaterialPane(document: Document, material: Material): Tweakpane {
	const pane = new (Tweakpane['Pane'] as any)({title: 'Material'}) as Tweakpane;

	const clearcoatExtension = document.createExtension(MaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat();
	const iorExtension = document.createExtension(MaterialsIOR);
	const ior = iorExtension.createIOR();
	const sheenExtension = document.createExtension(MaterialsSheen);
	const sheen = sheenExtension.createSheen();
	const specularExtension = document.createExtension(MaterialsSpecular);
	const specular = specularExtension.createSpecular();
	const transmissionExtension = document.createExtension(MaterialsTransmission);
	const transmission = transmissionExtension.createTransmission();
	const volumeExtension = document.createExtension(MaterialsVolume);
	const volume = volumeExtension.createVolume();

	const params = {
		// Core.
		baseColorFactor: material.getBaseColorHex(),
		alpha: material.getAlpha(),
		alphaMode: material.getAlphaMode(),
		emissiveFactor: material.getEmissiveHex(),
		roughnessFactor: material.getRoughnessFactor(),
		metallicFactor: material.getMetallicFactor(),

		// Clearcoat.
		clearcoatEnabled: !!material.getExtension('KHR_materials_clearcoat'),
		clearcoatFactor: clearcoat.getClearcoatFactor(),
		clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor(),

		// IOR.
		iorEnabled: !!material.getExtension('KHR_materials_ior'),
		ior: ior.getIOR(),

		// Sheen.
		sheenEnabled: !!material.getExtension('KHR_materials_sheen'),
		sheenColorFactor: sheen.getSheenColorHex(),
		sheenRoughnessFactor: sheen.getSheenRoughnessFactor(),

		// Specular.
		specularEnabled: !!material.getExtension('KHR_materials_specular'),
		specularFactor: specular.getSpecularFactor(),
		specularColorFactor: specular.getSpecularColorHex(),

		// Transmission.
		transmissionEnabled: !!material.getExtension('KHR_materials_transmission'),
		transmissionFactor: transmission.getTransmissionFactor(),

		// Volume.
		volumeEnabled: !!material.getExtension('KHR_materials_volume'),
		thicknessFactor: volume.getThicknessFactor(),
		attenuationColorFactor: volume.getAttenuationColorHex(),
		attenuationDistance: volume.getAttenuationDistance(),
	};
	console.log(params);

	let needsUpdate = false;
	pane.on('change', () => (needsUpdate = true));

	const coreFolder = pane.addFolder({title: 'Core'});
	coreFolder.addInput(params, 'baseColorFactor', {view: 'color'});
	coreFolder.addInput(params, 'alpha', {min: 0, max: 1});
	coreFolder.addInput(params, 'alphaMode', {options: {OPAQUE: 'OPAQUE', BLEND: 'BLEND', MASK: 'MASK'}});
	coreFolder.addInput(params, 'emissiveFactor', {view: 'color'});
	coreFolder.addInput(params, 'roughnessFactor', {min: 0, max: 1});
	coreFolder.addInput(params, 'metallicFactor', {min: 0, max: 1});
	coreFolder.on('change', () => {
		material
			.setBaseColorHex(params.baseColorFactor)
			.setAlpha(params.alpha)
			.setAlphaMode(params.alphaMode)
			.setEmissiveHex(params.emissiveFactor)
			.setRoughnessFactor(params.roughnessFactor)
			.setMetallicFactor(params.metallicFactor);
	});

	const clearcoatFolder = pane.addFolder({title: 'Clearcoat', expanded: false});
	clearcoatFolder.addInput(params, 'clearcoatEnabled');
	clearcoatFolder.addInput(params, 'clearcoatFactor', {min: 0, max: 1});
	clearcoatFolder.addInput(params, 'clearcoatRoughnessFactor', {min: 0, max: 1});
	clearcoatFolder.on('change', () => {
		material.setExtension('KHR_materials_clearcoat', params.clearcoatEnabled ? clearcoat : null);
		clearcoat
			.setClearcoatFactor(params.clearcoatFactor)
			.setClearcoatRoughnessFactor(params.clearcoatRoughnessFactor);
	});

	const iorFolder = pane.addFolder({title: 'IOR', expanded: false});
	iorFolder.addInput(params, 'iorEnabled');
	iorFolder.addInput(params, 'ior', {min: 0, max: 1});
	iorFolder.on('change', () => {
		material.setExtension('KHR_materials_ior', params.iorEnabled ? ior : null);
		ior.setIOR(params.ior);
	});

	const sheenFolder = pane.addFolder({title: 'Sheen', expanded: false});
	sheenFolder.addInput(params, 'sheenEnabled');
	sheenFolder.addInput(params, 'sheenColorFactor', {view: 'color'});
	sheenFolder.addInput(params, 'sheenRoughnessFactor', {min: 0, max: 1});
	sheenFolder.on('change', () => {
		material.setExtension('KHR_materials_sheen', params.sheenEnabled ? sheen : null);
		sheen
			.setSheenColorHex(params.sheenColorFactor)
			.setSheenRoughnessFactor(params.sheenRoughnessFactor);
	});

	const specularFolder = pane.addFolder({title: 'Specular', expanded: false});
	specularFolder.addInput(params, 'specularEnabled');
	specularFolder.addInput(params, 'specularFactor', {min: 0, max: 1});
	specularFolder.addInput(params, 'specularColorFactor', {view: 'color'});
	specularFolder.on('change', () => {
		material.setExtension('KHR_materials_specular', params.specularEnabled ? specular : null);
		specular
			.setSpecularFactor(params.specularFactor)
			.setSpecularColorHex(params.specularColorFactor);
	});

	const transmissionFolder = pane.addFolder({title: 'Transmission', expanded: false});
	transmissionFolder.addInput(params, 'transmissionEnabled');
	transmissionFolder.addInput(params, 'transmissionFactor', {min: 0, max: 1});
	transmissionFolder.on('change', () => {
		material.setExtension('KHR_materials_transmission', params.transmissionEnabled ? transmission : null);
		transmission.setTransmissionFactor(params.transmissionFactor);
	});

	const volumeFolder = pane.addFolder({title: 'Volume', expanded: false});
	volumeFolder.addInput(params, 'volumeEnabled');
	volumeFolder.addInput(params, 'thicknessFactor', {min: 0, max: 1});
	volumeFolder.addInput(params, 'attenuationColorFactor', {view: 'color'});
	volumeFolder.addInput(params, 'attenuationDistance', {min: 0, max: 1000});
	volumeFolder.on('change', () => {
		material.setExtension('KHR_materials_volume', params.volumeEnabled ? volume : null);
		volume
			.setThicknessFactor(params.thicknessFactor)
			.setAttenuationColorHex(params.attenuationColorFactor)
			.setAttenuationDistance(params.attenuationDistance);
	});

	return pane;
}
