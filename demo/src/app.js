import * as Magick from './wasm-imagemagick.esm-es2018.js'

function setup () {
	var canvas = document.querySelector('canvas')
	var context = canvas.getContext('2d')
	var video = document.querySelector('video')
	return {
		video,
		context
	}
}
function triggerPhotoTake (media) {
	media.context.drawImage(media.video, 0, 0, 620, 480)
	document.querySelector('canvas').setAttribute('style', 'display: block')
	canvasToUInt8(media)
}

async function getMedia () {
	let stream = null
	try {
		stream = await navigator.mediaDevices.getUserMedia({
			video: true
		})
		// Grab elements, create settings, etc.
		var video = document.querySelector('video')
		// video.src = window.URL.createObjectURL(stream)
		video.srcObject = stream
		video.play()
	} catch (err) {
		console.log(err)
	}
}

async function canvasToUInt8 (media) {
	return document.querySelector('canvas').toBlob(async function (blob) {
		window.webcamUInt8 = new Uint8Array(await new Response(blob).arrayBuffer())
		console.log(window.webcamUInt8)
	}, 'image/png')
}

async function loadImg (imgPath) {
	let fetchedSourceImage = await fetch(imgPath)
	let arrayBuffer = await fetchedSourceImage.arrayBuffer()
	return new Uint8Array(arrayBuffer)
}

function determineManipulationArray (manipulationType) {
	let manipulationArray = ['-resize', '620x480>']
	let effect = []
	switch (manipulationType) {
	case 'rotate-right':
		effect = ['-rotate', '90']
		break
	case 'rotate-left':
		effect = ['-rotate', '-90']
		break
	case 'grayscale':
		effect = ['-set', 'colorspace', 'LinearGray']
		break
	case 'add-contrast':
		effect = [ '+contrast' ]
		break
	case 'remove-contrast':
		effect = ['-contrast']
		break
	case 'blur':
		effect = ['-blur', '0x4']
		break
	}
	return manipulationArray.concat(effect)
}

async function manipulateImg (sourceBytes, manipulationArray) {
	console.log(manipulationArray)
	let processedFiles = await Magick.Call([{
		'name': 'srcFile.png',
		'content': sourceBytes
	}], ['convert', 'srcFile.png'].concat(manipulationArray).concat(['out.png']))
	return processedFiles[0]
}

function outputMagickedImg (outputImg) {
	document.querySelector('#post-magicked').src = URL.createObjectURL(outputImg['blob'])
}

async function startManipulation (event) {
	let ready = false
	let sourceBytes
	if (document.querySelector('#pre-magicked').src && document.querySelector('select').value !== 'webcam') {
		console.log('image')
		ready = true
		sourceBytes = await loadImg(document.querySelector('#pre-magicked').src)
	} else if (document.querySelector('select').value === 'webcam') {
		console.log('webcam')
		ready = true
		sourceBytes = window.webcamUInt8
	}
	if(ready) {
		console.log('type1', event.target.value)
		let manipulationMatrix = determineManipulationArray(event.target.value)
		let outputImg = await manipulateImg(sourceBytes, manipulationMatrix)
		outputMagickedImg(outputImg)
	}
}

(function () {
	getMedia()
	let media = setup()
	document.querySelector('select').addEventListener('change', (event) => {
		if (event.target.value === 'webcam') {
			document.querySelector('#pre-magicked').setAttribute('style', 'display: none')
			document.querySelector('canvas').setAttribute('style', 'display: block')
			triggerPhotoTake(media)
		} else {
			document.querySelector('canvas').setAttribute('style', 'display: none')
			document.querySelector('#pre-magicked').setAttribute('style', 'display: block')
			let imgPath = `./img/${event.target.value}.jpg`
			document.querySelector('#pre-magicked').src = imgPath
		}
	})
	let buttons = document.querySelectorAll('button')
	buttons.forEach((button) => {
		button.addEventListener('click', startManipulation)
	})
})()
