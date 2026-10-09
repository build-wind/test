const camDiv = document.getElementById("cam-div");
const camArea = document.getElementById("camera");
const startWrapper = document.getElementById("btn-start-wrapper");

const camSwitch = document.getElementById('btn-switch-camera');

const capturedImgModal = document.getElementById("captured-img-modal");
const closeModalBtn = document.getElementById("close-img-modal");
const capturedImgArea = document.getElementById("captured-img-area");

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

// const videoEl = document.getElementById("camera-video");

let myData = "";

let state = {
	videoEl: null,
	mediaStream: null,
	facingMode: 'environment',
};

let camSwitchStatus = false;

function generateVideoEl() {
	camDiv.innerHTML = "";
	state.videoEl = null;
	// logData(`videoEl level 2: ${ state.videoEl ? 'true' : 'false' }`);

	const videoEl = document.createElement("video");

	videoEl.setAttribute("id", "camera-video");
	videoEl.setAttribute("autoplay", "true");
	videoEl.setAttribute("playsinline", "true");
	videoEl.setAttribute("muted", "true");
	videoEl.className = "position-absolute top-0 start-0 w-100 h-100 object-fit-contain";

	videoEl.setAttribute("height", "200px");
	videoEl.setAttribute("width", "200px");

	camDiv.appendChild(videoEl);

	state.videoEl = videoEl;
	return true;
}

// Pause video tracks
function pauseStream() {
	if (state.mediaStream) {
		state.mediaStream.getVideoTracks().forEach(track => {
			track.enabled = false;
		});
	}
}

// Resume video tracks
function resumeStream() {
	if (state.mediaStream) {
		state.mediaStream.getVideoTracks().forEach(track => {
			track.enabled = true;
		});
	}
}

// Toggle helper
function togglePauseResume() {
	if (state.mediaStream) {
		state.mediaStream.getVideoTracks().forEach(track => {
			track.enabled = !track.enabled;
		});
	}
}

function getActiveCameraDetails() {
	if (!state.mediaStream) {
		console.warn("No active media stream found.");
		return null;
	}

	// Get the active video track from the stream
	const track = state.mediaStream.getVideoTracks()[0];
	if (!track) return null;

	// Actual runtime settings applied by the device/browser
	const settings = track.getSettings();

	// Hardware capabilities supported by this camera (where supported)
	const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};

	return {
		label: track.label || "Unknown Camera", // e.g., "Integrated Camera (04f2:b604)"
		deviceId: settings.deviceId,           // Unique hardware ID
		facingMode: settings.facingMode,       // "user" or "environment" (if available)
		width: settings.width,                 // Actual resolution width (e.g., 1920)
		height: settings.height,               // Actual resolution height (e.g., 1080)
		frameRate: settings.frameRate,         // Actual frames per second (e.g., 30)
		aspectRatio: settings.aspectRatio,     // Aspect ratio (e.g., 1.7777777777777777)
		rawSettings: settings,
		rawCapabilities: capabilities
	};
}

function removeAllTracks() {
	if (state.mediaStream) {
		state.mediaStream.getTracks().forEach(track => track.stop());
	}
	return true;
}

// 1. Camera Initialization
async function startCamera() {
	// if (btn) startWrapper.classList.add("d-none");
	console.log("start cam");

	logData(`videoEl level 1: ${ state.videoEl ? 'true' : 'false' }`);

	generateVideoEl();

	if (state.videoEl) {
		camArea.classList.remove("d-none");
		camArea.classList.add("d-flex");

		const trackStatus = removeAllTracks();
		if (!trackStatus) return;

		try {
			const constraints = {
				audio: false,
				video: {
					facingMode: { ideal: state.facingMode },
					width: { ideal: 3840, max: 4096 },
					height: { ideal: 2160, max: 4096 }
				}
			};

			if (state.facingMode == 'environment') {
				constraints.video.facingMode = { ideal: state.facingMode };
			}
			else if (state.facingMode == 'user') {
				constraints.video.facingMode = { exact: state.facingMode };
			}

			state.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
			state.videoEl.srcObject = state.mediaStream;
			await state.videoEl.play();

			const devices = await navigator.mediaDevices.enumerateDevices();
			const cameras = devices.filter(device => device.kind === 'videoinput');

			myData = "";

			cameras.forEach((camera, index) => {
				// const camStatus = `[${index}] Label: ${camera.label || 'Unknown Camera'} | ID: ${camera.deviceId}`;
				// logData(camStatus);
				if (parseInt(index) > 0 && !camSwitchStatus) {
					startCameSwitch();
				}

				logData(`type: ${typeof(camera)}`);
				medObj = camera.toJSON();

				logData("------");

				logData(`Index is: ${index}`);
				for (const [key, value] of Object.entries(medObj)) {
					myData = myData + "------";
					logData(`${key}: ${value}`);
					myData = myData + " " + `${key}: ${value}`;
					myData = myData + "------";
				}
				logData("------");

			});
			// alert(myData);
			const camData = getActiveCameraDetails();
			let currentData = "";
			for (const [key, value] of Object.entries(camData)) {
				currentData = currentData + "---<start>---";
				currentData = currentData + `${key}: ${value}`;
				currentData = currentData + "---<end>---";
			}
			// alert(currentData);
		}
		catch (err) {
			// console.warn("High-res camera constraints failed, falling back to standard video", err);
			logData(`High-res camera constraints failed, falling back to standard video: ${err}`);

			try {
				// FIX: Preserve state.facingMode in fallback constraints
				state.mediaStream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: { ideal: state.facingMode } },
				});
				state.videoEl.srcObject = state.mediaStream;
				await state.videoEl.play();
			}
			catch (e) {
				// alert("Unable to access camera stream. Please check camera permissions.");
				logData(`Unable to access camera stream. Please check camera permissions`);
				return;
			}
		}
	}
}

// Switch facing camera
function startCameSwitch() {
	camSwitchStatus = true;
	camSwitch.classList.remove("d-none")
	camSwitch.addEventListener('click', () => {
		state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
		logData(`Current facing mode: ${state.facingMode}`);
		startCamera(); // Safety check in startCamera handles missing parameter
	});
	logData("cam switch initiated....")
}

const myImgPDF = {};
let pageNo = 1;
let tempPagImg = "";

const saveImg = document.getElementById("save-img");
const deleteImg = document.getElementById("delete-img");

saveImg.addEventListener("click", () => {
	myImgPDF[`page-${pageNo}`] = tempPagImg;
	pageNo = pageNo + 1;
	closeModalBtn.click();
	resumeStream();
});

deleteImg.addEventListener("click", () => {
	tempPagImg = "";
	closeModalBtn.click();
	resumeStream();
})

// Capture Full Resolution Snapshot
document.getElementById('btn-capture').addEventListener('click', () => {
	if (!state.videoEl.videoWidth) return;

	const canvas = document.createElement('canvas');
	canvas.width = state.videoEl.videoWidth;
	canvas.height = state.videoEl.videoHeight;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(state.videoEl, 0, 0);

	// const a = document.createElement('a');
	// a.style.display = 'none';
	// a.href = canvas.toDataURL('image/jpeg', 0.95);
	// a.download = 'image.jpg';
 //
	// document.body.appendChild(a);
	// a.click();
	// document.body.removeChild(a);
	tempPagImg = canvas.toDataURL('image/jpeg', 0.95);

	const img = document.createElement("img");
	img.src = tempPagImg;
	img.className = "mw-100 mh-100 object-fit-contain";

	capturedImgArea.appendChild(img);
	pauseStream();
	capturedImgModal.click();
});

const logger = document.getElementById("logger");
const initLog = document.getElementById("init");

function logData(msg) {
	const p = document.createElement("p");
	p.textContent = msg;
	logger.prepend(p);

	console.log(msg);
}

const camStartBtn = document.getElementById("cam-start-btn");

camStartBtn.addEventListener("click", async () => {
	console.log("cam start click");
	await startCamera();
})

alert("Hi");
